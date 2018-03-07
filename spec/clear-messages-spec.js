'use strict';

const fs        = require('fs');
const YAML      = require('js-yaml');
const fakeSQS   = require('./mocks/sqs');
const PouchDB   = require('pouchdb-core');
const GrandCentral  = require('../lib/grand-central');
const loadAdapters  = require('../lib/adapter-loader');
const Logger        = require('../lib/logger');

const mode      = "test";

let adapters    = loadAdapters('/.mocks/adapters')

let testMessage = YAML.safeLoad(fs.readFileSync('./spec/fixtures/test-message.yml', 'utf8'));

let sqs         = new fakeSQS([testMessage]);

let gc          = new GrandCentral({
  sqs:      sqs,
  adapters: adapters,
  config:   YAML.safeLoad(fs.readFileSync('./config.yml', 'utf8')),
  logger: new Logger(mode)
});

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

describe("clearMessages", function() {

  it("erases messages from SQS", (done) => {

    gc.clearMessages([testMessage]).then((response) => {
      expect(response.Successful[0].Id).toEqual(testMessage.MessageId);
      expect(sqs.messages).toBeEmptyArray();
      done();
    });

  });

});