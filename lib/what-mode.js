'use strict';

module.exports = (mode) => {
  return mode || process.argv[2] || process.env.GRAND_CENTRAL_ENV || "development";
}