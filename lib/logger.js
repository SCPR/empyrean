'use strict';

const fs = require('fs');

module.exports = class {
  constructor(mode) {
    this.mode    = mode;
    // this.logFile = fs.createWriteStream(`${process.cwd()}/log/${this.mode}.log`, {flags: 'a'});
    // ^^ disabling this for now until a better long-term way of doing this is figured out.
  }
  info (message) {
    let text = (typeof message === 'string') ? message : JSON.stringify(message);
    this.echo(`[INFO] - ${text}`);
  }
  error (message) {
    let text = (typeof message === 'string') ? message : JSON.stringify(message);
    this.echo(`[ERROR] - ${text}`);
    if(message.stack){
      this.echo(message.stack);
    }
  }
  echo (message) {
    console.log(message);
    // this.logFile.write(`${message}\n`);
  }
}