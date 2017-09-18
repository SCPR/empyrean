'use strict';

const https    = require('follow-redirects').https;

module.exports = (assetId, secrets) => {
  return new Promise((resolve, reject) => {
    https.get(`https://${secrets.assethost.server}/api/assets/${assetId}/?auth_token=${secrets.assethost.readOnlyToken}`, (res) => {

      if(res.statusCode !== 200) {
        reject();
      }

      let body  = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', (chunk) => {
        let asset = JSON.parse(body);
        resolve(asset);
      });

    });

  });
}