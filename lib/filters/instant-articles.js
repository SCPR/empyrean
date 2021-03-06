'use strict';

const cheerio  = require('cheerio');

module.exports = (html) => {
  return new Promise((resolve, reject) => {
    try {
      let $ = cheerio.load(html);

      // wrap embed wrappers tand tables in iframes
      $('.embed-wrapper, table').each((i, el) => {
        el = $(el);
        let iframe = $(`<iframe class='column-width'>${el.html()}</iframe>`);
        el.replaceWith(iframe);
      });

      // wrap iframes
      //
      // Iframes should be embedded in a figure tag with op-interactive class.
      // This will take care of dynamic embeds that have been inserted
      // by Portable Holes.
      $('iframe').wrap("<figure class='op-interactive'></figure>");


      // translate headings
      //
      // For whatever reason, Facebook only allows h1 and h2 tags.
      // H3 is reserved for "kickers", but it's unclear why others
      // are not permitted.  
      // While they will automatically translate h(n>2) tags to
      // h2, a warning is still displayed next to each story.
      // We will translate the tags here to prevent that warning.
      // The original publisher shouldn't have to worry about
      // this anyway.
      $("h1, h2, h3, h4, h5, h6").each((i, heading) => {
        heading = $(heading);
        let acceptedTags = ['H1', 'H2', 'h1', 'h2'];
        if(!acceptedTags.indexOf(heading.prop('tagName'))){
          heading.replaceWith($(`<em>${heading.text()}</em>`));
        } else {
          heading.html(heading.text()); // Headings shouldn't contain other tags.
        }
      });


      // make all images figures
      //
      // All media items have to be enclosed by figure tags
      $("img").each((i, image) => {
        image = $(image);
        let acceptedTags = ['figure', 'FIGURE'];
        if(acceptedTags.indexOf(image.parent().prop('tagName')) === -1) {
          image.wrap("<figure></figure>");
        }
      });


      resolve($.html());
    } catch(err) {
      reject(err);
    }
  })
}