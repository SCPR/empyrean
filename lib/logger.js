'use strict';

const fs = require('fs');

module.exports = class {
  constructor(mode) {
    this.mode    = mode;
    // this.logFile = fs.createWriteStream(`${process.cwd()}/log/${this.mode}.log`, {flags: 'a'});
    // ^^ disabling this for now until a better long-term way of doing this is figured out.
  }
  info (message) {
    this.echo(`[INFO] - ${message}`);
  }
  error (message) {
    this.echo(`[ERROR] - ${message}`);
    if(message.stack){
      this.echo(message.stack);
    }
  }
  echo (message) {
    console.log(message);
    // this.logFile.write(`${message}\n`);
  }
}