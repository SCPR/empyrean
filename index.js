'use strict';
const fs        = require('fs');
const YAML      = require('js-yaml');
const AWS       = require('aws-sdk');
const PouchDB   = require('pouchdb');
const glob      = require( 'glob' );
const path      = require( 'path' );
PouchDB.plugin(require('pouchdb-upsert'));
const Empyrean  = require('./lib/empyrean');

const mode      = process.env.EMPYREAN_ENV || "development";

let secrets = YAML.safeLoad(fs.readFileSync('./secrets.yml', 'utf8'))[mode];

AWS.config.update({accessKeyId: secrets.aws.access_key_id, secretAccessKey: secrets.aws.secret_access_key, region: secrets.aws.region});

let adapters  = {};

glob.sync('./adapters/*.js').forEach((file) => {
  let adapterName       = file.split('.js')[0].split('./adapters/')[1];
  adapters[adapterName] = require(path.resolve(file));
}); 

let empyrean = new Empyrean({
  secrets:  secrets,
  db:       new PouchDB(secrets.pouchdb.database),
  sqs:      new AWS.SQS({apiVersion: '2012-11-05'}),
  adapters: adapters,
  config:   YAML.safeLoad(fs.readFileSync('./config.yml', 'utf8'))
});