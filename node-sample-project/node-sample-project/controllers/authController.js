'use strict';
var authService = require('../services/authentication');
var dataService = require('../services/dataService');
var mailer = require('../utilities/mailerService');
var config = require('../config/config.js');
var fs = require('fs');
var multer = require('multer');
var authorizationUser = require('../services/authentication').authUserChecker;
var mongoose = require('mongoose');

module.exports = {};
var authController = module.exports;

authController.init = function (app, passport) {

    app.get('/auth/facebook', passport.authenticate('facebook-user-login', { scope: 'email' }));
    app.get('/auth/facebook/callback', function (req, res, next) {

        passport.authenticate('facebook-user-login', { failureRedirect: '/login' }, function (err, user, info) {

            if (err == null && user) {
                authService.createUserToken(user, function (error, token) {
                    if (!error)
                        return res.status(200).json({
                            token: token,
                            name: user.name,
                            lastName: user.lastName,
                            image: user.image,
                            _id: user._id,
                            message: null
                        });
                });
            } else {
                res.status(400).json({ token: null, message: err.message });
            }
        })(req, res, next);

    });
    app.get('/auth/google', passport.authenticate('google-user-login', { scope: 'email' }));
    app.get('/auth/google/callback', function (req, res, next) {

        passport.authenticate('google-user-login', { failureRedirect: '/login' }, function (err, user, info) {

            if (err == null && user) {
                authService.createUserToken(user, function (error, token) {
                    if (!error)
                        return res.status(200).json({
                            token: token,
                            name: user.name,
                            lastName: user.lastName,
                            image: user.image,
                            _id: user._id,
                            message: null
                        });
                });
            } else {
                res.status(400).json({ token: null, message: err.message });
            }
        })(req, res, next);

    });

    app.post('/login', function (req, res, next) {
        if (req.body.userType == 'front') {

            passport.authenticate('local-user-login', function (err, user, info) {
                if (err == null && user) {
                    authService.createUserToken(user, function (error, token) {
                        if (!error)
                            return res.status(200).json({
                                token: token,
                                name: user.name,
                                lastName: user.lastName,
                                image: user.image,
                                _id: user._id,
                                message: null
                            });
                    });
                } else {
                    res.status(400).json({ token: null, message: info.message });
                }

            })(req, res, next);
        } else {

            passport.authenticate('local-admin-login', function (err, user, info) {
                if (!err && user) {
                    authService.createAdminToken(user, function (error, token) {
                        if (!error)
                            res.status(200).json({ token: token, email: user.email, name: user.name, image: user.image, role: user.role.permission, message: null });
                    });
                } else {
                    res.status(401).json({ token: null, message: info.message });
                }
            })(req, res, next);

        }
    });

    app.post('/admin/login', function (req, res, next) {
        passport.authenticate('local-admin-login', function (err, user, info) {
            if (!err && user) {
                authService.createAdminToken(user, function (error, token) {
                    if (!error) {

                        res.status(200).json({ token: token, email: user.email, name: user.name, image: user.image, role: user.role.permission, message: null });
                    }
                });
            } else {
                res.status(401).json({ token: null, message: info.message });
            }
        })(req, res, next);
    });

    app.post('/user/login', function (req, res, next) {
        passport.authenticate('local-user-login', function (err, user, info) {


            var planExpire = false;

            if (info.message == 'planExpire') {
                planExpire = true;
            }

            if (err == null && user) {
                dataService.addOnDetail(user, function (status, er, detail) {
                    if (er == null) {
                        var detailLength = detail.length;
                        for (var i = 0; i < detailLength; i++) {
                            user.plan.permission.speechBoxLimit = user.plan.permission.speechBoxLimit + detail[i].addOn.permission.speechBoxLimit;
                            user.plan.permission.bookLimit = user.plan.permission.bookLimit + detail[i].addOn.permission.bookLimit;
                        }

                        authService.createUserToken(user, function (error, token) {
                            if (!error)
                                return res.status(200).json({
                                    token: token,
                                    name: user.name,
                                    role: user.role,
                                    image: user.image,
                                    _id: user._id,
                                    plan: user.plan,
                                    planExpire: planExpire,
                                    message: null
                                });
                        });
                    } else {
                        authService.createUserToken(user, function (error, token) {
                            if (!error)
                                return res.status(200).json({
                                    token: token,
                                    name: user.name,
                                    role: user.role,
                                    image: user.image,
                                    _id: user._id,
                                    plan: user.plan,
                                    planExpire: planExpire,
                                    message: null
                                });
                        });
                    }
                });
            } else {
                res.status(400).json({ token: null, message: info.message });
            }
        })(req, res, next);
    });

    var storage = multer.diskStorage({ //multers disk storage settings
        destination: function (req, file, cb) {
            cb(null, './www/uploads/admin');
        },
        filename: function (req, file, cb) {
            var datetimestamp = Date.now();
            req.body.image = file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length - 1];
            cb(null, req.body.image);

        }
    });
    var upload = multer({ //multer settings
        storage: storage,
        limits: { fieldSize: 1000 * 1024 * 1024 }

    }).single('image');
    app.post('/user/signUp', function (req, res, next) {
        try {
            upload(req, res, function (err) {
                if (err) {
                    return callback({ status: 400, message: err });
                } else {
                    req.body.password = '123456!@#';
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
                            authService.createUserToken(user, function (err, token) {
                                if (!err)
                                    res.status(200).json({ token: token, message: null, user: user });
                            });
                        } else {

                            res.status(400).json({ token: null, message: info.message });
                        }
                    })(req, res, next);
                }
            });
        } catch (error) {
            return callback({ status: 500, message: 'Unknown internal error.' });
        }

    });

    app.post('/user/frontSignUp', function (req, res, next) {


        passport.authenticate('local-user-adduser', function (err, user, info) {
            if (!err && user) {

                var email = req.body.email;
                var password = req.body.password;
                var name = req.body.name;
                var userBaseUrl = config.userBaseUrl;
                var mailData = { email: user.email, subject: 'Password Details' },
                    data = {
                        templateName: 'OTP Email',
                        baseUrl: userBaseUrl,
                        name: name,
                        password: password,
                        email: email

                    },
                    templateName = "register.vash";
                mailer.sendMail(mailData, data, templateName, false, function (error, responseStatus) {
                    if (error) {
                        console.log('e');
                        console.log(error);
                    }
                });
                authService.createUserToken(user, function (err, token) {
                    if (!err)
                        res.status(200).json({ token: token, message: null, name: user.name, lastName: user.lastName, role: user.role, image: user.image, _id: user._id });
                });
            } else {

                res.status(400).json({ token: null, message: info.message });
            }
        })(req, res, next);
    });
    app.post('/user/frontSignUpNew', function (req, res, next) {
        dataService.findUser(req, function (err, user, info) {
            if (!err && user) {

                return res.status(200).json({ tempUser: user, message: null });
            } else {
                return res.status(400).json({ tempUser: null, message: info.message });
            }

        });

    });


    app.post('/admin/signUp', function (req, res, next) {
        try {
            upload(req, res, function (err) {
                if (err) {
                    return callback({ status: 400, message: err });
                } else {
                    passport.authenticate('local-admin-signup', function (err, user, info) {
                        if (!err && user) {

                            var email = req.body.email;
                            var password = req.body.password;
                            var name = req.body.name;
                            var adminBaseUrl = config.adminBaseUrl;
                            var mailData = { email: user.email, subject: 'Password Details' },
                                data = {
                                    templateName: 'OTP Email',
                                    baseUrl: adminBaseUrl,
                                    name: name,
                                    password: password,
                                    email: email

                                },
                                templateName = "register.vash";
                            mailer.sendMail(mailData, data, templateName, false, function (error, responseStatus) {
                                if (error) {
                                    console.log('e');
                                    console.log(error);
                                }
                            });
                            authService.createAdminToken(user, function (err, token) {
                                if (!err)
                                    res.status(200).json({ token: token, message: null });
                            });
                        } else {

                            res.status(400).json({ token: null, message: info.message });
                        }
                    })(req, res, next);
                }
            });
        } catch (error) {
            return callback({ status: 500, message: 'Unknown internal error.' });
        }

    });


    app.post('/admin/addAdmin', function (req, res, next) {

        passport.authenticate('local-admin-signup', function (err, user, info) {
            if (!err && user) {

                var email = req.body.email;
                var password = req.body.password;
                var name = req.body.name;
                // var otp          = Math.floor(100000 + Math.random() * 900000);
                var adminBaseUrl = config.adminBaseUrl;
                //  passenger.otp    = parseInt(otp);
                var mailData = { email: user.email, subject: 'Password Details' },
                    data = {
                        templateName: 'OTP Email',
                        baseUrl: adminBaseUrl,
                        name: name,
                        password: password,
                        email: email

                    },
                    templateName = "register.vash";
                mailer.sendMail(mailData, data, templateName, false, function (error, responseStatus) {
                    if (error) {
                        console.log('e');
                        console.log(error);
                    }
                });
                authService.createAdminToken(user, function (err, token) {
                    if (!err)
                        res.status(200).json({ token: token, message: null });
                });
            } else {

                res.status(400).json({ token: null, message: info.message });
            }
        })(req, res, next);

    });

    app.get('/', function (req, res) {
        res.render('front');
    });

    app.get('/chat', function (req, res) {

        res.render('chat');

    });

    app.get('/admin', function (req, res) {
        dataService.getInit(config.models.Admin);
        res.render('home');
    });

    app.get('/admin/api/authenticate', authService.isLoggedIn, function (req, res) {
        res.status(200).json({ token: req.decoded, message: 'Token Valid' });
    });


    app.get('/admin/login/:token', function (req, res) {
        var token = req.params.token;
        authService.verifyForgotToken(token, function (error, result) {
            if (error)
                return res.status(error.status || 500).json({
                    code: error.status || 500,
                    message: error.message || 'Unable to process request.'
                });

            res.status(200).json(result);
        });
    });

    app.post('/admin/updateAdmin', function (req, res) {
        var modelName = config.models.Admin;
        try {
            upload(req, res, function (err) {
                if (err) {
                    return res.status(400).json({
                        status: 400,
                        message: err
                    });
                } else {

                    var Admin = require('../models/' + modelName);
                    var data = req.body;
                    if (data.length === 0)
                        return res.status(400).json({
                            status: 400,
                            message: 'Bad request. No record found.'
                        });

                    Admin.findOne({
                        $and: [
                            {
                                email: data.email,
                                deleted: 0
                            }, {
                                '_id': { $ne: mongoose.Types.ObjectId(data._id) }
                            }
                        ]
                    }, function (err, result) {
                        if (!err) {
                            if (result) {
                                return res.status(400).json({
                                    status: 400,
                                    message: 'Email already  Exist'
                                });
                            } else {


                                if (req.body.oldImage != '') {

                                    Unlink('./www/uploads/admin/' + req.body.oldImage, false, function (err) {
                                        if (!err) {
                                            var data = req.body;
                                            var _id = data._id;
                                            delete data._id;
                                            if (data.length === 0)
                                                return res.status(400).json({
                                                    status: 400,
                                                    message: 'Bad request. No record found.'
                                                });
                                            if (_id === undefined)
                                                return res.status(400).json({
                                                    status: 400,
                                                    message: 'Update _id not found.'
                                                });
                                            var Admin = require('../models/' + modelName);

                                            Admin.update({ _id: mongoose.Types.ObjectId(_id) },
                                                data, function (error, response) {
                                                    if (error) {

                                                        return res.status(error.status || 500).json({
                                                            status: error.status || 500,
                                                            message: error.message || 'Unknown internal error.'
                                                        });
                                                    }

                                                    return res.status(200).json(response);
                                                });
                                        }
                                        else {
                                            console.log(err);
                                            return res.status(400).json({
                                                status: 400,
                                                message: err.message || 'File Upload Failed'
                                            });
                                        }
                                    });


                                } else {

                                    var data = req.body;
                                    var _id = data._id;
                                    delete data._id;
                                    if (data.length === 0)
                                        return res.status(400).json({
                                            status: 400,
                                            message: 'Bad request. No record found.'
                                        });
                                    if (_id === undefined)
                                        return res.status(400).json({
                                            status: 400,
                                            message: 'Update _id not found.'
                                        });
                                    var Admin = require('../models/' + modelName);

                                    console.log('dataaa');

                                    Admin.update({ _id: mongoose.Types.ObjectId(_id) },
                                        data, function (error, response) {
                                            console.log(error);
                                            if (error) {

                                                return res.status(error.status || 500).json({
                                                    status: error.status || 500,
                                                    message: error.message || 'Unknown internal error.'
                                                });
                                            }

                                            return res.status(200).json(response);
                                        });

                                }

                            }
                        } else {
                            return res.status(500).json({
                                status: 500,
                                message: 'Unknown internal error.'
                            });
                        }
                    });

                    if (req.body.image != undefined || req.body.image != '') {
                        if (err) {
                            return res.status(400).json({
                                status: 400,
                                message: err
                            });
                        } else {

                        }
                    } else {
                        var data = req.body;
                        var _id = data._id;
                        delete data._id;
                        if (data.length === 0)
                            return res.status(400).json({
                                status: 400,
                                message: 'Bad request. No record found.'
                            });
                        if (_id === undefined)
                            return res.status(400).json({
                                status: 400,
                                message: 'Update _id not found.'
                            });
                        var Admin = require('../models/' + modelName);

                        Admin.findOne({ email: data.email }, function (err, result) {
                            if (!err) {
                                if (result) {
                                    return res.status(400).json({
                                        status: 400,
                                        message: 'Email already  Exist'
                                    });
                                } else {
                                    Admin.update({ _id: mongoose.Types.ObjectId(_id) },
                                        data, function (error, response) {
                                            if (error) {
                                                return res.status(500).json({
                                                    status: 500,
                                                    message: 'Unknown internal error.'
                                                });
                                            }
                                            return res.status(200).json(response);
                                        });
                                }
                            } else {
                                return res.status(500).json({
                                    status: 500,
                                    message: 'Unknown internal error.'
                                });
                            }
                        });
                    }
                }
            });
        } catch (error) {
            return res.status(500).json({
                status: 500,
                message: 'Unknown internal error.'
            });
        }

    });

    app.post('/user/updateUser', authorizationUser, function (req, res) {

        var modelName = config.models.User;
        try {
            upload(req, res, function (err) {
                if (err) {
                    return res.status(400).json({
                        status: 400,
                        message: err
                    });
                } else {

                    var User = require('../models/' + modelName);
                    var data = req.body;
                    data._id = req.decoded.id;
                    if (data.length === 0)
                        return res.status(400).json({
                            status: 400,
                            message: 'Bad request. No record found.'
                        });

                    User.findOne({
                        $and: [
                            {
                                email: data.email
                            }, {
                                '_id': { $ne: mongoose.Types.ObjectId(data._id) }
                            }
                        ]
                    }, function (err, result) {
                        if (!err) {
                            if (result) {
                                return res.status(400).json({
                                    status: 400,
                                    message: 'Email already  Exist'
                                });
                            } else {

                                if (req.body.oldImage != '') {

                                    Unlink('./www/uploads/admin/' + req.body.oldImage, false, function (err) {
                                        if (!err) {
                                            var data = req.body;
                                            var _id = data._id;
                                            delete data._id;
                                            if (data.length === 0)
                                                return res.status(400).json({
                                                    status: 400,
                                                    message: 'Bad request. No record found.'
                                                });
                                            if (_id === undefined)
                                                return res.status(400).json({
                                                    status: 400,
                                                    message: 'Update _id not found.'
                                                });


                                            User.update({ _id: mongoose.Types.ObjectId(_id) },
                                                data, function (error, response) {
                                                    if (error) {

                                                        return res.status(error.status || 500).json({
                                                            status: error.status || 500,
                                                            message: error.message || 'Unknown internal error.'
                                                        });
                                                    }

                                                    return res.status(200).json(response);
                                                });
                                        }
                                        else {
                                            return res.status(400).json({
                                                status: 400,
                                                message: error.message || 'File Upload Failed'
                                            });
                                        }
                                    });

                                } else {

                                    var data = req.body;
                                    var _id = data._id;
                                    delete data._id;
                                    if (data.length === 0)
                                        return res.status(400).json({
                                            status: 400,
                                            message: 'Bad request. No record found.'
                                        });
                                    if (_id === undefined)
                                        return res.status(400).json({
                                            status: 400,
                                            message: 'Update _id not found.'
                                        });
                                    User.update({ _id: mongoose.Types.ObjectId(_id) },
                                        data, function (error, response) {
                                            if (error) {

                                                return res.status(error.status || 500).json({
                                                    status: error.status || 500,
                                                    message: error.message || 'Unknown internal error.'
                                                });
                                            }

                                            return res.status(200).json(response);
                                        });
                                }
                            }
                        } else {
                            return res.status(500).json({
                                status: 500,
                                message: 'Unknown internal error.'
                            });
                        }
                    });
                    if (req.body.image != undefined || req.body.image != '') {
                        if (err) {
                            return res.status(400).json({
                                status: 400,
                                message: err
                            });
                        } else {

                        }
                    } else {
                        var data = req.body;
                        var _id = data._id;
                        delete data._id;
                        if (data.length === 0)
                            return res.status(400).json({
                                status: 400,
                                message: 'Bad request. No record found.'
                            });
                        if (_id === undefined)
                            return res.status(400).json({
                                status: 400,
                                message: 'Update _id not found.'
                            });
                        var User = require('../models/' + modelName);

                        User.findOne({ email: data.email }, function (err, result) {
                            if (!err) {
                                if (result) {
                                    return res.status(400).json({
                                        status: 400,
                                        message: 'Email already  Exist'
                                    });
                                } else {
                                    User.update({ _id: mongoose.Types.ObjectId(_id) },
                                        data, function (error, response) {
                                            if (error) {
                                                return res.status(500).json({
                                                    status: 500,
                                                    message: 'Unknown internal error.'
                                                });
                                            }
                                            return res.status(200).json(response);
                                        });
                                }
                            } else {
                                return res.status(500).json({
                                    status: 500,
                                    message: 'Unknown internal error.'
                                });
                            }
                        });
                    }
                }
            });
        } catch (error) {
            return res.status(500).json({
                status: 500,
                message: 'Unknown internal error.'
            });
        }

    });

    app.post('/admin/updateUser', function (req, res) {
        var modelName = config.models.User;
        try {
            upload(req, res, function (err) {
                if (err) {
                    return res.status(400).json({
                        status: 400,
                        message: err
                    });
                } else {
                    var User = require('../models/' + modelName);
                    var data = req.body;
                    if (data.length === 0)
                        return res.status(400).json({
                            status: 400,
                            message: 'Bad request. No record found.'
                        });
                    User.findOne({
                        $and: [
                            {
                                email: data.email
                            }, {
                                '_id': { $ne: mongoose.Types.ObjectId(data._id) }
                            }
                        ]
                    }, function (err, result) {
                        if (!err) {
                            if (result) {
                                return res.status(400).json({
                                    status: 400,
                                    message: 'Email already  Exist'
                                });
                            } else {

                                if (req.body.oldImage != '') {

                                    Unlink('./www/uploads/admin/' + req.body.oldImage, false, function (err) {
                                        if (!err) {
                                            var data = req.body;
                                            var _id = data._id;
                                            delete data._id;
                                            if (data.length === 0)
                                                return res.status(400).json({
                                                    status: 400,
                                                    message: 'Bad request. No record found.'
                                                });
                                            if (_id === undefined)
                                                return res.status(400).json({
                                                    status: 400,
                                                    message: 'Update _id not found.'
                                                });
                                            var Admin = require('../models/' + modelName);

                                            User.update({ _id: mongoose.Types.ObjectId(_id) },
                                                data, function (error, response) {
                                                    if (error) {

                                                        return res.status(error.status || 500).json({
                                                            status: error.status || 500,
                                                            message: error.message || 'Unknown internal error.'
                                                        });
                                                    }

                                                    return res.status(200).json(response);
                                                });
                                        }
                                        else {
                                            return res.status(400).json({
                                                status: 400,
                                                message: error.message || 'File Upload Failed'
                                            });
                                        }
                                    });

                                } else {

                                    var data = req.body;
                                    var _id = data._id;
                                    delete data._id;
                                    if (data.length === 0)
                                        return res.status(400).json({
                                            status: 400,
                                            message: 'Bad request. No record found.'
                                        });
                                    if (_id === undefined)
                                        return res.status(400).json({
                                            status: 400,
                                            message: 'Update _id not found.'
                                        });
                                    var Admin = require('../models/' + modelName);

                                    User.update({ _id: mongoose.Types.ObjectId(_id) },
                                        data, function (error, response) {
                                            if (error) {

                                                return res.status(error.status || 500).json({
                                                    status: error.status || 500,
                                                    message: error.message || 'Unknown internal error.'
                                                });
                                            }

                                            return res.status(200).json(response);
                                        });
                                }
                            }
                        } else {
                            return res.status(500).json({
                                status: 500,
                                message: 'Unknown internal error.'
                            });
                        }
                    });

                    if (req.body.image != undefined || req.body.image != '') {
                        if (err) {
                            return res.status(400).json({
                                status: 400,
                                message: err
                            });
                        } else {

                        }
                    } else {
                        var data = req.body;
                        var _id = data._id;
                        delete data._id;
                        if (data.length === 0)
                            return res.status(400).json({
                                status: 400,
                                message: 'Bad request. No record found.'
                            });
                        if (_id === undefined)
                            return res.status(400).json({
                                status: 400,
                                message: 'Update _id not found.'
                            });
                        var User = require('../models/' + modelName);

                        User.findOne({ email: data.email }, function (err, result) {
                            if (!err) {
                                if (result) {
                                    return res.status(400).json({
                                        status: 400,
                                        message: 'Email already  Exist'
                                    });
                                } else {
                                    User.update({ _id: mongoose.Types.ObjectId(_id) },
                                        data, function (error, response) {
                                            if (error) {
                                                return res.status(500).json({
                                                    status: 500,
                                                    message: 'Unknown internal error.'
                                                });
                                            }
                                            return res.status(200).json(response);
                                        });
                                }
                            } else {
                                return res.status(500).json({
                                    status: 500,
                                    message: 'Unknown internal error.'
                                });
                            }
                        });
                    }
                }
            });
        } catch (error) {
            return res.status(500).json({
                status: 500,
                message: 'Unknown internal error.'
            });
        }

    });

    app.post('/user/update', function (req, res) {
        var modelName = config.models.User;
        var data = req.body;
        var _id = data._id;
        delete data._id;
        if (data.length === 0)
            return res.status(400).json({
                status: 400,
                message: 'Bad request. No record found.'
            });
        if (_id === undefined)
            return res.status(400).json({
                status: 400,
                message: 'Update _id not found.'
            });
        var User = require('../models/' + modelName);

        User.findOne({
            $and: [
                {
                    email: data.email, deleted: 0
                }, {
                    '_id': { $ne: mongoose.Types.ObjectId(_id) }
                }
            ]
        }, function (err, result) {
            if (!err) {
                if (result) {
                    return res.status(400).json({
                        status: 400,
                        message: 'Email already  Exist'
                    });
                } else {
                    User.update({ _id: mongoose.Types.ObjectId(_id) },
                        data, function (error, response) {
                            if (error) {
                                return res.status(500).json({
                                    status: 500,
                                    message: 'Unknown internal error.'
                                });
                            }
                            return res.status(200).json(response);
                        });
                }
            } else {
                return res.status(500).json({
                    status: 500,
                    message: 'Unknown internal error.'
                });
            }
        });

    });
    app.post('/admin/update', function (req, res) {
        var modelName = config.models.Admin;
        var data = req.body;
        var _id = data._id;
        delete data._id;
        if (data.length === 0)
            return res.status(400).json({
                status: 400,
                message: 'Bad request. No record found.'
            });
        if (_id === undefined)
            return res.status(400).json({
                status: 400,
                message: 'Update _id not found.'
            });
        var Admin = require('../models/' + modelName);
        Admin.findOne({
            $and: [
                {
                    email: data.email, deleted: 0
                }, {
                    '_id': { $ne: mongoose.Types.ObjectId(_id) }
                }
            ]
        }, function (err, result) {
            if (!err) {
                if (result) {
                    return res.status(400).json({
                        status: 400,
                        message: 'Email already  Exist'
                    });
                } else {
                    Admin.update({ _id: mongoose.Types.ObjectId(_id) },
                        data, function (error, response) {
                            if (error) {
                                return res.status(500).json({
                                    status: 500,
                                    message: 'Unknown internal error.'
                                });
                            }
                            return res.status(200).json(response);
                        });
                }
            } else {
                return res.status(500).json({
                    status: 500,
                    message: 'Unknown internal error.'
                });
            }
        });

    });

    app.post('/admin/forgotpassword', function (req, res) {

        var email = req.body.email;
        if (email === undefined || email === '')
            return res.status(400).json({ code: 400, message: 'Invalid request.' });

        authService.forgotPassword(req, res, function (error) {

            return res.status(error.status || 500).json({
                code: error.status || 500,
                message: error.message || 'Unable to process request.'
            });


        });
    });

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
    };

};

