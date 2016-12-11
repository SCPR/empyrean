'use strict';

const Validator = require('jsonschema').Validator;
const YAML      = require('js-yaml');
const glob      = require( 'glob' );
const path      = require( 'path' );
const fs        = require( 'fs' );
const cheerio   = require('cheerio');

// This allows us to make sure that the body of a message is stringified JSON.
Validator.prototype.customFormats.json = (input) => {
  try {
    JSON.parse(input);
    return true;
  } catch(err) {}
  return false;
}

// Check whether or not the method property in the message we are getting is an actual method.
Validator.prototype.customFormats.methodName = (input) => {
  return input.StringValue.match(/^get$|^put$|^post$|^delete$/) ? true : false;
}

// Validate the format of the HTML body of an article.

Validator.prototype.customFormats.strictHTML = (input) => {
  let $ = cheerio.load(input);

  // Check for comments.  We don't accept those, and it's not our job to clean them out.
  if($.contents().filter(function(){return this.nodeType == 8;}).length){
    return false;
  }

  return input
}

let validator = new Validator();
glob.sync(`./schemae/*.yml`).forEach((file) => {
  let schema = YAML.safeLoad(fs.readFileSync(path.resolve(file), 'utf8'));
  validator.addSchema(schema, schema.id);
}); 

module.exports = validator;