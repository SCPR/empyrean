'use strict';

const crypto = require('crypto');

let performLater = (callback, seconds) => {
  return setTimeout(callback, seconds * 1000); // basically, we're just converting seconds to milliseconds.  heh.
}

module.exports = class {
  // This doesn't necessarily have to be a class
  // but I'm using it as a convenient way to 
  // encapsulate behavior and dependencies.
  // 
  // In theory, you could have two instances of
  // Grand Central running concurrently(e.g each
  // using separate SQS queues with different API
  // secrets), though I don't know that we'll 
  // ever do that here at SCPR.

  constructor (params) {
    // auto-assign dependencies and settings
    Object.keys(params).forEach((k) => {
      this[k] = params[k];
    });
  }

  perform () {
    // This is the "master" function.  Call this once
    // and it will continue to call itself after polling
    // for messages.
    return this.getNewMessages()
      // get messages from SQS
      .then((messages) => {
        // send messages to their corresponding adapters
        return this.routeMessages(messages)
          .then(() => {
            performLater(()=>{ this.perform() }, this.config.sqs.message_queue_interval);
          })
      })
      .catch((err) => {
        this.logger.error(err); // probably failed to contact/authenticate SQS
        performLater(()=>{ this.perform() }, this.config.sqs.message_queue_interval);
      })
  }

  getNewMessages () {
    return new Promise((resolve, reject) => {
      // get messages from SQS if there are any
      this.sqs.receiveMessage(this.config.sqs.queues.messages, (err, data) => {
        if (err) {
          reject(err);
        } else if (data) {
          resolve(data.Messages || []); // return messages or an empty array
        }
      });
    });
  }

  routeMessages (messages) {
    // Send each message to their specified adapter.
    let promise     = Promise.resolve();
    messages.forEach((message) => {
      promise = promise.then(() => { return this.routeMessage(message); })
    });
    return promise;
  }

  routeMessage (message) {
    // Add a local reference record for the message,
    // prepare it for handoff, and pass it off to 
    // its specified adapter.

    let messageId = message.MessageAttributes._id.StringValue;

    return new Promise((resolve, reject) => {
      // check the message attributes to see if we have everything we need
      let validationResult = this.validator.validate(message, "/Message");

      if(validationResult.errors.length){
        // abort if it's malformed, as we can't trust it
        return reject(validationResult);
      }

      // we had might as well parse the body JSON here
      // as every adapter expects the same structure
      message.body = JSON.parse(message.Body);

      this.logger.info(`received message ${messageId}`);

      return this.db.upsert(messageId, this._deltaFunc)
        // if a record doesn't exist, we create one
        .then(() => {
          // then we retrieve it
          return this.db.get(messageId);
        })
        .then((doc) => {
          this.logger.info(`document upserted for ${messageId}`);
          // we initialize these attributes at this point because some
          // values may already exist in the document
          doc.receivedAt      = doc.receivedAt       || new Date();
          doc.updatedAt       = new Date();
          doc.syndications    = doc.syndications     || {};
          
          // attempt to publish through each of
          // the adapters specified in the message
          let oAdapterName = message.MessageAttributes.adapter.StringValue; // original adapter name value
          let adapterName  = this.adapters[oAdapterName] ? oAdapterName : "missing";
          // ^^ the name of the actual adapter we will be calling
          doc.syndications[oAdapterName] = doc.syndications[oAdapterName] || {};
          let syndication                = doc.syndications[oAdapterName];

          // attach some metadata to the message object
          message.remoteId = syndication.remoteId;
          message.revision = syndication.revision;
          // ^^ this is the minimum data pertinent to publishing an article
          let adapter     = this.adapters[adapterName][message.MessageAttributes.method.StringValue]; // actually just the function we want to use
          // ^^ if the adapter name doesn't match an adapter that we have, let's just fall back to the "missing" adapter.
          return adapter(message)
            .then((resp) => {
              this.logger.info(JSON.stringify(resp));
              // publish through adapter then save response to our record
              //
              // should contain similar keys to the metadata we passed
              // (at least remoteId and reivison), as well as an HTTP
              // response code and message.
              Object.keys(resp).forEach((key) => {
                syndication[key] = resp[key];
              });
              syndication.checksum = message.MD5OfBody;

              // clear the message now that we are done with it
              // so that it doesn't come back in the queue
              return this.clearMessages([message])
                .then(() => {
                  this.logger.info("message cleared");
                  // save our record after publishing attempt
                  return this.db.put(doc)
                    .then(() => { resolve(doc) });
                })
            })
        })
        .catch((err) => {
          err.message = `${messageId}:\n${err.message}` // prepend the message ID to the error message and then pass it on
          reject(err) 
        });
    })
  }

  
  clearMessages (messages) {
    // bulk deletes used messages from SQS
    return new Promise((resolve, reject) => {
      let callback = (err, data) => {
        if(err) {
          // this.logger.error(err)
          reject(err);
        } else {
          resolve(data);
        }
      }
      let entries = messages.map((m) => {
        return {Id: m.MessageId, ReceiptHandle: m.ReceiptHandle};
      });
      if(entries.length){
        this.sqs.deleteMessageBatch({QueueUrl: this.config.sqs.queues.messages.QueueUrl, Entries: entries}, callback);
      } else {
        callback(undefined, {
          Failed: [],
          Successful: []
        });
      }
    });
  }


  // private

  _deltaFunc(doc) {
    // This gets called every time we upsert a document
    // and simply increments an attempt count
    doc.attempts = doc.attempts || 0;
    doc.attempts++;
    return doc;
  }

}
