'use strict';

const crypto = require('crypto');

let performLater = (callback, seconds) => {
  return setTimeout(callback, seconds * 1000); // basically, we're just converting seconds to milliseconds.  heh.
}

module.exports = class {

  constructor (params) {
    // auto-assign dependencies and settings
    Object.keys(params).forEach((k) => {
      this[k] = params[k];
    });
  }
  
  clearMessages (messages) {
    // bulk deletes used messages from SQS
    return new Promise((resolve, reject) => {
      let callback = (err, data) => {
        if(err) {
          this.logger.info(err)
          // reject(err);
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

  routeMessage (message) {
    let attributes  = {};
    Object.keys(message.MessageAttributes).forEach((k) => {
      attributes[k] = message.MessageAttributes[k].StringValue;
    });
    let body        = message.Body ? message.Body : undefined;
    // let checksum   = crypto.createHash('md5').update(body.toString()).digest("hex");
    let checksum    = message.MD5OfBody;
    // ^^ we convert the JSON back to a string because the body may have
    // differences in characters that are unrelated to the actual content
    //
    // should add validation at this point
    this.logger.info(`received message ${attributes._id}`)
    return this.db.upsert(attributes._id, this._deltaFunc)
      // if a record doesn't exist, we create one
      .then(() => {
        // then we retrieve it
        return this.db.get(attributes._id);
      })
      .then((doc) => {
        // we initialize these attributes at this point because some
        // values may already exist in the document
        doc.adapters        = (attributes.adapters || "missing").split(',');
        // doc.adapters        = (attributes.adapters ? JSON.parse(attributes.adapters) : doc.adapters) || {};
        doc.sentAt          = attributes.sentAt;
        doc.receivedAt      = doc.receivedAt       || new Date();
        doc.updatedAt       = new Date();
        doc.publisher       = attributes.publisher || "unknown";
        doc.syndications    = doc.syndications     || {};
        
        // start a chain of promises
        let promise     = new Promise((resolve) => {
          return resolve();
        });

        doc.adapters.forEach((adapterName) => {
          // attempt to publish through each of
          // the adapters specified in the message
          promise = promise.then(() => {
            doc.syndications[adapterName] = doc.syndications[adapterName] || {};
            let syndication = doc.syndications[adapterName];
            let metadata    = {
              remoteId: syndication.remoteId,
              method:   attributes.method,
              revision: syndication.revision,
              checksum: checksum
            };
            // ^^ this is the minimum data pertinent to publishing an article
            let adapter     = (this.adapters[adapterName] || this.adapters['missing'])[metadata.method];
            return adapter(metadata, body)
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
                syndication.checksum = checksum;

                // clear the message now that we are done with it
                // so that it doesn't come back in the queue
                this.clearMessages([message]).then(() => {
                  this.logger.info("message cleared");
                })

                // save our record after publishing attempt
                return this.db.put(doc);
              });
          });
        });

        return promise;
      })
  }

  routeMessages (messages) {
    let promise     = new Promise((resolve) => {
      return resolve();
    });
    messages.forEach((message) => {
      promise = promise.then(() => {return this.routeMessage(message)});
    });
    return promise;
  }

  getNewMessages () {
    return new Promise((resolve, reject) => {
      // get messages from SQS if there are any
      this.sqs.receiveMessage(this.config.sqs.queues.messages, (err, data) => {
        if (err) {
          this.logger.error(err);
          reject(err);
        } else if (data) {
          resolve(data.Messages || []); // return messages or an empty array
        }
      })
    })
  }

  perform () {
    this.getNewMessages()
      // get messages from SQS
      .then((messages) => {
        // send messages to their corresponding adapters
        return this.routeMessages(messages)
          .then(() => {
            performLater(()=>{this.perform()}, this.config.sqs.message_queue_interval);
          })
      })
      .catch((err)=> {
        this.logger.info(err); // probably failed to contact/authenticate SQS
        performLater(()=>{this.perform()}, this.config.sqs.message_queue_interval);
      })
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
