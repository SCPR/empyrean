'use strict';

const fs = require('fs');

module.exports = class {
  constructor(mode) {
    this.mode    = mode;
    this.logFile = fs.createWriteStream(`${process.cwd()}/log/${this.mode}.log`, {flags: 'a'}); 
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
    if (this.mode == 'development') {
      console.log(message);
    }
    this.logFile.write(`${message}\n`);
  }
}