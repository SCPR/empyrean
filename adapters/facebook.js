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
  let result = filters.cleanup(html, secrets)
        .then((html) => {
          return filters.embedPlaceholders(html, secrets);
        })
        .then((html) => {
          return filters.assetHost(html, secrets);
        })
        .then((html) => {
          return filters.instantArticles(html, secrets);
        });
  return result;
}

Handlebars.registerHelper('moment', (timeString, formatString) => {
  return new Handlebars.SafeString(moment(timeString).format(formatString));
})

module.exports = (secrets) => {
  let fbSecrets = secrets.adapters.facebook;
  let adapter = {};

  adapter.post = function (message) {
      let channel = message.MessageAttributes.channel.StringValue;
      return new Promise((resolve) => {
        // validate the message body
        let validationResult = validator.validate(message.body, "/Article");
        if(validationResult.errors.length) {
          return resolve({
            code: 409,
            message: "Article validation failed.",
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
                code: 500,
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
                    html_source: html,
                    published: true
                  }
                }, (err, response, body) => {
                  if(body && JSON.parse(body).id) {
                    let referenceId = JSON.parse(body).id;
                    let checker = () => {
                      // We have to make a separate request, once we get our reference ID
                      // in order to get the final status of the content being published.
                      //
                      // A relatively-safe timeout is placed here because the status is not
                      // always instantly available.
                      request
                        .get({
                          url: `https://graph.facebook.com/${referenceId}?access_token=${fbSecrets.clientAccessToken}`
                        }, (err, response, body) => {
                          let json = JSON.parse(body);
                          if(json.status === "SUCCESS"){
                            resolve({
                              code: 201,
                              message: "Instant article successfully published.",
                              body: body,
                              remoteId: json.id
                            });
                          } else {
                            if (json.status === "IN_PROGRESS") {
                              // Check again in 3 seconds.
                              setTimeout(checker, 3000);
                            } else {
                              resolve({
                                code: 409,
                                message: "Instant article failed to publish.",
                                body: json,
                                remoteId: referenceId
                              })
                            }
                          }
                        })
                    }
                    setTimeout(checker, 10000);
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
                code: 500,
                message: "Rendering of body failed.",
                body: err
              })
            })

          })
          .catch((err) => {
            return resolve({
              code: 500,
              message: "Body filtering failed.",
              body: err
            })            
          })

      });

    }

    adapter.put = function (message) {
      // Instant Articles are updated in the same way that they are created.
      return adapter.post(message);
    }

    adapter.delete = (message) => {
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
  
  return adapter;
}


