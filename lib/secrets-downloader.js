'use strict';
const fs        = require('fs');
const AWS       = require('aws-sdk');
const https     = require('https');

module.exports = () => {
  return new Promise((resolve, reject) => {

    let s3 = new AWS.S3({apiVersion: '2006-03-01'});

    // grab secrets from AWS S3

    s3.getObject({Bucket: process.env.GRAND_CENTRAL_S3_BUCKET, Key: 'secrets.yml'}, (err, data) => {
      if(err){ return reject(`Failed to retrieve secrets.\n${err}`); }

      let body = data.Body.toString();
      
      fs.writeFile("./secrets.yml", body, 'utf8', (err) => {
        if(err){
          return reject(err);
        }
        resolve(body);
      });      
    })

  });

}













