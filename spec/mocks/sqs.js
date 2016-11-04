'use strict';

// a fake stand-in for SQS
//
// just provide some messages, and it should work the same

module.exports = class {
  constructor(messages) {
    this.messages       = messages;
    this.hiddenMessages = [];
  }
  receiveMessage(queueConfig, callback) {
    let maxMessages      = queueConfig.MaxNumberOfMessages || 1;
    let receivedMessages = [];
    let i = 0;
    while((i < this.messages.length) && (i < maxMessages)) {
      let message = this.messages.shift();
      receivedMessages.push(message);
      this.hiddenMessages.push(message);
      i++;
    }
    callback(undefined, receivedMessages);
  }
  deleteMessageBatch(params, callback) {
    // currently, this won't fail deletions
    // so keep that in mind.
    let entries    = [].concat(params.Entries || []);
    let failed     = [];
    let successful = [];
    entries.forEach((entry, index) => {
      let deleter = (message, index, array) => {
        if((message.MessageId == entry.Id) && (message.ReceiptHandle == entry.ReceiptHandle)) {
          if(successful.indexOf(entry) < 0){
            successful.push(entry);
          }
          array.splice(index, 1);
        }
      }
      this.messages.forEach(deleter);
      this.hiddenMessages.forEach(deleter);
    });
    debugger
    callback(undefined, {
      Failed: failed,
      Successful: successful
    });
  }
}