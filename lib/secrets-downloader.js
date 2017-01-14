'use strict';
const fs        = require('fs');
const AWS       = require('aws-sdk');
const https     = require('https');

AWS.config.update({accessKeyId: process.env['AWS_ACCESS_KEY_ID'], secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'], region: process.env['AWS_REGION']});
let s3 = new AWS.S3({apiVersion: '2006-03-01'});

module.exports = () => {
  return new Promise((resolve, reject) => {

    // grab secrets from AWS S3
    let url = s3.getSignedUrl('getObject', {Bucket: 'scpr-grand-central', Key: 'secrets.yml'});

    https.get(url, (res) => {

      if(res.statusCode !== 200) {
        reject(`Failed to retrieve secrets.  S3 returned ${res.statusCode}`);
      }

      let body  = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', (chunk) => {
        fs.writeFile("./secrets.yml", body, 'utf8', (err) => {
          if(err){
            return reject(err);
          }
          resolve(body);
        });
      });

    }).on('error', (e) => {
      reject(e);
    });

  });

}













