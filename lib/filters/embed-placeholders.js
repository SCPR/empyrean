'use strict';

const cheerio       = require('cheerio');
const PortableHoles = require('portable-holes');
const najax         = require('najax');

module.exports = (html) => {
  return new Promise((resolve, reject) => {
    try {
      let $     = cheerio.load(html);
      $.ajax    = najax;
      let holes = new PortableHoles({
        $: $,
        Embedly: {
          query: {
            key: "0cb3651dde4740db8fcb147850c6b555"
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