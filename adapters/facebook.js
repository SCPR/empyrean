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
  instantArticles  : require('../lib/filters/instant-articles')
}

let filter = (html) => {
  let result = filters.cleanup(html)
        .then((html) => {
          return filters.embedPlaceholders(html);
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
  return {
    post: (message) => {
      let channel = message.MessageAttributes.channel.StringValue;

      return new Promise((resolve, reject) => {
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

        filter(article.body)
          .then((body) => {

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
                    access_token: secrets.clientAccessToken,
                    html_source: html
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
