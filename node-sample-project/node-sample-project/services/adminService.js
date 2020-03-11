'use strict';
var mongoose = require('mongoose');
var config = require('../config/config.js');
var fs = require('fs');
var multer = require('multer');
var path = require('path');
var vash = require('vash');
var session = require('express-session');




var storage = multer.diskStorage({ //multers disk storage settings
    destination: function(req, file, cb) {
        cb(null, './www/uploads/admin');
    },
    filename: function(req, file, cb) {
        var datetimestamp = Date.now();
        req.body.image    = file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length - 1];

        console.log(req.body.image);
        cb(null, req.body.image);
    }
});
var upload = multer({ //multer settings
    storage: storage
}).single('image');








exports.update = function(req, res, callback) {
    console.log('Adminn');
    var modelName = 'Admin';
    upload(req, res, function(err) {
        console.log(req.body);
        if (req.body.image != undefined || req.body.image != '') {
            if (err) {
                return callback({status: 400, message: err});
            } else {
                var Admin = require('../../models/' + modelName);
                var data     = req.body;
                if (data.length === 0)

                    return callback({status: 400, message: 'Bad request. No record found.'});
                Admin.findOne({
                    $and: [
                        {
                            phone: data.phone
                        }, {
                            '_id': {$ne: mongoose.Types.ObjectId(data._id)}
                        }
                    ]
                }, function(err, result) {
                    if (!err) {
                        if (result) {
                            return callback({status: 400, message: 'Phone no already  Exist'});
                        } else {
                            Unlink('uploads/admin/' + req.body.oldImage, false, function(err) {
                                if (!err) {
                                    var data = req.body;
                                    var _id  = data._id;
                                    delete data._id;
                                    if (data.length === 0)
                                        return res.status(400).json({status: 400, message: 'Bad request. No record found.'});
                                    if (_id === undefined)
                                        return res.status(400).json({status: 400, message: 'Update _id not found.'});
                                    var Admin = require('../../models/' + modelName);
                                    Admin.update({_id: mongoose.Types.ObjectId(_id)},
                                        data, function(error, response) {
                                            if (error) {
                                                return callback({status: 500, message: error.message || 'Unknown internal error.'});
                                            }
                                            return callback(null, {data: response});
                                        });
                                }
                                else {
                                    return callback({status: 400, message: 'File Upload Failed'});
                                }
                            });
                        }
                    } else {
                        return callback({status: 500, message: 'Unknown internal error.'});
                    }
                });
            }
        } else {
            var data = req.body;
            var _id  = data._id;
            delete data._id;
            if (data.length === 0)

                return callback({status: 400, message: 'Bad request. No record found.'});
            if (_id === undefined)
                return callback({status: 400, message: 'Update _id not found.'});
            var Admin = require('../../models/' + modelName);
            Admin.findOne({phone: data.phone}, function(err, result) {
                if (!err) {
                    if (result) {
                        return callback({status: 400, message: 'Phone no already  Exist'});
                    } else {
                        Admin.update({_id: mongoose.Types.ObjectId(_id)},
                            data, function(error, response) {
                                if (error) {
                                    return callback({status: 500, message: error.message || 'Unknown internal error.'});
                                }
                                return callback(null, {data: response});
                            });
                    }
                } else {
                    return callback({status: 500, message: 'Unknown internal error.'});
                }
            });
        }
    });
};