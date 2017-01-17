'use strict';

const cheerio       = require('cheerio');
const Handlebars    = require('handlebars');
const fs            = require('fs');
const path          = require('path');
const assetHost     = require('../assethost');

let templateFile    = fs.readFileSync(path.resolve("./templates/assethost/inline-asset.hbs"), "utf-8");
let template        = Handlebars.compile(templateFile);

module.exports = (html, secrets) => {
  return new Promise((resolve, reject) => {
    try {
      let $            = cheerio.load(html);
      let placeholders = $('img.inline-asset');
      let promise      = Promise.resolve();
      placeholders.each((i, placeholder) => {
        placeholder = $(placeholder);
        let assetId = placeholder.attr('data-asset-id');
        promise = promise
          .then(()      => { return assetHost(assetId, secrets.assethost.readOnlyToken) })
          .then((asset) => {
            return new Promise((resolve) => { resolve(placeholder.replaceWith($(template(asset)))); });
          })
          .catch(()     => {
            return new Promise((resolve) => { resolve(placeholder.remove()); });
          });
      });
      promise.then(() => { resolve($.html()) });
    } catch(err) {
      reject(err);
    }
  });
}