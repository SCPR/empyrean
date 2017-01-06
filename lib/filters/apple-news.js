'use strict';

const cheerio    = require('cheerio');
const toMarkdown = require('to-markdown');
const YAML       = require('js-yaml');
const fs         = require('fs');

let filters              = {
  cleanup          : require('./cleanup'),
  assethost        : require('./assethost')
}

let defaultYAMLString    = fs.readFileSync(`./templates/apple-news/article.yml`, 'utf8');

let htmlToBodyComponent = (html) => {
  // The HTML could be split into components
  // but it's just easier to convert the main
  // body into Markdown.
  let markdown = toMarkdown(html, {});
  return {
    role: "body",
    text: markdown,
    layout: "bodyLayout",
    textStyle: "bodyStyle",
    format: "markdown"
  }
}

let embedPlaceholderToComponent = (element) => {
  let url = element.attr("href");
  let role = element.attr("data-service");
  let idMatcher;

  if (url && role && ["twitter", "instagram", "youtube", "facebook"].include(role)) {
    if (role == "twitter") {
      role = "tweet";
      idMatcher = new RegExp("^(https?://twitter\\.com/([-a-zA-Z0-9+&@#%?=~_|!:,.;]+)/status(es){0,1}/(\\d+)/{0,1})", "i");
      // ^^ Validate the tweet URL
      url = url.match(idMatcher)[1];
      if (!url) {
        // Give up if the URL is no good.
        htmlToBodyComponent(element.html());
      }
    } else if (role == "youtube") {
      role = "embedwebvideo";
    } else if (role == "facebook") {
      role = "facebook_post";
    };

    return [{role: role, URL: url}];
  } else {
    return htmlToBodyComponent(element.html());
  }
}

let elementToComponent = (element) => {
  return new Promise((resolve, reject) => {
    let figure;

    if(element.prop('tagName') == 'FIGURE'){
      // If this is a figure, just get the image inside of it.
      figure  = element;
      element = element.find('img');
    }

    let tagName = element.prop('tagName');

    if(tagName == 'IMG'){
      // convert image to figure component(s)
      if(element.attr('data-asset-id') && element.attr('href') === "#"){
        // return nothing if we have detected that this is an inline asset placeholder
        //
        // maybe this should be moved into a separate filter specific for SCPR cleanup
        resolve();
        return;
      }

      let caption; 
      if(figure && figure.find('figcaption').length) {
        caption    = figure.find('figcaption').text();
      }
      caption = caption || element.attr('alt') || element.attr('title');

      resolve([{
          role: "figure",
          URL: element.attr('src'),
          caption: caption
        },
        {
          role: "caption",
          text: caption,
          textStyle: "figcaptionStyle"
      }]);

    } else if (tagName == 'A') {
      if (element.hasClass('embed-placeholder') && element.attr('data-service') && element.attr('href')) {
        // detect if this is an embed placeholder
        resolve(embedPlaceholderToComponent(element));
      } else {
        resolve(htmlToBodyComponent(element.html()));
      }
    } else {
      resolve(htmlToBodyComponent(element.html()));
    }

  })

}

// Just provide this an article.

module.exports = (article, secrets) => {
  return new Promise((resolve, reject) => {
    filters.cleanup(article.body)
      .then((html) => {
        return filters.assethost(html, secrets);
      })
      .then((html) => {
        let json = YAML.safeLoad(defaultYAMLString);

        json.identifier = article._id;
        json.title      = article.title;
        json.subtitle   = article.teaser;
        json.metadata   = {
          excerpt: article.teaser,
          thumbnailURL: article.assets[0].href
        };
        json.components = [
          {
            role: "title",
            layout: "titleLayout",
            text: article.title,
            textStyle: "titleStyle"
          },
          {
            role: "header",
            layout: "headerImageLayout",
            style: {
              fill: {
                type: "image",
                URL: article.assets[0].href,
                fillMode: "cover",
                verticalAlignment: "center"
              }
            }
          },
          {
            role: "author",
            layout: "authorLayout",
            text: article.byline,
            textStyle: "authorStyle"
          }
        ]

        let $          = cheerio.load(`<body>${html}</body>`);

        // Convert body elements to components.

        let promise = Promise.resolve();

        $('body > *').each((i, element) => {
          promise = promise
            .then(() => { return elementToComponent($(element)) })
            .then((component) => {
              json.components = json.components.concat(component);
            })
            .catch((err) => {
              debugger
            })
        })

        promise.then(() => {
          json.components.filter(Boolean); // removes undefined items from the array
          debugger
          resolve(json);
        })

      })
      .catch((err) => {
        reject(err);
      })

  })
}