'use strict';

const fs      = require('fs');
const YAML    = require('js-yaml');
const fakeSQS = require('./mocks/sqs');
const PouchDB = require('pouchdb');
const Empyrean  = require('../lib/empyrean');

PouchDB.plugin(require('pouchdb-upsert'));
PouchDB.plugin(require('pouchdb-erase'));

const mode      = "test";

let secrets     = YAML.safeLoad(fs.readFileSync('./secrets.yml', 'utf8'))[mode];

let adapters    = {myspace: require('./mocks/adapters/myspace')};

let db          = new PouchDB(secrets.pouchdb.database);

let testMessage = YAML.safeLoad(fs.readFileSync('./spec/fixtures/test-message.yml', 'utf8'));

let sqs         = new fakeSQS([testMessage]);

let empyrean    = new Empyrean({
  secrets:  secrets,
  db:       db,
  sqs:      sqs,
  adapters: adapters
  // config:   YAML.safeLoad(fs.readFileSync('./config.yml', 'utf8'))
});

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

describe("routeMessages", function() {

  afterEach((done) => {
    db.erase().then(() => {
      done();
    });
  });

  it("writes a successful push to the database", (done) => {

    empyrean.routeMessages([testMessage]).then(() => {
      empyrean.db.get(testMessage.MessageAttributes._id).then((doc) => {
        expect(doc.syndications.myspace.code).toEqual(201);
        done();
      });
    });

  });

});
