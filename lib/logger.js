'use strict';

module.exports = class {
  constructor(mode) {
    this.mode = mode;
  }
  info (message) {
    this.echo(`[INFO] - ${message}`);
  }
  error (message) {
    this.echo(`[ERROR] - ${message}`);
  }
  echo (message) {
    if (this.mode == 'development') {
      console.log(message);
    }
  }
}