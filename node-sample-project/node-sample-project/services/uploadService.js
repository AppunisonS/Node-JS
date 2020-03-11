'use strict';
var multer = require('multer');
var fs = require('fs');
var config = require('../config/config.js');


module.exports.uploadCategoryImage = multer({ //multer settings
    storage: multer.diskStorage({ //multers disk storage settings
        destination: function (req, file, callback) {
            console.log('test'+file);
            callback(null, config.ImageLoc.categoryImage);
        },
        filename: function (req, file, callback) {
            var datetimestamp = Date.now();
            req.body.newImage = file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length - 1];
            callback(null, req.body.newImage)
        }
    })
}).single('image');

var Unlink = function (orgFile, thumbFile, callback) {
    fs.exists(orgFile, function (exists) {
        if (exists) {
            fs.unlink(orgFile, function (err) {
                if (!err) {
                    if (thumbFile) {
                        fs.exists(thumbFile, function (exists) {
                            if (exists) {
                                fs.unlink(thumbFile, function (err) {
                                    if (!err) {
                                        return callback(false);
                                    }
                                });
                            } else {
                                return callback(false);
                            }
                        })
                    } else {
                        return callback(false);
                    }
                } else {
                    return callback(true);
                }
            })
        } else {
            return callback(false);
        }
    })
}
module.exports.Unlink = Unlink;



