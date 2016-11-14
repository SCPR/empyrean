'use strict';

const fs        = require('fs');
const YAML      = require('js-yaml');
const fakeSQS   = require('./mocks/sqs');
const PouchDB   = require('pouchdb');
const Empyrean  = require('../lib/empyrean');

const mode      = "test";

// let secrets     = YAML.safeLoad(fs.readFileSync('./secrets.yml', 'utf8'))[mode];

let adapters    = {myspace: require('./mocks/adapters/myspace')({})};

let testMessage = YAML.safeLoad(fs.readFileSync('./spec/fixtures/test-message.yml', 'utf8'));

let sqs         = new fakeSQS([testMessage]);

let empyrean    = new Empyrean({
  sqs:      sqs,
  adapters: adapters,
  config:   YAML.safeLoad(fs.readFileSync('./config.yml', 'utf8'))
});

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

describe("clearMessages", function() {

  it("erases messages from SQS", (done) => {

    empyrean.clearMessages([testMessage]).then((response) => {
      expect(response.Successful[0].Id).toEqual(testMessage.MessageId);
      expect(sqs.messages).toBeEmptyArray();
      done();
    });

  });

});