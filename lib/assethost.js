'use strict';

const http     = require('http');

module.exports = (assetId, token) => {
  return new Promise((resolve, reject) => {

    http.get(`http://a.scpr.org/api/assets/${assetId}/?auth_token=${token}`, (res) => {

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