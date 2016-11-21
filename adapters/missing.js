'use strict';

let response = () => {
  return new Promise((resolve) => {
    return resolve({
      code: 409,
      message: "Specified adapter is missing."
    });
  })
}

module.exports = () => {

  return {
    get: response,
    post: response,
    put: response,
    delete: response
  };

}