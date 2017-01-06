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

      placeholders.each((i, placeholder) => {
        placeholder = $(placeholder);
        let assetId = placeholder.attr('data-asset-id');

        assetHost(assetId, secrets.assethost.readOnlyToken)
          .then((asset) => {
            placeholder.replaceWith($(template(asset)));
            if((i+1) === placeholders.length){ resolve($.html()); }
          })
          .catch(() => {
            placeholder.remove();
            if((i+1) === placeholders.length){ resolve($.html()); }
          });
      });

    } catch(err) {
      console.log(err);
      reject(err);
    }
  });
}