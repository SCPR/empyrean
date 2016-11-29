'use strict';

const fs      = require('fs');
const YAML    = require('js-yaml');
const fakeSQS = require('./mocks/sqs');
const PouchDB = require('pouchdb');
const GrandCentral  = require('../lib/grand-central');
const Logger    = require('../lib/logger');

PouchDB.plugin(require('pouchdb-upsert'));
PouchDB.plugin(require('pouchdb-erase'));

const mode      = "test";

let secrets     = YAML.safeLoad(fs.readFileSync('./secrets.yml', 'utf8'))[mode];

let adapters    = {myspace: require('./mocks/adapters/myspace')({}), missing: require('../adapters/missing')({})};

let validator   = require('../lib/schema-validator'); 

let db          = new PouchDB(secrets.pouchdb.database);

let sqs         = new fakeSQS([]);

let gc          = new GrandCentral({
  db:        db,
  sqs:       sqs,
  adapters:  adapters,
  logger:    new Logger(mode),
  validator: validator
  // config:   YAML.safeLoad(fs.readFileSync('./config.yml', 'utf8'))
});

let generateTestMessage = (opts) => {
  let message = YAML.safeLoad(fs.readFileSync('./spec/fixtures/test-message.yml', 'utf8'));
  opts = opts || {};
  Object.keys(opts).forEach((k) => {
    message[k] = opts[k];
  });
  return message;
}

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

describe("routeMessages", function() {

  afterEach((done) => {
    db.erase().then(() => {
      done();
    });
  });

  it("writes a successful push to the database", (done) => {
    let testMessage = generateTestMessage();
    gc.routeMessages([testMessage]).then(() => {
      gc.db.get(testMessage.MessageAttributes._id.StringValue).then((doc) => {
        expect(doc.syndications.myspace.code).toEqual(201);
        done();
      }).catch((err) => {
        done.fail(err);
      });
    });
  });

  describe("a nonexistent adapter", () => {
    it("writes a status of 409 to the syndication record", (done) => {
      let message = generateTestMessage();
      message.MessageAttributes.adapter.StringValue = 'gooblegobble';
      gc.routeMessages([message]).then(() => {
        gc.db.get(message.MessageAttributes._id.StringValue).then((doc) => {
          expect(doc.syndications.gooblegobble.code).toEqual(409);
          done();
        }).catch((err) => {
          done.fail(err);
        });
      });
    });
  });

});
