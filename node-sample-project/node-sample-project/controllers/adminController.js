'use strict';
var dataService = require('../services/dataService');
var authorizationUser = require('../services/authentication').authUserChecker;
var authorizationAdmin = require('../services/authentication').authAdminChecker;
var authService = require('../services/authentication');
var mailer = require('../utilities/mailerService');
var nodemailer = require('nodemailer');
var config = require('../config/config.js');
var multer = require('multer');
var mongoose = require('mongoose');
var __ = require('lodash');
var aws = require('aws-sdk');
var multerS3 = require('multer-s3');
var request = require("request");
var fs = require('fs');
var braintree = require('braintree');
var gateway = braintree.connect({
    environment: braintree.Environment.Sandbox,
    merchantId: '123133',
    publicKey: '123123',
    privateKey: '123123'
});

module.exports = {};
var adminController = module.exports;

adminController.init = function (app, passport) {

    var storage = multer.diskStorage({ //multers disk storage settings
        destination: function (req, file, cb) {
            cb(null, './www/uploads/admin');
        },
        filename: function (req, file, cb) {
            var datetimestamp = Date.now();
            req.body.image = file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length - 1];

            req.body.fileType = file.originalname.split('.')[file.originalname.split('.').length - 1];
            cb(null, req.body);
        }
    });


    var upload = multer({ //multer settings
        storage: storage,
        limits: { fieldSize: 1000 * 1024 * 1024 },
    }).single('image');

    aws.config.update({
        accessKeyId: config.AlexaPolly.accessKey,
        secretAccessKey: config.AlexaPolly.secretKey,
        "region": "us-east-1"
    });
    var s3 = new aws.S3();

    /**multer function*/

    var transfer = multerS3({
        s3: s3,
        bucket: config.s3bucket,
        ACL: 'public-read',

        key: function (req, file, cb) {
            var newFileName = Date.now() + "-" + file.originalname;
            var fullPath = newFileName.replace(/\s/g, '')
            req.body.image = fullPath;
            cb(null, req.body.image); //use Date.now() for unique file keys
            //console.log(req.body.image);
            //console.log("I am getting till this console")
        }
    });
    var uploadbucket = multer({ storage: transfer }).single('image');
    var storageAudio = multer.diskStorage({ //multers disk storage settings
        destination: function (req, file, cb) {
            cb(null, './www/briefingskills/audio');
        },
        filename: function (req, file, cb) {
            var datetimestamp = Date.now();
            req.body.image = file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length - 1];

            cb(null, req.body.image);
        }
    });

    var uploadaudio = multer({
        storage: storageAudio,
        limits: { fieldSize: 1000 * 1024 * 1024 },
    }).single('image');

    var transferread = multerS3({
        s3: s3,
        bucket: config.s3bucket,
        ACL: 'public-read',

        key: function (req, file, cb) {
            var newFileName = Date.now() + "-" + file.originalname;
            var fullPath = newFileName.replace(/\s/g, '')
            req.body.image = fullPath;
            cb(null, req.body.image); //use Date.now() for unique file keys
            //console.log(req.body.image);
            //console.log("I am getting till this console")
        }
    });
    var uploadbucketread = multer({
        storage: transferread,
        limits: { fieldSize: 1000 * 1024 * 1024 },
        fileFilter: function (req, file, cb) {
            var fileType = file.originalname.split('.')[file.originalname.split('.').length - 1];

            if (fileType != 'flac' && fileType != 'wav' && fileType != 'mp3' && fileType != 'mp4') {
                console.log(fileType);
                return cb('Only flac, wav, mp3, and mp4 format files can be uploaded.');
            }
            return cb(null, true);
        },

    }).single('image');
    app.get('/admin/getAllData/:name', function (req, res) {

        var model = req.params.name;
        dataService.getPlan(model, function (status, err, data) {
            res.status(status).json({ message: err, data: data });
        })
    });
    app.get('/admin/getCount/:name', authorizationAdmin, function (req, res) {

        var model = req.params.name;
        dataService.getCount(model, function (status, err, data) {
            res.status(status).json({ message: err, data: data });
        })
    });
    app.get('/admin/getVoiceCount/:languageId', authorizationAdmin, function (req, res) {

        var languageId = req.params.languageId;
        dataService.getVoiceCount(languageId, function (status, err, data) {
            res.status(status).json({ message: err, data: data });
        })
    });

    app.get('/admin/getTotalLexiconWordsCount/:lexiconId', authorizationAdmin, function (req, res) {

        var lexiconId = req.params.lexiconId;
        dataService.getTotalLexiconWordsCount(lexiconId, function (status, err, data) {
            res.status(status).json({ message: err, data: data });
        })
    });

    app.get('/admin/getPageCount/:bookId', authorizationAdmin, function (req, res) {

        var bookId = req.params.bookId;
        dataService.getPageCount(bookId, function (status, err, data) {
            res.status(status).json({ message: err, data: data });
        })
    });

    app.get('/user/getPageCount/:bookId', authorizationUser, function (req, res) {

        var bookId = req.params.bookId;
        dataService.getPageCount(bookId, function (status, err, data) {
            res.status(status).json({ message: err, data: data });
        })
    });

    app.get('/user/getCount/:name', authorizationUser, function (req, res) {
        var user = req.decoded.id;
        var model = req.params.name;
        dataService.getCountUser(user, model, function (status, err, data) {
            res.status(status).json({ message: err, data: data });
        })
    });

    app.get('/admin/getCurrentPlanTotalCount/:name', authorizationUser, function (req, res) {
        var user = req.decoded.id;
        var model = req.params.name;
        var stratDate = req.decoded.userPlanPurchased.start;
        dataService.getCurrentPlanCount(user, model, stratDate, function (status, err, data) {
            res.status(status).json({ message: err, data: data });
        })
    });

    app.get('/admin/getAdminList/:page/:search/:perPageLimit', authorizationAdmin, function (req, res) {
        var page = req.params.page;
        var perPageLimit = parseInt(req.params.perPageLimit);

        if (req.params.search == 'undefined') {
            var query = {
                deleted: 0
            };

        } else {
            var query = {
                deleted: 0,
                name: { $regex: '.*' + req.params.search + '.*' }
            };

        }
        var options = {
            page: page,
            sort: { _id: -1 },
            limit: perPageLimit

        };
        dataService.getPagination(config.models.Admin, query, options, function (err, data) {
            if (!err) {
                res.status(200).json(data);
            } else {
                res.status(400).json({ message: err });
            }
        })
    });

    app.post('/admin/changePassword', authorizationAdmin, function (req, res) {
        var email = req.decoded.email;
        var password = req.body.newPassword;
        var currentPassword = req.body.currentPassword;
        if (email === undefined || email === '' || password === undefined || password === '' || currentPassword === undefined || currentPassword === '')
            return res.status(400).json({ code: 400, message: 'Invalid request.' });

        authService.changePassword(email, password, currentPassword, function (error, user) {
            if (error)
                res.status(500).json(error);

            res.status(200).json(user);
        });
    });

    app.post('/admin/userChangePassword', authorizationUser, function (req, res) {
        var email = req.decoded.email;
        var password = req.body.newPassword;
        var currentPassword = req.body.currentPassword;
        if (email === undefined || email === '' || password === undefined || password === '' || currentPassword === undefined || currentPassword === '')
            return res.status(400).json({ code: 400, message: 'Invalid request.' });

        authService.userChangePassword(email, password, currentPassword, function (error, user) {
            if (error)
                res.status(500).json(error);

            res.status(200).json(user);
        });
    });
    app.get('/admin/profile', authorizationAdmin, function (req, res) {

        var userId = req.decoded.id;
        dataService.getSingleRecord(config.models.Admin, userId, function (status, err, user) {
            console.log(user);
            res.status(status).json({
                message: (err == null) ? null : err.message,
                data: user
            });

        });
    });

    app.get('/user/:id/edit', function (req, res) {

        var adminId = req.params.id;
        dataService.getSingleRecord(config.models.User, adminId, function (status, err, user) {
            res.status(status).json({
                message: (err == null) ? null : err.message,
                data: user
            });

        });
    });
    app.get('/admin/:id/edit', function (req, res) {

        var adminId = req.params.id;
        dataService.getSingleRecord(config.models.Admin, adminId, function (status, err, user) {
            res.status(status).json({
                message: (err == null) ? null : err.message,
                data: user
            });

        });
    });
    app.get('/admin/:id/delete', function (req, res) {

        var adminId = req.params.id;
        dataService.deleteSingleRecord(config.models.Admin, adminId, function (status, err) {
            res.status(status).json({
                message: (err == null) ? null : err.message
            });

        });
    });

    app.post('/admin/multiDelete', function (req, res) {

        dataService.deleteMultipleRecords(config.models.Admin, req.body, function (status, err) {
            res.status(status).json({
                message: (err == null) ? null : err.message
            });

        });
    });

    app.post('/admin/multiStatusChange/:status', function (req, res) {

        var status = req.params.status;

        dataService.changeStatusMultipleRecords(config.models.Admin, req.body, status, function (status, err) {
            res.status(status).json({
                message: (err == null) ? null : err.message
            });

        });
    });
    app.get('/admin/:id/statusChange/:status', function (req, res) {

        var adminId = req.params.id;
        var status = (req.params.status == 1) ? 0 : 1;

        dataService.changeStatusSingleRecord(config.models.Admin, adminId, status, function (status, err) {
            res.status(status).json({
                message: (err == null) ? null : err.message
            });

        });
    });
    app.post('/admin/addUser', function (req, res, next) {

        req.body.password = '010';
        passport.authenticate('local-user-adduser', function (err, user, info) {

            if (!err && user) {
                var email = req.body.email;
                var password = req.body.password;
                var name = req.body.name;
                var generatePasswordUrl = config.generatePasswordUrl + '?token=' + user.password;

                var mailData = { email: user.email, subject: 'Generate Password' },
                    data = {
                        templateName: 'Generate Password',
                        generatePasswordUrl: generatePasswordUrl,
                        name: name,
                    },
                    templateName = "generate-password.vash";
                mailer.sendMail(mailData, data, templateName, false, function (error, responseStatus) {
                    if (error) {
                        console.log('e');
                        console.log(error);
                    }

                });
                authService.createTokenUser(user, function (err, token) {
                    if (!err)
                        res.status(200).json({ token: token, message: null, user: user });
                });

            } else {

                res.status(400).json({ token: null, message: info.message });
            }
        })(req, res, next);
    });


    app.post('/admin/shareBook', authorizationAdmin, function (req, res) {
        var email = req.body.email;
        var bookId = req.body.id;
        var name = req.decoded.name;
        var message = req.body.message;



        var bookShareUrl = config.baseUrl + 'admin-book-share/' + bookId;

        var mailData = { email: email, subject: name + ' has invited you to view a book' },
            data = {
                templateName: 'Book Share',
                bookShareUrl: bookShareUrl,
                name: name,
                message: message
            },
            templateName = "book-share.vash";
        mailer.sendMail(mailData, data, templateName, false, function (error, responseStatus) {
            if (error) {
                res.status(400).json({ message: error });
            } else {
                res.status(200).json({ message: 'Mail sent successfully' });

            }

        });

    });
    app.post('/user/shareBook', authorizationUser, function (req, res) {
        var email = req.body.email;
        var bookId = req.body.id;
        var name = req.decoded.name;
        var message = req.body.message;
        var bookShareUrl = config.baseUrl + 'admin-book-share/' + bookId;

        var mailData = { email: email, subject: name + ' has invited you to view a book' },
            data = {
                templateName: 'Book Share',
                bookShareUrl: bookShareUrl,
                name: name,
                message: message
            },
            templateName = "book-share.vash";
        mailer.sendMail(mailData, data, templateName, false, function (error, responseStatus) {
            if (error) {
                res.status(400).json({ message: error });
            } else {
                res.status(200).json({ message: 'Mail sent successfully' });

            }

        });

    });
    app.post('/admin/passwordChange', authorizationAdmin, function (req, res) {
        authService.passwordChangeAdmin(req, function (error, user) {
            if (error)
                res.status(500).json(error);

            res.status(200).json(user);
        });
    });
    app.post('/admin/sendEmail', function (req, res) {
        var email = req.body.email;
        var content = req.body.content;
        var transporter = nodemailer.createTransport({
            host: config.mailer.options.host,
            port: config.mailer.options.port,
            debug: true,
            secure: true,
            auth: {
                user: config.mailer.options.auth.user,
                pass: config.mailer.options.auth.pass
            }
        });
        var mailOptions = {
            from: config.mailer.from,
            to: email,
            subject: 'Transcribe Script',
            html: content
        };
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                return res.status(400).json({ message: error });
            } else {
                console.log(info);
                return res.status(200).json({ message: 'Email Sent Successfully.' });
            }
        });

    });

    app.post('/admin/sendChatEmail', function (req, res) {

        var email = req.body.email;
        var content = req.body.content;
        var transporter = nodemailer.createTransport({
            host: config.mailer.options.host,
            port: config.mailer.options.port,
            debug: true,
            secure: true,
            auth: {
                user: config.mailer.options.auth.user,
                pass: config.mailer.options.auth.pass
            }
        });

        var mailOptions = {
            from: config.mailer.from,
            to: email,
            subject: 'Chatbot Email',
            html: content
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log(info);
                res.status(200).json({ message: 'success' });
            }
        });

    });

    app.get('/admin/getAdminBucketList/:page', function (req, res) {

        var exec = require('child_process').exec;
        // var cmd = "aws transcribe list-transcription-jobs --region us-east-1 --status COMPLETED --max-results 100";
        var cmd = "aws transcribe list-transcription-jobs --region us-east-1 --status COMPLETED --max-results 100";
        exec(cmd, function (error, stdout, stderr) {
            if (!error) {
                var obj = JSON.parse(stdout);

                console.log('obj');
                console.log(obj);
                res.status(200).json(obj);
            } else {
                res.status(400).json({ message: error });
            }
        });
    });

    app.get('/admin/getAdminBucketInprogressList/:page', authorizationAdmin, function (req, res) {

        var exec = require('child_process').exec;

        // var cmd = "aws transcribe list-transcription-jobs --region us-east-1 --status COMPLETED --max-results 100";

        var cmd = "aws transcribe list-transcription-jobs --region us-east-1 --status IN_PROGRESS --max-results 100";

        exec(cmd, function (error, stdout, stderr) {
            if (!error) {
                var obj = JSON.parse(stdout);
                console.log(obj);
                console.log('lllllllllll');
                res.status(200).json(obj);
            } else {
                res.status(400).json({ message: error });
            }
        });


    });

    app.get('/user/getAdminBucketInprogressList/:page', authorizationUser, function (req, res) {

        var exec = require('child_process').exec;

        // var cmd = "aws transcribe list-transcription-jobs --region us-east-1 --status COMPLETED --max-results 100";

        var cmd = "aws transcribe list-transcription-jobs --region us-east-1 --status IN_PROGRESS --max-results 100";

        exec(cmd, function (error, stdout, stderr) {
            console.log(error);
            console.log(stdout);
            console.log(stderr);
            if (!error) {
                var obj = JSON.parse(stdout);
                console.log(obj);
                console.log('lllllllllll');
                res.status(200).json(obj);
            } else {
                res.status(400).json({ message: error });
            }
        });


    });

    app.get('/admin/:id/editBucket', function (req, res) {

        var audio = req.params.id;
        dataService.getSingleRecord(config.models.Audio, audio, function (status, err, user) {
            res.status(status).json({
                message: (err == null) ? null : err.message,
                data: user
            });
        });
    });


    app.get('/admin/:name/getAmazonOneWord', function (req, res) {
        var audioName = req.params.name;
        var ModelObj = require('../models/amazonTranscribe');
        ModelObj.findOne({ title: audioName, deleted: 0 }, //conditions
            function (err, result) {
                if (!err) {
                    var data = result.data;
                    var name = result.name;
                    //   var segmentLength = data.results.speaker_labels.segments.length;
                    var itemsLength = data.results.items.length;
                    var MediaFileUri = result.MediaFileUri;
                    var array = [];
                    var string = "";
                    var check = 0;
                    var planData = '';

                    for (var j = 0; j < itemsLength; j++) {

                        if (data.results.items[j].start_time != undefined) {

                            var startTime = data.results.items[j].start_time;
                            var d = Number(startTime);
                            var h = Math.floor(d / 3600);
                            var m = Math.floor(d % 3600 / 60);
                            var s = Math.floor(d % 3600 % 60);

                            var hms = ('0' + h).slice(-2) + ":" + ('0' + m).slice(-2) + ":" + ('0' + s).slice(-2);
                            console.log(hms);
                            if (data.results.items[j].alternatives[0].content == ',' || data.results.items[j].alternatives[0].content == '?' || data.results.items[j].alternatives[0].content == '.') {

                                var varData = array[array.length - 1].string;
                                array[array.length - 1].string = varData + data.results.items[j].alternatives[0].content;
                                planData = planData + data.results.items[j].alternatives[0].content;
                            } else {

                                string = string + ' ' + '<a class="' + data.results.items[j].start_time + '" >' + data.results.items[j].alternatives[0].content + '</a>';

                                planData = planData + ' ' + data.results.items[j].alternatives[0].content;

                                var obj = {
                                    string: string
                                };

                                array.push(obj);
                            }
                            string = "";

                        }
                    }
                    res.status(200).json({ array: array, MediaFileUri: MediaFileUri, data: data, planData: planData, name: name });

                } else {
                    res.status(400).json(null);
                }
            });
    });

    app.get('/admin/:name/getCombineAmazonOneWord', function (req, res) {
        var audioName = req.params.name;
        var ModelObj = require('../models/transcribe');
        ModelObj.findOne({ title: audioName, deleted: 0 }, //conditions
            function (err, result) {
                if (!err) {
                    var data = result.data;
                    var name = result.name;
                    var itemsLength = data.results.items.length;
                    var MediaFileUri = result.MediaFileUri;
                    var array = [];

                    var string = "";
                    var check = 0;
                    var planData = '';

                    for (var j = 0; j < itemsLength; j++) {

                        if (data.results.items[j].start_time != undefined) {

                            var startTime = data.results.items[j].start_time;
                            var d = Number(startTime);
                            var h = Math.floor(d / 3600);
                            var m = Math.floor(d % 3600 / 60);
                            var s = Math.floor(d % 3600 % 60);

                            var hms = ('0' + h).slice(-2) + ":" + ('0' + m).slice(-2) + ":" + ('0' + s).slice(-2);

                            if (data.results.items[j].alternatives[0].content == ',' || data.results.items[j].alternatives[0].content == '?' || data.results.items[j].alternatives[0].content == '.') {

                                var varData = array[array.length - 1].string;
                                array[array.length - 1].string = varData + data.results.items[j].alternatives[0].content;
                                planData = planData + data.results.items[j].alternatives[0].content;
                            } else {

                                string = string + ' ' + '<a class="' + data.results.items[j].start_time + '" >' + data.results.items[j].alternatives[0].content + '</a>';

                                planData = planData + ' ' + data.results.items[j].alternatives[0].content;

                                var obj = {
                                    string: string
                                };
                                array.push(obj);

                            }
                            string = "";

                        }
                    }
                    res.status(200).json({ array: array, MediaFileUri: MediaFileUri, data: data, planData: planData, name: name });
                } else {
                    res.status(400).json(null);
                }
            });


    });

    app.get('/user/:name/getJsonOneWord', function (req, res) {
        var audioName = req.params.name;
        var ModelObj = require('../models/transcribe');
        ModelObj.findOne({ title: audioName, deleted: 0 }, //conditions
            function (err, result) {
                if (!err) {
                    var data = result.data;
                    var name = result.name;
                    var itemsLength = data.results.items.length;
                    var MediaFileUri = result.MediaFileUri;
                    var array = [];

                    var string = "";
                    var check = 0;
                    var planData = '';

                    for (var j = 0; j < itemsLength; j++) {

                        if (data.results.items[j].start_time != undefined) {

                            var startTime = data.results.items[j].start_time;
                            var d = Number(startTime);
                            var h = Math.floor(d / 3600);
                            var m = Math.floor(d % 3600 / 60);
                            var s = Math.floor(d % 3600 % 60);

                            var hms = ('0' + h).slice(-2) + ":" + ('0' + m).slice(-2) + ":" + ('0' + s).slice(-2);
                            console.log(hms);



                            if (data.results.items[j].alternatives[0].content == ',' || data.results.items[j].alternatives[0].content == '?' || data.results.items[j].alternatives[0].content == '.') {

                                var varData = array[array.length - 1].string;
                                array[array.length - 1].string = varData + data.results.items[j].alternatives[0].content;
                                planData = planData + data.results.items[j].alternatives[0].content;
                            } else {

                                string = string + ' ' + '<a class="' + data.results.items[j].start_time + '" >' + data.results.items[j].alternatives[0].content + '</a>';

                                planData = planData + ' ' + data.results.items[j].alternatives[0].content;

                                var obj = {
                                    string: string
                                };

                                array.push(obj);
                            }
                            string = "";

                        }
                    }
                    res.status(200).json({ array: array, MediaFileUri: MediaFileUri, data: data, planData: planData, name: name });

                } else {
                    res.status(400).json(null);
                }
            });


    });
    app.get('/admin/:name/getJsonOneSecond', function (req, res) {
        var audioName = req.params.name;
        var exec = require('child_process').exec;
        var cmd1 = "aws transcribe get-transcription-job --region  us-east-1 --transcription-job-name " + audioName;
        exec(cmd1, function (error1, stdout1, stderr1) {
            if (error1 !== null) {
                return res.status(400).json({ message: 'Error occured Please try again' });
            } else {

                var obj1 = JSON.parse(stdout1);

                var data = obj1.TranscriptionJob.Transcript.TranscriptFileUri;
                var MediaFileUri = obj1.TranscriptionJob.Media.MediaFileUri;
                console.log(MediaFileUri);
                var url = data;
                request({
                    url: url,
                    json: true
                }, function (error, response, body) {
                    if (!error && response.statusCode === 200) {

                        var data = body;
                        var itemsLength = data.results.items.length;
                        var array = [];
                        var string = "";
                        var check = 0;
                        var timeCheck = 3;

                        for (var j = 0; j < itemsLength; j++) {

                            var startTime = data.results.items[j].start_time;
                            var d = Number(startTime);
                            var h = Math.floor(d / 3600);
                            var m = Math.floor(d % 3600 / 60);
                            var s = Math.floor(d % 3600 % 60);

                            var hms = ('0' + h).slice(-2) + ":" + ('0' + m).slice(-2) + ":" + ('0' + s).slice(-2);
                            if (check == 0) {
                                string = hms + '  ';
                                var time = startTime;
                            }
                            if (data.results.items[j].start_time == undefined) {
                                string = string + ' ' + data.results.items[j].alternatives[0].content;
                                check = 1;

                            } else {

                                var splitTime = startTime.split(".");
                                if (timeCheck > splitTime[0]) {
                                    string = string + ' ' + data.results.items[j].alternatives[0].content;
                                    check = 1;

                                } else {
                                    var obj = {
                                        time: time,
                                        string: string
                                    };

                                    array.push(obj);

                                    string = hms + '  ' + data.results.items[j].alternatives[0].content;
                                    var time = startTime;
                                    check = 1;

                                    timeCheck = Number(splitTime[0]) + Number(3);

                                }

                            }
                            if (j == itemsLength - 1) {
                                var obj = {
                                    time: time,
                                    string: string
                                };
                                array.push(obj);

                            }

                        }
                        res.status(200).json({ array: array, MediaFileUri: MediaFileUri });
                    }
                })
            }

        });

    });

    app.get('/admin/:name/getCombineAmazonOneSecond', function (req, res) {
        var audioName = req.params.name;
        var ModelObj = require('../models/transcribe');
        ModelObj.findOne({ title: audioName, deleted: 0 }, //conditions
            function (err, result) {
                if (!err) {
                    var data = result.data;
                    var name = result.name;
                    var itemsLength = data.results.items.length;
                    var MediaFileUri = result.MediaFileUri;
                    var array = [];

                    var string = "";
                    var check = 0;
                    var timeCheck = 3;
                    var planData = '';

                    for (var j = 0; j < itemsLength; j++) {

                        var startTime = data.results.items[j].start_time;
                        var d = Number(startTime);
                        var h = Math.floor(d / 3600);
                        var m = Math.floor(d % 3600 / 60);
                        var s = Math.floor(d % 3600 % 60);

                        var hms = ('0' + h).slice(-2) + ":" + ('0' + m).slice(-2) + ":" + ('0' + s).slice(-2);

                        if (check == 0) {
                            string = hms + '  ';
                            var time = startTime;
                        }
                        if (data.results.items[j].start_time == undefined) {


                            if (data.results.items[j].alternatives[0].content == ',' || data.results.items[j].alternatives[0].content == '?' || data.results.items[j].alternatives[0].content == '.') {

                                string = string + data.results.items[j].alternatives[0].content;
                                planData = planData + data.results.items[j].alternatives[0].content;
                            } else {

                                string = string + ' ' + data.results.items[j].alternatives[0].content;
                                planData = planData + ' ' + data.results.items[j].alternatives[0].content;


                            }
                            check = 1;

                        } else {

                            var splitTime = startTime.split(".");

                            if (timeCheck > splitTime[0]) {

                                if (data.results.items[j].alternatives[0].content == ',' || data.results.items[j].alternatives[0].content == '?' || data.results.items[j].alternatives[0].content == '.') {

                                    string = string + '<a class="' + data.results.items[j].start_time + '" >' + data.results.items[j].alternatives[0].content + '</a>';

                                    planData = planData + data.results.items[j].alternatives[0].content;

                                } else {

                                    string = string + ' ' + '<a class="' + data.results.items[j].start_time + '" >' + data.results.items[j].alternatives[0].content + '</a>';

                                    planData = planData + ' ' + data.results.items[j].alternatives[0].content;
                                }
                                check = 1;


                            } else {

                                var obj = {
                                    string: string
                                };

                                array.push(obj);

                                string = hms + ' ' + '<a class="' + data.results.items[j].start_time + '" >' + data.results.items[j].alternatives[0].content + '</a>';
                                planData = planData + ' ' + data.results.items[j].alternatives[0].content;
                                var time = startTime;
                                check = 1;

                                timeCheck = Number(splitTime[0]) + Number(3);

                            }
                        }
                        if (j == itemsLength - 1) {

                            var obj = {
                                time: time,
                                string: string
                            };

                            array.push(obj);

                        }

                    }
                    res.status(200).json({ array: array, MediaFileUri: MediaFileUri, data: data, planData: planData, name: name });
                } else {
                    res.status(400).json(null);
                }
            });

    });


    app.get('/admin/:name/getAmazonOneSecond', function (req, res) {

        var audioName = req.params.name;
        var ModelObj = require('../models/amazonTranscribe');
        ModelObj.findOne({ title: audioName, deleted: 0 }, //conditions
            function (err, result) {
                if (!err) {


                    var data = result.data;
                    var name = result.name;
                    var itemsLength = data.results.items.length;
                    var MediaFileUri = result.MediaFileUri;
                    var array = [];

                    var string = "";
                    var check = 0;
                    var timeCheck = 3;
                    var planData = '';

                    for (var j = 0; j < itemsLength; j++) {

                        var startTime = data.results.items[j].start_time;
                        var d = Number(startTime);
                        var h = Math.floor(d / 3600);
                        var m = Math.floor(d % 3600 / 60);
                        var s = Math.floor(d % 3600 % 60);

                        var hms = ('0' + h).slice(-2) + ":" + ('0' + m).slice(-2) + ":" + ('0' + s).slice(-2);


                        if (check == 0) {
                            string = hms + '  ';
                            var time = startTime;
                        }
                        if (data.results.items[j].start_time == undefined) {


                            if (data.results.items[j].alternatives[0].content == ',' || data.results.items[j].alternatives[0].content == '?' || data.results.items[j].alternatives[0].content == '.') {

                                string = string + data.results.items[j].alternatives[0].content;
                                planData = planData + data.results.items[j].alternatives[0].content;


                            } else {

                                string = string + ' ' + data.results.items[j].alternatives[0].content;
                                planData = planData + ' ' + data.results.items[j].alternatives[0].content;


                            }
                            check = 1;


                        } else {

                            var splitTime = startTime.split(".");
                            if (timeCheck > splitTime[0]) {
                                if (data.results.items[j].alternatives[0].content == ',' || data.results.items[j].alternatives[0].content == '?' || data.results.items[j].alternatives[0].content == '.') {
                                    string = string + '<a class="' + data.results.items[j].start_time + '" >' + data.results.items[j].alternatives[0].content + '</a>';

                                    planData = planData + data.results.items[j].alternatives[0].content;
                                } else {

                                    string = string + ' ' + '<a class="' + data.results.items[j].start_time + '" >' + data.results.items[j].alternatives[0].content + '</a>';

                                    planData = planData + ' ' + data.results.items[j].alternatives[0].content;

                                }

                                check = 1;

                            } else {
                                var obj = {
                                    string: string
                                };

                                array.push(obj);

                                string = hms + ' ' + '<a class="' + data.results.items[j].start_time + '" >' + data.results.items[j].alternatives[0].content + '</a>';
                                planData = planData + ' ' + data.results.items[j].alternatives[0].content;
                                var time = startTime;
                                check = 1;

                                timeCheck = Number(splitTime[0]) + Number(3);

                            }
                        }
                        if (j == itemsLength - 1) {

                            var obj = {
                                time: time,
                                string: string
                            };

                            array.push(obj);

                        }

                    }
                    res.status(200).json({ array: array, MediaFileUri: MediaFileUri, data: data, planData: planData, name: name });
                } else {
                    res.status(400).json(null);
                }
            });
    });
    app.get('/user/:name/getJsonOneSecondNew', function (req, res) {
        var audioName = req.params.name;
        var ModelObj = require('../models/transcribe');
        ModelObj.findOne({ title: audioName, deleted: 0 }, //conditions
            function (err, result) {
                if (!err) {
                    var data = result.data;
                    var name = result.name;
                    var itemsLength = data.results.items.length;
                    var MediaFileUri = result.MediaFileUri;
                    var array = [];
                    var string = "";
                    var check = 0;
                    var timeCheck = 3;
                    var planData = '';
                    for (var j = 0; j < itemsLength; j++) {
                        var startTime = data.results.items[j].start_time;
                        var d = Number(startTime);
                        var h = Math.floor(d / 3600);
                        var m = Math.floor(d % 3600 / 60);
                        var s = Math.floor(d % 3600 % 60);

                        var hms = ('0' + h).slice(-2) + ":" + ('0' + m).slice(-2) + ":" + ('0' + s).slice(-2);


                        if (check == 0) {
                            string = hms + '  ';
                            var time = startTime;
                        }
                        if (data.results.items[j].start_time == undefined) {


                            if (data.results.items[j].alternatives[0].content == ',' || data.results.items[j].alternatives[0].content == '?' || data.results.items[j].alternatives[0].content == '.') {

                                string = string + data.results.items[j].alternatives[0].content;
                                planData = planData + data.results.items[j].alternatives[0].content;
                            } else {
                                string = string + ' ' + data.results.items[j].alternatives[0].content;
                                planData = planData + ' ' + data.results.items[j].alternatives[0].content;
                            }
                            check = 1;
                        } else {

                            var splitTime = startTime.split(".");
                            if (timeCheck > splitTime[0]) {
                                if (data.results.items[j].alternatives[0].content == ',' || data.results.items[j].alternatives[0].content == '?' || data.results.items[j].alternatives[0].content == '.') {

                                    string = string + '<a class="' + data.results.items[j].start_time + '" >' + data.results.items[j].alternatives[0].content + '</a>';

                                    planData = planData + data.results.items[j].alternatives[0].content;

                                } else {

                                    string = string + ' ' + '<a class="' + data.results.items[j].start_time + '" >' + data.results.items[j].alternatives[0].content + '</a>';
                                    planData = planData + ' ' + data.results.items[j].alternatives[0].content;

                                }
                                check = 1;

                            } else {
                                var obj = {
                                    string: string
                                };

                                array.push(obj);

                                string = hms + ' ' + '<a class="' + data.results.items[j].start_time + '" >' + data.results.items[j].alternatives[0].content + '</a>';
                                planData = planData + ' ' + data.results.items[j].alternatives[0].content;
                                var time = startTime;
                                check = 1;

                                timeCheck = Number(splitTime[0]) + Number(3);
                            }

                        }
                        if (j == itemsLength - 1) {

                            var obj = {
                                time: time,
                                string: string
                            };
                            array.push(obj);
                        }

                    }
                    res.status(200).json({ array: array, MediaFileUri: MediaFileUri, data: data, planData: planData, name: name });

                } else {
                    res.status(400).json(null);
                }
            });
    });

    app.get('/admin/:name/getJson', function (req, res) {
        var audioName = req.params.name;
        var ModelObj = require('../models/transcribe');
        ModelObj.findOne({ title: audioName, deleted: 0 }, //conditions
            function (err, result) {
                if (!err) {
                    var data = result.data;
                    var MediaFileUri = result.MediaFileUri;

                    //  var segmentLength = data.results.speaker_labels.segments.length;
                    var itemsLength = data.results.items.length;
                    var array = [];
                    var string = "";
                    var planData = "";
                    var check = 0;
                    for (var j = 0; j < itemsLength; j++) {

                        var startTime = data.results.items[j].start_time;
                        var d = Number(startTime);
                        var h = Math.floor(d / 3600);
                        var m = Math.floor(d % 3600 / 60);
                        var s = Math.floor(d % 3600 % 60);

                        var hms = ('0' + h).slice(-2) + ":" + ('0' + m).slice(-2) + ":" + ('0' + s).slice(-2);
                        console.log(hms);

                        if (check == 0) {
                            string = hms + '  ';
                            var time = startTime;
                        }
                        if (data.results.items[j].alternatives[0].content != '.') {
                            if (data.results.items[j].alternatives[0].content == ',' || data.results.items[j].alternatives[0].content == '?') {

                                string = string + '<a class="' + data.results.items[j].start_time + '" >' + data.results.items[j].alternatives[0].content + '</a>';

                                planData = planData + data.results.items[j].alternatives[0].content;
                            } else {

                                string = string + ' ' + '<a class="' + data.results.items[j].start_time + '" >' + data.results.items[j].alternatives[0].content + '</a>';
                                planData = planData + ' ' + data.results.items[j].alternatives[0].content;

                            }
                            check = 1;

                        } else {
                            planData = planData + data.results.items[j].alternatives[0].content;
                            string = string + '.';
                            var obj = {
                                time: time,
                                string: string
                            };

                            array.push(obj);
                            string = "";
                            check = 0;

                        }
                    }

                    var obj = {
                        time: time,
                        string: string
                    };

                    array.push(obj);

                    res.status(200).json({ array: array, MediaFileUri: MediaFileUri, data: data, planData: planData });

                } else {
                    res.status(400).json(null);
                }
            });

    });

    app.post('/user/combineAmazonTranscribeUpload', authorizationUser, function (req, res) {
        var userId = req.decoded.id;
        var exec = require('child_process').exec;
        try {
            uploadbucketread(req, res, function (err1) {

                if (err1) {
                    return res.status(400).json({
                        status: 400,
                        message: err1
                    });
                } else {
                    req.body.name = req.body.title;
                    req.body.type = 'amazon';
                    req.body.title = req.body.title.replace(/[^a-zA-Z0-9]/g, "");
                    var title = req.body.title;
                    var language = req.body.language;
                    var audioname = req.body.image;
                    req.body.deleted = 1;


                    req.body.userId = userId;
                    req.body.userPlanPurchased = req.decoded.userPlanPurchased._id;
                    req.body.title = req.body.title;
                    req.body.language = req.body.language;
                    req.body.audioname = req.body.image;
                    req.body.streamUrl = config.streamReadUrl + req.body.image;
                    req.body.MediaFormat = req.body.image.split('.')[req.body.image.split('.').length - 1];

                    if (title === undefined || title === '' || audioname === undefined || audioname === '' || language === undefined || language === '')
                        return res.status(400).json({ code: 400, message: 'Invalid request.' });


                    var filePath = './www/briefingskills/test-start-command.json';

                    var resdateObj = {};
                    var resdateMediaObj = {};
                    var resdataSetObj = {};

                    resdateObj.TranscriptionJobName = req.body.title;
                    resdateObj.LanguageCode = req.body.language;
                    resdateObj.MediaFormat = req.body.MediaFormat;
                    resdateMediaObj.MediaFileUri = req.body.streamUrl;
                    resdateObj.Media = resdateMediaObj;

                    if (req.body.speakerIdentificationCheck == 'true') {

                        resdataSetObj.MaxSpeakerLabels = parseInt(req.body.speakerlabels);
                        resdataSetObj.ShowSpeakerLabels = true;
                    } else {

                        resdataSetObj.ShowSpeakerLabels = false;
                    }
                    //  resdateObj.Settings = resdataSetObj;

                    var jsonData = JSON.stringify(resdateObj);


                    fs.writeFile(filePath, jsonData);

                    var cmd = "aws transcribe start-transcription-job --region us-east-1 --cli-input-json  " + config.filePath;

                    console.log(cmd);

                    exec(cmd, function (error, stdout, stderr) {
                        if (error !== null) {
                            console.log(error);
                            return res.status(400).json({ message: 'Error occurred Please try to change the file name' });
                        } else {
                            var obj = JSON.parse(stdout);
                            dataService.Save(config.models.Transcribe, req.body, function (statusr, userr, errr) {

                                if (errr != null) {
                                    return res.status(200).json({ message: 'success' });
                                } else {

                                    res.status(statusr).json({
                                        message: (errr == null) ? null : errr.message
                                    });

                                }

                            });
                        }
                    });

                }

            });

        } catch (error) {
            return res.status(500).json({
                status: 400,
                message: 'Unknown internal error.'
            });
        }
    });

    app.post('/admin/combineAmazonTranscribeUpload', authorizationAdmin, function (req, res) {

        var exec = require('child_process').exec;
        try {

            uploadbucketread(req, res, function (err1) {

                if (err1) {
                    return res.status(400).json({
                        status: 400,
                        message: err1
                    });
                } else {

                    console.log(req.body);
                    req.body.name = req.body.title;
                    req.body.type = 'amazon';
                    req.body.deleted = 1;

                    req.body.title = req.body.title.replace(/[^a-zA-Z0-9]/g, "");
                    var title = req.body.title.replace(/[^a-zA-Z0-9]/g, "");

                    var language = req.body.language;
                    var audioname = req.body.image;

                    req.body.title = req.body.title;
                    req.body.language = req.body.language;
                    req.body.audioname = req.body.image;
                    req.body.streamUrl = config.streamReadUrl + req.body.image;
                    req.body.MediaFormat = req.body.image.split('.')[req.body.image.split('.').length - 1];

                    if (title === undefined || title === '' || audioname === undefined || audioname === '' || language === undefined || language === '')
                        return res.status(400).json({ code: 400, message: 'Invalid request.' });


                    var filePath = './www/briefingskills/test-start-command.json';
                    var resdateObj = {};
                    var resdateMediaObj = {};
                    var resdataSetObj = {};

                    resdateObj.TranscriptionJobName = req.body.title;
                    resdateObj.LanguageCode = req.body.language;
                    resdateObj.MediaFormat = req.body.MediaFormat;
                    resdateMediaObj.MediaFileUri = req.body.streamUrl;
                    resdateObj.Media = resdateMediaObj;
                    if (req.body.speakerIdentificationCheck == 'true') {

                        resdataSetObj.MaxSpeakerLabels = parseInt(req.body.speakerlabels);
                        resdataSetObj.ShowSpeakerLabels = true;
                    } else {

                        resdataSetObj.ShowSpeakerLabels = false;
                    }

                    var jsonData = JSON.stringify(resdateObj);
                    fs.writeFile(filePath, jsonData);

                    var cmd = "aws transcribe start-transcription-job --region us-east-1 --cli-input-json " + config.filePath;

                    exec(cmd, function (error, stdout, stderr) {
                        if (error !== null) {
                            console.log('exec error: ' + error);
                            return res.status(400).json({ message: 'Error occurred Please try to change the file name' });
                        } else {
                            var obj = JSON.parse(stdout);
                            console.log('obj');
                            console.log(obj);

                            dataService.Save(config.models.Transcribe, req.body, function (statusr, userr, errr) {

                                if (errr != null) {
                                    return res.status(200).json({ message: 'success' });
                                } else {

                                    return res.status(statusr).json({
                                        message: (errr == null) ? null : errr.message
                                    });

                                }

                            });

                        }
                    });
                }

            });

        } catch (error) {
            return res.status(500).json({
                status: 400,
                message: 'Unknown internal error.'
            });
        }
    });


    app.post('/admin/amazonTranscribeUpload', authorizationAdmin, function (req, res) {

        var exec = require('child_process').exec;
        try {
            uploadbucketread(req, res, function (err1) {

                if (err1) {
                    return res.status(400).json({
                        status: 400,
                        message: err1
                    });
                } else {

                    console.log(req.body);
                    req.body.name = req.body.title;
                    req.body.type = 'amazon';
                    req.body.deleted = 1;

                    req.body.title = req.body.title.replace(/[^a-zA-Z0-9]/g, "");
                    var title = req.body.title.replace(/[^a-zA-Z0-9]/g, "");

                    var language = req.body.language;
                    var audioname = req.body.image;

                    req.body.title = req.body.title;
                    req.body.language = req.body.language;
                    req.body.audioname = req.body.image;
                    req.body.streamUrl = config.streamReadUrl + req.body.image;
                    req.body.MediaFormat = req.body.image.split('.')[req.body.image.split('.').length - 1];

                    if (title === undefined || title === '' || audioname === undefined || audioname === '' || language === undefined || language === '')
                        return res.status(400).json({ code: 400, message: 'Invalid request.' });


                    var filePath = './www/briefingskills/test-start-command.json';
                    var resdateObj = {};
                    var resdateMediaObj = {};
                    var resdataSetObj = {};

                    resdateObj.TranscriptionJobName = req.body.title;
                    resdateObj.LanguageCode = req.body.language;
                    resdateObj.MediaFormat = req.body.MediaFormat;
                    resdateMediaObj.MediaFileUri = req.body.streamUrl;
                    resdateObj.Media = resdateMediaObj;
                    // resdateObj.MediaSampleRateHertz = 8000;
                    if (req.body.speakerIdentificationCheck == 'true') {

                        resdataSetObj.MaxSpeakerLabels = parseInt(req.body.speakerlabels);
                        resdataSetObj.ShowSpeakerLabels = true;
                    } else {

                        resdataSetObj.ShowSpeakerLabels = false;
                    }

                    var jsonData = JSON.stringify(resdateObj);
                    fs.writeFile(filePath, jsonData);

                    var cmd = "aws transcribe start-transcription-job --region us-east-1 --cli-input-json " + config.filePath;

                    exec(cmd, function (error, stdout, stderr) {
                        if (error !== null) {
                            console.log('exec error: ' + error);
                            return res.status(400).json({ message: 'Error occurred Please try to change the file name' });
                        } else {
                            var obj = JSON.parse(stdout);

                            dataService.Save(config.models.AmazonTranscribe, req.body, function (statusr, userr, errr) {

                                if (errr != null) {
                                    return res.status(200).json({ message: 'success' });
                                } else {

                                    return res.status(statusr).json({
                                        message: (errr == null) ? null : errr.message
                                    });

                                }

                            });

                        }
                    });
                }

            });

        } catch (error) {
            return res.status(500).json({
                status: 400,
                message: 'Unknown internal error.'
            });
        }
    });

    app.get('/admin/:name/convertAudioBucketFileItem', function (req, res) {
        var audioName = req.params.name;
        console.log(audioName);
        var exec = require('child_process').exec;
        var cmd1 = "aws transcribe get-transcription-job --region  us-east-1 --transcription-job-name " + audioName;
        exec(cmd1, function (error1, stdout1, stderr1) {
            console.log('hh11');
            if (error1 !== null) {
                console.log('exec111 error: ' + error1);
                return res.status(400).json({ message: 'Error occured Please try again' });
            } else {

                var obj1 = JSON.parse(stdout1);
                var filePath2 = './www/briefingskills/readaudio/' + audioName;
                if (fs.existsSync(filePath2)) {
                    // Do something
                    fs.unlink(filePath2, function (err) {
                        if (err) return console.log(err);
                        console.log('file deleted successfully');

                        var data = obj1.TranscriptionJob.Transcript.TranscriptFileUri;
                        var url = data;
                        request({
                            url: url,
                            json: true
                        }, function (error, response, body) {
                            if (!error && response.statusCode === 200) {
                                var jsonData = body.results.transcripts[0].transcript;
                                fs.writeFile(filePath2, jsonData);
                            }
                        })

                    });
                } else {
                    var data = obj1.TranscriptionJob.Transcript.TranscriptFileUri;
                    var url = data;
                    request({
                        url: url,
                        json: true
                    }, function (error, response, body) {

                        if (!error && response.statusCode === 200) {
                            var jsonData = body.results.transcripts[0].transcript;
                            fs.writeFile(filePath2, jsonData);
                        }
                    })
                }

                var filePath3 = './www/briefingskills/readaudioalldata/' + audioName;
                if (fs.existsSync(filePath3)) {
                    // Do something
                    fs.unlink(filePath3, function (err) {
                        if (err) return console.log(err);
                        console.log('file deleted successfully');

                        var data = obj1.TranscriptionJob.Transcript.TranscriptFileUri;
                        var url = data;
                        request({
                            url: url,
                            json: true
                        }, function (error, response, body) {
                            if (!error && response.statusCode === 200) {

                                var jsonFullData = JSON.stringify(body);
                                console.log('jsonFullData');
                                console.log(jsonFullData);
                                fs.writeFile(filePath3, jsonFullData);
                            }
                        })

                    });
                } else {
                    var data = obj1.TranscriptionJob.Transcript.TranscriptFileUri;
                    var url = data;
                    request({
                        url: url,
                        json: true
                    }, function (error, response, body) {
                        if (!error && response.statusCode === 200) {

                            var jsonFullData = JSON.stringify(body);
                            console.log(jsonFullData);
                            fs.writeFile(filePath3, jsonFullData);
                        }
                    })
                }
            }
        });
    });

    app.get('/admin/:name/amazonDownloadFile', function (req, res) {

        var title = req.params.name;
        dataService.getTranscribeRecord(config.models.AmazonTranscribe, title, function (status, err, result) {

            if (!err && result != null) {

                var data = result.data;
                var response = data;
                var audioName = result.title;
                var fileName = 'TS' + audioName + '.txt';
                var plaindata = '';
                response.results.items.forEach(wordInfo => {
                    if (wordInfo.alternatives[0].content == '.' || wordInfo.alternatives[0].content == ',' ||
                        wordInfo.alternatives[0].content == '?') {
                        plaindata = plaindata.trim();
                        plaindata = plaindata + wordInfo.alternatives[0].content;
                    } else {
                        plaindata = plaindata + ' ' + wordInfo.alternatives[0].content;
                    }

                });
                res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
                res.setHeader('Content-type', 'text/plain');
                res.charset = 'UTF-8';
                res.write(plaindata);
                res.end();


            } else {
                res.status(400).json(null);
            }

        });


    });


    app.get('/admin/:name/combineAmazonDownloadFile', function (req, res) {

        var title = req.params.name;
        dataService.getTranscribeRecord(config.models.Transcribe, title, function (status, err, result) {

            if (!err && result != null) {

                var data = result.data;
                var response = data;
                var audioName = result.title;
                var fileName = 'TS' + audioName + '.txt';
                var plaindata = '';
                response.results.items.forEach(wordInfo => {

                    if (wordInfo.alternatives[0].content == '.' || wordInfo.alternatives[0].content == ',' ||
                        wordInfo.alternatives[0].content == '?') {



                        plaindata = plaindata.trim();
                        plaindata = plaindata + wordInfo.alternatives[0].content;
                    } else {
                        plaindata = plaindata + ' ' + wordInfo.alternatives[0].content;
                    }
                });
                res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
                res.setHeader('Content-type', 'text/plain');
                res.charset = 'UTF-8';
                res.write(plaindata);
                res.end();


            } else {
                res.status(400).json(null);
            }
        });

    });
    app.get('/user/:name/downloadFile', function (req, res) {
        var title = req.params.name;

        dataService.getTranscribeRecord(config.models.Transcribe, title, function (status, err, result) {

            if (!err && result != null) {

                var data = result.data;
                var response = data;
                var audioName = result.title;
                var fileName = 'TS' + audioName + '.txt';
                var plaindata = '';
                response.results.items.forEach(wordInfo => {

                    if (wordInfo.alternatives[0].content == '.' || wordInfo.alternatives[0].content == ',' ||
                        wordInfo.alternatives[0].content == '?') {

                        plaindata = plaindata.trim();
                        plaindata = plaindata + wordInfo.alternatives[0].content;
                    } else {
                        plaindata = plaindata + ' ' + wordInfo.alternatives[0].content;
                    }

                });
                res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
                res.setHeader('Content-type', 'text/plain');
                res.charset = 'UTF-8';
                res.write(plaindata);
                res.end();

            } else {
                res.status(400).json(null);
            }

        });
    });

    app.get('/admin/saveTranscribeTranscript/:title', authorizationAdmin, function (req, res) {
        var adminId = req.decoded.id;
        var title = req.params.title;
        title = title.replace(/ /g, "_");
        var exec = require('child_process').exec;
        var cmd1 = "aws transcribe get-transcription-job --region  us-east-1 --transcription-job-name " + title;
        exec(cmd1, function (error1, stdout1, stderr1) {
            if (error1 !== null) {
                return res.status(400).json({ message: 'Error occurred Please try again' });
            } else {
                var obj1 = JSON.parse(stdout1);
                var data = obj1.TranscriptionJob.Transcript.TranscriptFileUri;
                var MediaFileUri = obj1.TranscriptionJob.Media.MediaFileUri;
                var url = data;
                request({
                    url: url,
                    json: true
                }, function (error, response, body) {

                    if (!error && response.statusCode === 200) {

                        var jsonData = body.results.transcripts[0].transcript;

                        var Data = {};
                        Data.transcript = jsonData;
                        Data.adminId = adminId;
                        Data.data = body;
                        Data.MediaFileUri = MediaFileUri;
                        Data.deleted = 0;
                        dataService.updateTranscribe(config.models.Transcribe, title, Data, function (statusr, userr, errr) {

                            if (errr != null) {
                                return res.status(200).json({ message: 'success' });
                            } else {

                                return res.status(statusr).json({
                                    message: (errr == null) ? null : errr.message
                                });

                            }

                        });

                    }
                })

            }
        });
    });


    app.get('/admin/saveAmazonTranscribeTranscript/:title', authorizationAdmin, function (req, res) {
        var adminId = req.decoded.id;
        var title = req.params.title;
        title = title.replace(/ /g, "_");
        var exec = require('child_process').exec;
        var cmd1 = "aws transcribe get-transcription-job --region  us-east-1 --transcription-job-name " + title;
        exec(cmd1, function (error1, stdout1, stderr1) {

            if (error1 !== null) {
                return res.status(400).json({ message: 'Error occurred Please try again' });
            } else {

                var obj1 = JSON.parse(stdout1);

                var data = obj1.TranscriptionJob.Transcript.TranscriptFileUri;
                var MediaFileUri = obj1.TranscriptionJob.Media.MediaFileUri;

                var url = data;
                request({
                    url: url,
                    json: true
                }, function (error, response, body) {

                    if (!error && response.statusCode === 200) {

                        var jsonData = body.results.transcripts[0].transcript;
                        var Data = {};
                        Data.transcript = jsonData;
                        Data.adminId = adminId;
                        Data.data = body;
                        Data.MediaFileUri = MediaFileUri;
                        Data.deleted = 0;
                        dataService.updateTranscribe(config.models.AmazonTranscribe, title, Data, function (statusr, userr, errr) {
                            if (errr != null) {
                                return res.status(200).json({ message: 'success' });
                            } else {

                                return res.status(statusr).json({
                                    message: (errr == null) ? null : errr.message
                                });

                            }

                        });

                    }
                })

            }
        });
    });

    app.post('/admin/saveModifyTranscribe', function (req, res) {
        var title = req.body.title;
        title = title.replace(/ /g, "_");
        var Data = {};
        Data.data = req.body.data;
        Data.transcript = req.body.transcript;
        dataService.updateTranscribe(config.models.Transcribe, title, Data, function (statusr, userr, errr) {
            if (errr != null) {
                return res.status(200).json({ message: 'success' });
            } else {

                return res.status(statusr).json({
                    message: (errr == null) ? null : errr.message
                });

            }

        });
    });
    app.post('/admin/saveModifyAmazonTranscribe', function (req, res) {
        var title = req.body.title;
        title = title.replace(/ /g, "_");
        var Data = {};
        Data.data = req.body.data;
        Data.transcript = req.body.transcript;

        dataService.updateTranscribe(config.models.AmazonTranscribe, title, Data, function (statusr, userr, errr) {

            if (errr != null) {
                return res.status(200).json({ message: 'success' });
            } else {

                return res.status(statusr).json({
                    message: (errr == null) ? null : errr.message
                });

            }

        });
    });


    app.post('/admin/saveModifyCombineAmazonTranscribe', function (req, res) {
        var title = req.body.title;
        title = title.replace(/ /g, "_");
        var Data = {};
        Data.data = req.body.data;
        Data.transcript = req.body.transcript;

        dataService.updateTranscribe(config.models.Transcribe, title, Data, function (statusr, userr, errr) {
            if (errr != null) {
                return res.status(200).json({ message: 'success' });
            } else {

                return res.status(statusr).json({
                    message: (errr == null) ? null : errr.message
                });
            }
        });
    });


    app.post('/user/saveModifyTranscribe', function (req, res) {
        var title = req.body.title;
        title = title.replace(/ /g, "_");
        var Data = {};
        Data.data = req.body.data;
        Data.transcript = req.body.transcript;

        dataService.updateTranscribe(config.models.Transcribe, title, Data, function (statusr, userr, errr) {
            if (errr != null) {
                return res.status(200).json({ message: 'success' });
            } else {
                return res.status(statusr).json({
                    message: (errr == null) ? null : errr.message
                });
            }

        });
    });


    app.post('/admin/saveModifyGoogleTranscribe', function (req, res) {
        var id = req.body.id;
        var Data = {};
        Data.data = req.body.data;
        dataService.updateGoogleTranscribe(config.models.GoogleTranscribe, id, Data, function (statusr, userr, errr) {
            if (errr != null) {
                return res.status(200).json({ message: 'success' });
            } else {
                return res.status(statusr).json({
                    message: (errr == null) ? null : errr.message
                });

            }

        });
    });


    app.post('/admin/saveModifyCombineGoogleTranscribe', function (req, res) {
        var id = req.body.id;
        var Data = {};
        Data.data = req.body.data;
        dataService.updateGoogleTranscribe(config.models.Transcribe, id, Data, function (statusr, userr, errr) {
            if (errr != null) {
                return res.status(200).json({ message: 'success' });
            } else {
                return res.status(statusr).json({
                    message: (errr == null) ? null : errr.message
                });
            }
        });
    });

    app.post('/user/saveModifyGoogleTranscribe', function (req, res) {
        var id = req.body.id;
        var Data = {};
        Data.data = req.body.data;
        dataService.updateGoogleTranscribe(config.models.Transcribe, id, Data, function (statusr, userr, errr) {
            if (errr != null) {
                return res.status(200).json({ message: 'success' });
            } else {
                return res.status(statusr).json({
                    message: (errr == null) ? null : errr.message
                });
            }

        });
    });
    app.get('/user/saveTranscribeTranscript/:title', authorizationUser, function (req, res) {
        var userId = req.decoded.id;
        var title = req.params.title;
        title = title.replace(/ /g, "_");
        var exec = require('child_process').exec;
        var cmd1 = "aws transcribe get-transcription-job --region  us-east-1 --transcription-job-name " + title;
        exec(cmd1, function (error1, stdout1, stderr1) {
            if (error1 !== null) {
                return res.status(400).json({ message: 'Error occurred Please try again' });
            } else {
                var obj1 = JSON.parse(stdout1);
                var data = obj1.TranscriptionJob.Transcript.TranscriptFileUri;
                var MediaFileUri = obj1.TranscriptionJob.Media.MediaFileUri;
                var url = data;
                request({
                    url: url,
                    json: true
                }, function (error, response, body) {

                    if (!error && response.statusCode === 200) {

                        var jsonData = body.results.transcripts[0].transcript;

                        var Data = {};
                        Data.transcript = jsonData;
                        Data.userId = userId;
                        Data.data = body;
                        Data.MediaFileUri = MediaFileUri;
                        Data.deleted = 0;

                        dataService.updateTranscribe(config.models.Transcribe, title, Data, function (statusr, errr) {

                            if (errr != null) {
                                return res.status(200).json({ message: 'success' });
                            } else {

                                return res.status(statusr).json({
                                    message: (errr == null) ? null : errr.message
                                });

                            }

                        });

                    }
                })

            }
        });
    });


    app.get('/admin/:name/downloadFileWithTimeStamp', function (req, res) {
        var audioName = req.params.name;
        var exec = require('child_process').exec;
        var cmd1 = "aws transcribe get-transcription-job --region  us-east-1 --transcription-job-name " + audioName;
        exec(cmd1, function (error1, stdout1, stderr1) {

            if (error1 !== null) {
                return res.status(400).json({ message: 'Error occurred Please try again' });
            } else {

                var obj1 = JSON.parse(stdout1);
                var data = obj1.TranscriptionJob.Transcript.TranscriptFileUri;
                var url = data;
                request({
                    url: url,
                    json: true
                }, function (error, response, body) {

                    if (!error && response.statusCode === 200) {

                        var jsonFullData = JSON.stringify(body);
                        var fileName = 'TS' + audioName + '.txt';
                        res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
                        res.setHeader('Content-type', 'text/plain');
                        res.charset = 'UTF-8';
                        res.write(jsonFullData);
                        res.end();
                    }
                })

            }
        });
    });



    app.get('/admin/byId/:id/amazonDownloadFileWithTimeStamp', function (req, res) {


        var id = req.params.id;

        dataService.getSingleRecord(config.models.AmazonTranscribe, id, function (status, err, result) {

            if (!err && result != null) {

                var data = JSON.stringify(result.data);
                var audioName = result.title;
                var fileName = 'TS' + audioName + '.txt';

                res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
                res.setHeader('Content-type', 'text/plain');
                res.charset = 'UTF-8';
                res.write(data);
                res.end();


            } else {
                res.status(400).json(null);
            }

        });

    });



    app.get('/admin/byId/:id/combineAmazonDownloadFileWithTimeStamp', function (req, res) {
        var id = req.params.id;
        dataService.getSingleRecord(config.models.Transcribe, id, function (status, err, result) {

            if (!err && result != null) {

                var data = JSON.stringify(result.data);
                var audioName = result.title;
                var fileName = 'TS' + audioName + '.txt';

                res.setHeader('Content-disposition', 'attachment; filename=' + fileName);
                res.setHeader('Content-type', 'text/plain');
                res.charset = 'UTF-8';
                res.write(data);
                res.end();


            } else {
                res.status(400).json(null);
            }

        });

    });

    app.post('/admin/pageSelectAction', authorizationAdmin, function (req, res) {

        var modalName = req.body.modalName;
        var ids = req.body.ids;
        var action = req.body.action;
        var bookId = req.body.bookId;

        var ModelObj = require('../models/' + modalName);
        var BookObj = require('../models/book');

        if (action == 'activeAll') {
            var updateData = {
                $set: { status: 1 }
            };
            ModelObj.update({ _id: { $in: ids } },
                updateData,
                { multi: true },
                function (error, result) {
                    if (error) {
                        res.status(400).json({ message: error });
                    } else {
                        res.status(200).json({
                            message: null
                        });
                    }
                });

        } else if (action == 'inactiveAll') {

            var updateData = {
                $set: { status: 0 }
            };

            ModelObj.update({ _id: { $in: ids } },
                updateData,
                { multi: true },
                function (error, result) {
                    if (error) {
                        res.status(400).json({ message: error });
                    } else {
                        res.status(200).json({
                            message: null
                        });
                    }
                });
        } else if (action == 'deleteAll') {
            var updateData = {
                $set: { deleted: 1 }
            };
            ModelObj.update({ _id: { $in: ids } },
                updateData,
                { multi: true },
                function (error, result) {
                    if (error) {
                        return res.status(400).json({ message: error });
                    } else {

                        BookObj.update({ _id: mongoose.Types.ObjectId(bookId) },
                            { pageCount: 0 },

                            function (err, data) {
                                if (err) {
                                    return res.status(400).json({ message: error });
                                } else {
                                    return res.status(200).json({ message: null });

                                }
                            });
                    }
                });
        }
    });

    app.post('/admin/selectAction', authorizationAdmin, function (req, res) {
        var modalName = req.body.modalName;
        var ids = req.body.ids;
        var action = req.body.action;

        var ModelObj = require('../models/' + modalName);

        if (action == 'activeAll') {
            var updateData = {
                $set: { status: 1 }
            };
        } else if (action == 'inactiveAll') {

            var updateData = {
                $set: { status: 0 }
            };
        } else if (action == 'deleteAll') {

            var updateData = {
                $set: { deleted: 1 }
            };
        }
        ModelObj.update({ _id: { $in: ids } },
            updateData,
            { multi: true },
            function (error, result) {
                if (error) {
                    res.status(400).json({ message: error });
                } else {


                    res.status(200).json({
                        message: null

                    });

                }
            });
    });
    app.post('/user/selectAction', authorizationUser, function (req, res) {
        var modalName = req.body.modalName;
        var ids = req.body.ids;
        var action = req.body.action;

        var ModelObj = require('../models/' + modalName);

        if (action == 'activeAll') {
            var updateData = {
                $set: { status: 1 }
            };
        } else if (action == 'inactiveAll') {

            var updateData = {
                $set: { status: 0 }
            };
        } else if (action == 'deleteAll') {

            var updateData = {
                $set: { deleted: 1 }
            };
        }
        ModelObj.update({ _id: { $in: ids } },
            updateData,
            { multi: true },
            function (error, result) {
                if (error) {
                    res.status(400).json({ message: error });
                } else {


                    res.status(200).json({
                        message: null

                    });

                }
            });
    });
    app.get('/admin/transaction', function (req, res) {
        gateway.transaction.sale({
            amount: '15.00',
            paymentMethodNonce: 'nonce-from-the-client',
            customerId: "867045953",
            options: {
                submitForSettlement: true
            }
        }).then(function (result) {
            if (result.success) {
                console.log('Transaction ID: ' + result.transaction.id);
            } else {
                console.error(result.message);
            }
        }).catch(function (err) {
            console.error(err);
        });
    });
    app.get('/admin/createcustomer', function (req, res) {
        gateway.customer.create({
            firstName: "Jen",
            lastName: "Smith",
            company: "Braintree",
            email: "jen@example.com",
            phone: "312.555.1234",
            fax: "614.555.5678",
            website: "www.example.com",
            creditCard: {
                cardholderName: "Jen",
                cvv: "874",
                expirationMonth: "11",
                expirationYear: "2018",
                number: "4111111111111111",
                options: {
                    verifyCard: true
                }
            }
        }, function (err, result) {
            console.log(err);
            console.log(result);
        });

    });

    app.get('/admin/isLoggedIn', authorizationAdmin, function (req, res) {

        res.status(200).json({ message: null });

    });

    app.get('/user/isLoggedIn', authorizationUser, function (req, res) {

        res.status(200).json({ message: null });

    });

    app.get('/google-analytics-api-nodejs', function (req, res) {

        const { google } = require('googleapis');
        var CLIENT_EMAIL = '769793586705-09dilqah46572pefgvn7th7o1obqsgp7.apps.googleusercontent.com';
        var PRIVATE_KEY = 'Cl8VmUu1liq_wqYDIyQ8Zylo';

        const scopes = 'https://www.googleapis.com/auth/analytics.readonly'
        const jwt = new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, scopes)

        async function getData() {
            var VIEW_ID = '72092024';
            const defaults = {
                'auth': jwt,
                'ids': 'ga:' + VIEW_ID,
            }
            const response = await jwt.authorize();
            console.log(response);

            /* custom code goes here, using `response` */
        }

        getData()

    });


};

