'use strict';

const Validator = require('jsonschema').Validator;
const YAML      = require('js-yaml');
const glob      = require( 'glob' );
const path      = require( 'path' );
const fs        = require('fs');

// This allows us to make sure that the body of a message is stringified JSON.
Validator.prototype.customFormats.json = (input) => {
  try {
    JSON.parse(input)
    return true;
  } catch(err) {}
  return false;
}

let validator = new Validator();
glob.sync(`./schemae/*.yml`).forEach((file) => {
  let schema = YAML.safeLoad(fs.readFileSync(path.resolve(file), 'utf8'));
  validator.addSchema(schema, schema.id)
}); 

module.exports = validator;