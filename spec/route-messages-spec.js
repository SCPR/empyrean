'use strict';

const fs      = require('fs'),
      YAML    = require('js-yaml'),
      fakeSQS = require('./mocks/sqs'),
      PouchDB = require('pouchdb-core'),
      GrandCentral  = require('../lib/grand-central'),
      Logger        = require('../lib/logger'),
      mode          = "test";

PouchDB.plugin(require('pouchdb-upsert'));
PouchDB.plugin(require('pouchdb-erase'));
PouchDB.plugin(require('pouchdb-adapter-memory'));

let secrets     = YAML.safeLoad(fs.readFileSync('./secrets.yml', 'utf8'))[mode],
    adapters    = {myspace: require('./mocks/adapters/myspace')({}), missing: require('../adapters/missing')({})},
    validator   = require('../lib/schema-validator'), 
    db          = new PouchDB('grand-central-test', {adapter: 'memory'}),
    sqs         = new fakeSQS([]),
    gc          = new GrandCentral({
      db:        db,
      sqs:       sqs,
      adapters:  adapters,
      logger:    new Logger(mode),
      validator: validator,
      config:    YAML.safeLoad(fs.readFileSync('./config.yml', 'utf8'))
    });

const generateTestMessage = (opts) => {
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

  it("writes a successful push to the database", done => {
    let testMessage = generateTestMessage();
    gc.routeMessages([testMessage]).then(() => {
      return gc.db.get(testMessage.MessageAttributes._id.StringValue).then(doc => {
        expect(doc.syndications.myspace.code).toEqual(201);
      });
    })
    .catch(err => {
      done.fail(err);
    })
    .then(() => {
      done();
    });
  });

  describe("a nonexistent adapter", () => {
    it("writes a status of 409 to the syndication record", done => {
      let message = generateTestMessage();
      message.MessageAttributes.adapter.StringValue = 'gooblegobble';
      gc.routeMessages([message]).then(() => {
        return gc.db.get(message.MessageAttributes._id.StringValue).then(doc => {
          expect(doc.syndications.gooblegobble.code).toEqual(409);
        });
      })
      .catch(err => {
        done.fail(err);
      })
      .then(() => {
        done();
      });
    });
  });

});
