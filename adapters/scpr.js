'use strict';

const AWS                = require('aws-sdk');
let validator            = require('../lib/schema-validator');
let filters              = {
  cleanup          : require('../lib/filters/cleanup')
}

let filter = (html) => {
  return filters.cleanup(html);
}

module.exports = (secrets) => {
  AWS.config.update(secrets);
  let sqs = new AWS.SQS({apiVersion: '2012-11-05'});
  return {
    post: (message) => {
      return new Promise((resolve, reject) => {
        message.QueueUrl = secrets.queueUrl;
        sqs.sendMessage(message, (err, data) => {
          if(err){
            return reject({
              code: 409,
              message: "Failed to send message to SCPR.",
              body: err,
              data: data
            })
          }
          resolve({
            code: 201,
            message: "Article successfully sent to SCPR.",
            body: data
          })
        });
      })
    }
  }
}