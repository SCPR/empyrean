'use strict';

const fs           = require('fs'),
      YAML         = require('js-yaml'),
      AWS          = require('aws-sdk'),
      PouchDB      = require('pouchdb'),
      GrandCentral = require('./lib/grand-central'),
      loadAdapters = require('./lib/adapter-loader'),
      Logger       = require('./lib/logger'),
      mode         = require('./lib/what-mode')();

PouchDB.plugin(require('pouchdb-upsert'));

let secrets   = YAML.safeLoad(fs.readFileSync('./secrets.yml', 'utf8'))[mode],
    config    = YAML.safeLoad(fs.readFileSync('./config.yml', 'utf8')),
    validator = require('./lib/schema-validator'); 

config.sqs.queues.messages.QueueUrl = secrets.aws.sqs.queue_url;

AWS.config.update({accessKeyId: secrets.aws.access_key_id, secretAccessKey: secrets.aws.secret_access_key, region: secrets.aws.region});

let adapters = loadAdapters('./adapters', secrets),

gc = new GrandCentral({
  db:       new PouchDB(secrets.pouchdb.database),
  sqs:      new AWS.SQS({apiVersion: '2012-11-05'}),
  adapters: adapters,
  config:   config,
  secrets:  secrets,
  logger:   new Logger(mode),
  validator: validator
});

module.exports = gc;