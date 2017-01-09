'use strict';

const fs                 = require('fs');
const path               = require('path');
const request            = require('request');
const Handlebars         = require('handlebars');
const handlebarsLoadTree = require('handlebars-load-tree');
const moment             = require('moment');

let validator            = require('../lib/schema-validator');
let views                = handlebarsLoadTree(Handlebars, path.resolve('./templates/facebook'));
let filters              = {
  cleanup          : require('../lib/filters/cleanup'),
  embedPlaceholders: require('../lib/filters/embed-placeholders'),
  assetHost        : require('../lib/filters/assethost'),
  instantArticles  : require('../lib/filters/instant-articles')
}

let filter = (html, secrets) => {
  let result = filters.cleanup(html)
        .then((html) => {
          return filters.embedPlaceholders(html);
        })
        .then((html) => {
          return filters.assetHost(html, secrets);
        })
        .then((html) => {
          return filters.instantArticles(html);
        });
  return result;
}

Handlebars.registerHelper('moment', (timeString, formatString) => {
  return new Handlebars.SafeString(moment(timeString).format(formatString));
})

module.exports = (secrets) => {
  let fbSecrets = secrets.adapters.facebook;
  return {
    post: (message) => {
      let channel = message.MessageAttributes.channel.StringValue;
      return new Promise((resolve) => {
        // validate the message body
        let validationResult = validator.validate(message.body, "/Article");
        if(validationResult.errors.length) {
          return resolve({
            code: 409,
            message: "There is a problem with the article.",
            body: validationResult.errors
          });
        }

        let article = message.body; 

        filter(article.body, secrets)
          .then((body) => {
            article.body = body; // replace the article body with the filtered version

            let render;

            try {
              render = views.call('instant-article', article)
            } catch(err) {
              return resolve({
                code: 409,
                message: "Rendering of body failed.",
                body: err
              })
            }

            render.then((html) => {
              request
                .post({
                  url: `https://graph.facebook.com/${channel}/instant_articles`,
                  form: {
                    access_token: fbSecrets.clientAccessToken,
                    html_source: html
                  }
                }, (err, response, body) => {
                  if(body && JSON.parse(body).id) {
                    // debugger
                    resolve({
                      code: 201,
                      message: "Instant article successfully published.",
                      body: body,
                      remoteId: JSON.parse(body).id
                    });
                  } else {
                    resolve({
                      code: 409,
                      message: "Something about the message is invalid.",
                      body: body
                    });
                  }
                });
            })
            .catch((err) => {
              return resolve({
                code: 409,
                message: "Rendering of body failed.",
                body: err
              })
            })

          })
          .catch((err) => {
            return resolve({
              code: 409,
              message: "Body filtering failed.",
              body: err
            })            
          })

      });

    },
    put: (message) => {
      // Instant Articles are updated in the same way that they are created.
      this.post(message);
    },
    delete: (message) => {
      return new Promise((resolve, reject) => {
        request
          .delete({
            url: `https://graph.facebook.com/${message.remoteId}?access_token=${fbSecrets.clientAccessToken}`
          }, (err, response, body) => {
            // debugger
            // if(err || (body && !JSON.parse(body).success)) {
            //   resolve({
            //     code: 409,
            //     message: "Instant article deletion failed.",
            //     body: err
            //   })
            // }
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
