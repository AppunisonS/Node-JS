'use strict';
var jwt = require('jsonwebtoken');
var jwtConfig = require('../config/config');
var Admin = require('../models/admin');
var User = require('../models/user');
var mailer = require('../utilities/mailerService');
var mongoose = require('mongoose');
    _ = require('lodash');



exports.userTranslateLimit = function (req, res, next) {

    var planStartDate = new Date(req.decoded.userPlanPurchased.start);
    var userPlanPurchased = req.decoded.userPlanPurchased._id;
    var userId = req.decoded.id;
    var ModelObj = require('../models/translate');

    ModelObj.count({
        $and: [
            {
                created: {
                    "$gte": new Date(planStartDate)
                }
            },
            {
                deleted: 0
            },
            {
                userId: mongoose.Types.ObjectId(userId)
            },
            {
                userPlanPurchased: mongoose.Types.ObjectId(userPlanPurchased)
            }
        ]
    }).exec(function (err, result) {

            if (err) {

                return res.status(400).json({ status: 400, message: err });
            } else {
                if (result >= req.decoded.plan.permission.translateLimit) {
                    return res.status(400).json({ status: 400, message: 'Your Current Plan  Do Not Allow  More Than ' + req.decoded.plan.permission.translateLimit + ' Translate . Please Upgrade Your Plan' });
                } else {
                    next();
                }
            }

        });
}; 
        

exports.userBookLimit = function (req, res, next) {

    var planStartDate = new Date(req.decoded.userPlanPurchased.start);


    var userId = req.decoded.id;
    var userPlanPurchased = req.decoded.userPlanPurchased._id;

    var ModelObj = require('../models/book');

    ModelObj.count({
        $and: [
            {
                created: {
                    "$gte": new Date(planStartDate)

                }
            },
            {
                deleted: 0
            },
            {
                userId: mongoose.Types.ObjectId(userId)
            },
            {
                userPlanPurchased: mongoose.Types.ObjectId(userPlanPurchased)
            }
        ]
    }).exec(function (err, result) {
            if (err) {

                return res.status(400).json({ status: 400, message: err });
            } else {

                if (result >= req.decoded.plan.permission.bookLimit) {

                    return res.status(400).json({ status: 400, message: 'Your Current Plan  Do Not Allow  More Than ' + req.decoded.plan.permission.bookLimit + ' Books. Please Upgrade Your Plan' });


                } else {
                    next();

                }

            }

        });

}; 



exports.userDictateLimit = function (req, res, next) {

    var planStartDate = new Date(req.decoded.userPlanPurchased.start);
    var planEndDate = new Date(req.decoded.userPlanPurchased.endDate);
    var userId = req.decoded.id;
    var userPlanPurchased = req.decoded.userPlanPurchased._id;
    var ModelObj = require('../models/dictate');
    ModelObj.count({
        $and: [
            {
                created: {
                    "$gte": new Date(planStartDate),
                    "$lte": new Date(planEndDate)
                }
            },
            {
                deleted: 0
            },
            {
                userId: mongoose.Types.ObjectId(userId)
            },
            {
                userPlanPurchased: mongoose.Types.ObjectId(userPlanPurchased)
            }
        ]
    }).exec(function (err, result) {

            if (err) {

                return res.status(400).json({ status: 400, message: err });
            } else {


                if (result >= req.decoded.plan.permission.dictateLimit) {

                    checkAddOns(userPlanPurchased, function (error, addOns) {
                        if (!error) {

                            var totalLimit = req.decoded.plan.permission.dictateLimit + addOns.dictateLimit;

                            if (result >= totalLimit) {
                                return res.status(400).json({ status: 400, message: 'Your Current Plan And AddOn Do Not Allow  More Than ' + totalLimit + ' Dictate . Please Upgrade Your Plan Or Add  AddOn' });
                            } else {

                                next();
                            }
                        } else {
                            return res.status(400).json({ status: 400, message: error });

                        }

                    });

                } else {
                    next();

                }

            }

        });

}; 



exports.userTranscribeLimit = function (req, res, next) {
  
    var planStartDate  = new Date(req.decoded.userPlanPurchased.start);
    var planEndDate  = new Date(req.decoded.userPlanPurchased.endDate);
 
    var userId = req.decoded.id;
    var userPlanPurchased = req.decoded.userPlanPurchased._id;


    var ModelObj = require('../models/transcribe');

    ModelObj.count({
        $and : [
            {
              created: {
                "$gte": new Date(planStartDate),
                "$lte": new Date(planEndDate)
              }
            },
            {
              deleted:0
            },
            {
                userId:mongoose.Types.ObjectId(userId)
            },
            {
                userPlanPurchased:mongoose.Types.ObjectId(userPlanPurchased)
            }
          ]
       }).exec(function (err, result) {
        if (err) {

            return  res.status(400).json({status: 400, message: err});
        }else { 

            if(result >= req.decoded.plan.permission.transcribeLimit){

                checkAddOns(userPlanPurchased, function (error, addOns) {
                    if (!error){

                      var totalLimit =  req.decoded.plan.permission.transcribeLimit + addOns.transcribeLimit;
                      if(result >= totalLimit){
                             return  res.status(400).json({status: 400, message: 'Your Current Plan And AddOn Do Not Allow  More Than ' + totalLimit + ' Transcribes . Please Upgrade Your Plan Or Add AddOn'});
                          }else{

                            next();
                          }
                    }else{
                        return  res.status(400).json({status: 400, message: error});
         
                    }
    
                });

               }else{
                next();

              }

      }
  
      });   
}; 



        


exports.authUserChecker = function (req, res, next) {

    if (req.headers) {
        var token = req.headers.authorization || req.body.token || req.query.token || req.headers['x-access-token'];
        try {
            jwt.verify(token, jwtConfig.superJwtSecretUser, function (err, decoded) {
                if (err) {
                    //  logger.stream.write({error: err});
                  ;
                    return res.status(401).json({code: 401, message: 'Your session has been expired.',data:'expired'});
                }else{  

                    User.findOne({_id: decoded.id,token:token}, function(error, user) {

                       if (error) {
                            
                            return  res.status(401).json({status: 401, message: 'Your session has been expired.'});
                        }
                        if (user) { 

                            req.decoded = decoded;
                            req.decoded.token = token;
                            next();
                
                      } else {
                            return  res.status(401).json({status: 401, message: 'Your session has been expired.'});
                        }
                    });

                }
            });
        } catch (e) {
            //  logger.stream.write({error: e});
            return res.status(401).json({code: 401, message: 'Invalid token'});
        }
    } else {
        return res.status(401).json({code: 401, message: 'Invalid token'});
    }
};

exports.authAdminChecker = function (req, res, next) {
    if (req.headers) {
        var token = req.headers.authorization || req.body.token || req.query.token || req.headers['x-access-token'];
        try {
            jwt.verify(token, jwtConfig.superJwtSecretAdmin, function (err, decoded) {
                if (err) {
                    //  logger.stream.write({error: err});
                    return res.status(err.status || 401).json({code: err.status || 401, message: 'Your session has been expired.',data:'expired'});
                }else{  

                    Admin.findOne({_id: decoded.id,token:token}, function(error, admin) {

                       if (error) {
                         
                            return  res.status(401).json({status: 401, message: 'Your session has been expired.'});
                        }
                        if (admin) { 

                            req.decoded = decoded;
                            req.decoded.token = token;
                            next();
                
                      } else {
                            return  res.status(401).json({status: 401, message: 'Your session has been expired.'});
                        }
                    });

                }
                
              
            });
        } catch (e) {
            //  logger.stream.write({error: e});
            return res.status(401).json({code: 401, message: 'Invalid token'});
        }
    } else {
        return res.status(401).json({code: 401, message: 'Invalid tokennn'});
    }
};




exports.createUserToken = function (user, callback) {
    var token = jwt.sign({
        email: user.email,
        name: user.name,
        id: user._id,
        plan: user.plan,
        userPlanPurchased:user.userPlanPurchased,
    }, jwtConfig.superJwtSecretUser, {
        expiresIn: jwtConfig.expJwtMin
    });
    User.findByIdAndUpdate({_id: user._id}, {token: token}, {upsert: true}).exec();
    return callback(null, token);
};




function createToken(user, callback) {
    var token = jwt.sign({
        email: user.email,
        name: user.name,
        id: user._id
    }, jwtConfig.superJwtSecretUser, {
        expiresIn: jwtConfig.expJwtMin
    });
    return callback(null, token);
};

exports.createAdminToken = function (user, callback) {
    var token = jwt.sign({
        email: user.email,
        name: user.name,
        id: user._id,
        role:user.role.permission
    }, jwtConfig.superJwtSecretAdmin, {
        expiresIn: jwtConfig.expJwtMin
    });
    Admin.findByIdAndUpdate({_id: user._id}, {token: token}, {upsert: true}).exec();
    return callback(null, token);
};


exports.alexaAuthChecker = function (req, res, next) {

    if (req.query.token) {
        var token = req.headers.authorization || req.body.token || req.query.token || req.headers['x-access-token'];
        try {
            jwt.verify(token, jwtConfig.superJwtSecretUser, function (err, decoded) {
                if (err) {
                   
                  
                    return res.status(err.status || 500).json({code: err.status || 500, message: 'Your session has been expired.',data:'expired'});
                }
                req.decoded = decoded;
                req.decoded.token = token;
              
                next();
            });
        } catch (e) {

            return res.status(401).json({code: 401, message: 'Invalid token'});
        }
    } else {
      
        return res.status(401).json({code: 401, message: 'Invalid token'});
    }
};

exports.createAlexaToken = function (user, callback) {
    var token = jwt.sign({
        email: user.email,
        name: user.name,
        id: user._id,
        status:user.status
    }, jwtConfig.superJwtSecretUser, {
        expiresIn: jwtConfig.expires_in_seconds
    });
    User.findByIdAndUpdate({_id: user._id}, {alexaToken: token}, {upsert: true}).exec();
    return callback(null, token);
};

