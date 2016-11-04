'use strict';

let performLater = (callback, seconds) => {
  return setTimeout(callback, seconds * 1000); // basically, we're just converting seconds to milliseconds.  heh.
}

module.exports = class {

  constructor (params) {
    // this is mostly for loading dependencies
    Object.keys(params).forEach((k) => {
      this[k] = params[k];
    })
  }
  
  clearMessages (messages) {
    // bulk deletes used messages from SQS
    return new Promise((resolve, reject) => {
      let callback = (err, data) => {
        if(err) {
          reject(err);
        } else {
          resolve(data)
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
    let attributes = message.MessageAttributes;
    let body       = message.Body ? JSON.parse(message.Body) : undefined;
    // should add validation at this point
    let deltaFunc  = function(doc) {
      doc.counter = doc.counter || 0;
      doc.counter++;
      return doc;
    }
    return this.db.upsert(attributes._id, deltaFunc)
      // if a record doesn't exist, we create one
      .then(() => {
        // then we retrieve it
        return this.db.get(attributes._id);
      })
      .then((doc) => {
        // we initialize these attributes at this point because some
        // values may already exist in the document
        doc.adapters    = (attributes.adapters ? JSON.parse(attributes.adapters) : doc.adapters) || [];
        doc.method      = attributes.method || undefined;
        doc.sentAt      = attributes.sentAt;
        doc.receivedAt  = doc.receivedAt || new Date();
        doc.updatedAt   = new Date();
        doc.publisher   = attributes.publisher || "unknown";
      
        // start a chain of promises
        let promise     = new Promise((resolve) => {
          return resolve();
        });

        doc.adapters.forEach((adapterName) => {
          // // attempt to publish through each of the specified adapters
          promise = promise.then(() => {
            return this.adapters[adapterName][doc.method](body)
              .then((resp) => {
                // publish through adapter then save response to our record
                doc.statuses              = doc.statuses || {};
                doc.statuses[adapterName] = resp;
                // save our record after publishing attempt
                return this.db.put(doc);
              })
          });
        });

        return promise;
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      });
    
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
    console.log('looking for new messages...');
    return new Promise((resolve, reject) => {
      this.sqs.receiveMessage(config.sqs.queues.messages, (err, data) => {
        if (err) {
          console.log(err);
          reject(err);
        } else if (data) {
          routeMessages(data.Messages)
            .then(() => {
              performLater(getNewMessages, config.message_queue_interval);
              resolve();
            })
            .catch((err) => {
              console.log(err);
              reject(err);
            })
        }
      })
    })
  }

}


