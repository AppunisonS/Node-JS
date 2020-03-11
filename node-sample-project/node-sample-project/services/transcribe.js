'use strict';
var mongoose = require('mongoose');
var config = require('../config/config.js');

module.exports.checkFileName = function (modelName,title, callback) {
  var ModelObj = require('../models/' + modelName);
  ModelObj.findOne({title:title}, //conditions
    {title: 1}, //Blocking the fields in the result
    function (err, result) {
      if (!err)
        callback(config.StatusCode.Success, err, result);
      else
        callback(config.StatusCode.BedRequest, err, result);

    });
};









