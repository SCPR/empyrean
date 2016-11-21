'use strict';

const fs      = require('fs');
const request = require('request');

module.exports = (secrets) => {
  return {
    post: (metadata, body) => {
      return new Promise((resolve, reject) => {
        request
          .post({
            url: 'https://graph.facebook.com/1033729520070511/instant_articles',
            form: {
              access_token: secrets.clientAccessToken,
              html_source: body
            }
          }, (err, response, body) => {
            if(body && JSON.parse(body).id) {
              resolve({
                code: 201,
                message: "Instant article successfully published.",
                body: body
              });
            } else {
              resolve({
                code: 409,
                message: "Something about the message is invalid.",
                body: body
              });
            }
          })
      });
    },
    put: (metadata, body) => {
      // Instant Articles are updated in the same way that they are created.
      this.post(metadata, body);
    },
    delete: (metadata) => {
      return new Promise((resolve, reject) => {
        request
          .delete({
            url: `https://graph.facebook.com/${metadata.id}?access_token=${secrets.clientAccessToken}`
          }, (err, response, body) => {
            resolve({
              code: 200,
              message: "Instant article successfully deleted.",
              body: body
            })
          })
      })
    }
  }

}
