'use strict';

const express  = require('express');

module.exports = express.Router()
  .get('/:id', (req, res) => {
    res.send("thanks for asking");
  })