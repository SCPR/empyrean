'use strict';
const fs        = require('fs');
const YAML      = require('js-yaml');
const AWS       = require('aws-sdk');
const PouchDB   = require('pouchdb');
PouchDB.plugin(require('pouchdb-upsert'));
const GrandCentral      = require('./lib/grand-central');
const loadAdapters  = require('./lib/adapter-loader');
const Logger        = require('./lib/logger');

const mode          = process.env.EMPYREAN_ENV || "development";

let secrets   = YAML.safeLoad(fs.readFileSync('./secrets.yml', 'utf8'))[mode];

let config    = YAML.safeLoad(fs.readFileSync('./config.yml', 'utf8'));

let validator = require('./lib/schema-validator'); 

config.sqs.queues.messages.QueueUrl = secrets.aws.sqs.queue_url;

AWS.config.update({accessKeyId: secrets.aws.access_key_id, secretAccessKey: secrets.aws.secret_access_key, region: secrets.aws.region});

let adapters = loadAdapters('./adapters', secrets);

let gc      = new GrandCentral({
  db:       new PouchDB(secrets.pouchdb.database),
  sqs:      new AWS.SQS({apiVersion: '2012-11-05'}),
  adapters: adapters,
  config:   config,
  secrets:  secrets,
  logger:   new Logger(mode),
  validator: validator
});

module.exports = gc;