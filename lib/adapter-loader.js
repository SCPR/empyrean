'use strict';

const glob      = require( 'glob' );
const path      = require( 'path' );

module.exports = (_path, secrets) => {
  let adapters = {};
  glob.sync(`${_path}/*.js`).forEach((file) => {
    let adapterName       = file.split('.js')[0].split('./adapters/')[1];
    adapters[adapterName] = new require(path.resolve(file))(secrets.adapters[adapterName]);
  }); 
  return adapters;
};