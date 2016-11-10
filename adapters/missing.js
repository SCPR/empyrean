'use strict';

let response = {
  code: 409,
  message: "Specified adapter is missing."
}

module.exports = {
  get: () => {
    return new Promise((resolve) => {
      return resolve(response);
    })
  },
  post: () => {
    return new Promise((resolve) => {
      return resolve(response);
    })
  },
  put: () => {
    return new Promise((resolve) => {
      return resolve(response);
    })
  },
  delete: () => {
    return new Promise((resolve) => {
      return resolve(response);
    })
  }
}