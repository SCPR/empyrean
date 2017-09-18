'use strict';

const cheerio       = require('cheerio');
const PortableHoles = require('portable-holes');
const najax         = require('najax');

module.exports = (html, secrets) => {
  return new Promise((resolve, reject) => {
    try {
      let $     = cheerio.load(html);
      $.ajax    = najax;
      let holes = new PortableHoles({
        $: $,
        Embedly: {
          query: {
            key: secrets.embedly.key
          }
        }
      });

      // unwrap embed placeholders
      //
      // Embed placeholders are often wrapped in paragraph tags, which
      // is confusing because the end result is not a block element.
      // Better just to remove the paragraphs beforehand.

      $('a.embed-placeholder').each((i, placeholder) => {
        placeholder = $(placeholder);
        let parent = placeholder.parent();
        if(parent.length && parent.prop("tagName") == "P"){
          parent.replaceWith(placeholder);
        }
      })

      holes.on('complete', () => {
        resolve($.html());
      })

      holes.swap();

    } catch(err) {
      reject(err);
    }
  });
}