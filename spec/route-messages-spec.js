'use strict';

const fs      = require('fs');
const YAML    = require('js-yaml');
const AWS     = require('aws-sdk');
const PouchDB = require('pouchdb');
const Promise = require('bluebird');
const glob    = require( 'glob' );
const path    = require( 'path' );
PouchDB.plugin(require('pouchdb-upsert'));
const Empyrean  = require('../lib/empyrean');

const mode     = "test";

let secrets = YAML.safeLoad(fs.readFileSync('./secrets.yml', 'utf8'))[mode];

AWS.config.update({accessKeyId: secrets.aws.access_key_id, secretAccessKey: secrets.aws.secret_access_key, region: secrets.aws.region});

let adapters  = {myspace: require('./mocks/adapters/myspace')};

let empyrean = new Empyrean({
  secrets:  secrets,
  db:       new PouchDB(secrets.pouchdb.database),
  sqs:      new AWS.SQS({apiVersion: '2012-11-05'}),
  adapters: adapters
  // config:   YAML.safeLoad(fs.readFileSync('./config.yml', 'utf8'))
});

describe("routeMessages", function() {

  let originalTimeout;
  beforeEach(() => {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
  });

  let testMessage = YAML.safeLoad(fs.readFileSync('./spec/fixtures/test-message.yml', 'utf8'));

  it("writes a successful push to the database", (done) => {

    empyrean.routeMessages([testMessage]).then(()=>{
      empyrean.db.get(testMessage.MessageAttributes._id).then((doc) => {
        expect(doc.statuses.myspace.code).toEqual(201);
        done();
      });
    });

  });

});
