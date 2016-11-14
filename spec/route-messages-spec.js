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

let adapters    = {myspace: require('./mocks/adapters/myspace')({}), missing: require('../adapters/missing')({})};

let db          = new PouchDB(secrets.pouchdb.database);

let sqs         = new fakeSQS([]);

let empyrean    = new Empyrean({
  db:       db,
  sqs:      sqs,
  adapters: adapters
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
    empyrean.routeMessages([testMessage]).then(() => {
      empyrean.db.get(testMessage.MessageAttributes._id).then((doc) => {
        expect(doc.syndications.myspace.code).toEqual(201);
        done();
      });
    });
  });

  describe("a nonexistent adapter", () => {
    it("writes a status of 409 to the syndication record", (done) => {
      let message = generateTestMessage({_id: "77654346"});
      message.MessageAttributes.adapters = '["gooblegobble"]';
      empyrean.routeMessages([message]).then(() => {
        empyrean.db.get(message.MessageAttributes._id).then((doc) => {
          expect(doc.syndications.gooblegobble.code).toEqual(409);
          done();
        });
      });
    });
  });

});
