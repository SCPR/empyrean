// A generic cleanup filter that should be used pretty much every time.

'use strict';

const cheerio  = require('cheerio');
// const filter   = require('filter');

module.exports = (html) => {
  return new Promise((resolve, reject) => {
    try {
      let $ = cheerio.load(html);

      // strip comments
      $.root().find('*').contents().filter(function() { return this.type === 'comment'; }).remove();

      // remove empty paragraphs

      $('p').each((i, paragraph) => {
        paragraph = $(paragraph);
        let text = paragraph.text();
        if((text.length === 0) && (text.replace(/^\s+|\s+$/g, '') == "&nbsp;")){
          paragraph.remove();
        }
      });

      resolve($.html());

    } catch(err) {
      reject(err);
    }
  })
}