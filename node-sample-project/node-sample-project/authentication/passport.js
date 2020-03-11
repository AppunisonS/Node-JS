'use strict';
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuthStrategy;
var Admin = require('../models/admin');
var User = require('../models/user');
var config = require('../config/config');
// expose this function to our app using module.exports
module.exports = function (passport) {
    passport.serializeUser(function (user, done) {
        done(null, user);
    });
    passport.deserializeUser(function (user, done) {
        done(null, user);
    });

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-admin-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    },

        function (req, email, password, done) {
            // asynchronous
            // User.findOne wont fire unless data is sent back
            process.nextTick(function () {

                // find a user whose email is the same as the forms email
                // we are checking to see if the user trying to login already exists
                Admin.findOne({ 'email': email, deleted: 0 }, function (err, user) {
                    // if there are any errors, return the error
                    if (err)
                        return done(err);

                    // check to see if theres already a user with that email
                    if (user) {
                        return done(null, false, { message: 'That email is already taken.' });
                    } else {

                        // if there is no user with that email
                        // create the user
                        var newUser = new Admin();
                        // set the user's local credentials
                        newUser.email = email;
                        newUser.name = (req.body.name) ? req.body.name : '';
                        newUser.image = (req.body.image) ? req.body.image : '';
                        newUser.phone = (req.body.phone) ? req.body.phone : '';
                        newUser.role = (req.body.role) ? req.body.role : '';
                        newUser.password = newUser.generateHash(password);
                        console.log('newUser');
                        console.log(newUser);
                        // save the user
                        saveUser(newUser, done);
                    }

                });

            });

        }));



    passport.use('facebook-user-login', new FacebookStrategy({
        clientID: config.facebook_api_key,
        clientSecret: config.facebook_api_secret,
        callbackURL: config.callback_url,
        profileFields: ['id', 'displayName', 'email', 'photos']
    },
        function (accessToken, refreshToken, profile, done) { // callback with email and password from our form

            // find a user whose email is the same as the forms email
            // we are checking to see if the user trying to login already exists


            User.findOne({ email: profile._json.email, status: 1, deleted: 0 }).

                //  lean().
                exec(function (err, user) {
                    console.log(user);
                    if (err)
                        return done(err);

                    if (!user) {

                        user = new User({
                            name: profile._json.name,
                            email: profile._json.email,
                            lastName: profile._json.name

                        });
                        user.save(function (err) {
                            if (err) console.log(err);
                            return done(err, user);
                        });
                    } else {
                        //found user. Return
                        return done(err, user);
                    }



                });

        }));



    passport.use('google-user-login', new FacebookStrategy({
        clientID: config.facebook_api_key,
        clientSecret: config.facebook_api_secret,
        callbackURL: config.callback_url,
        profileFields: ['id', 'displayName', 'email', 'photos']
    },
        function (token, tokenSecret, profile, done) { // callback with email and password from our form

            // find a user whose email is the same as the forms email
            // we are checking to see if the user trying to login already exists


            User.findOne({ email: profile._json.email, status: 1, deleted: 0 }).

                //  lean().
                exec(function (err, user) {
                    console.log(user);
                    if (err)
                        return done(err);

                    if (!user) {

                        user = new User({
                            name: profile._json.name,
                            email: profile._json.email,
                            lastName: profile._json.name

                        });
                        user.save(function (err) {
                            if (err) console.log(err);
                            return done(err, user);
                        });
                    } else {
                        //found user. Return
                        return done(err, user);
                    }



                });

        }));





    // =========================================================================
    // LOCAL USER SIGNUP ============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-user-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    },
        function (req, email, password, done) { // callback with email and password from our form

            // find a user whose email is the same as the forms email
            // we are checking to see if the user trying to login already exists
            User.findOne({ email: email, status: 1, deleted: 0 }).

                //  lean().
                exec(function (err, user) {
                    if (err)
                        return done(err);

                    if (!user)
                        return done(null, false, { message: 'Email not exists in our system or user deactivate from the system.' }); // req.flash is the way to set flashdata using connect-flash

                    if (!user.validPassword(password))
                        return done(null, false, { message: 'Oops! Wrong password.' }); // create the loginMessage and save it to session as flashdata

                    return done(null, user, { message: 'Successs' });
                });

        }));




    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-admin-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    },
        function (req, email, password, done) { // callback with email and password from our form

            // find a user whose email is the same as the forms email
            // we are checking to see if the user trying to login already exists
            Admin.findOne({ 'email': email, status: 1, deleted: 0 })
                .populate({ path: 'role', select: 'permission' })
                .exec(function (err, user) {
                    console.log(user);
                    // if there are any errors, return the error before anything else
                    if (err)
                        return done(err);

                    // if no user is found, return the message
                    if (!user)
                        return done(null, false, { message: 'Email not exists in our system or user deactivate from the system.' }); // req.flash is the way to set flashdata using connect-flash
                    //console.log(user);
                    // if the user is found but the password is wrong

                    if (!user.validPassword(password))
                        return done(null, false, { message: 'Oops! Wrong password.' }); // create the loginMessage and save it to session as flashdata
                    // all is well, return successful user
                    return done(null, user);
                });

        }));




    passport.use('local-alexa-auth-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true // allows us to pass back the entire request to the callback
    },

        function (req, email, password, done) { // callback with email and password from our form

            // find a user whose email is the same as the forms email
            // we are checking to see if the user trying to login already exists
            User.findOne({ 'email': email, deleted: 0 }, function (err, user) {
                // if there are any errors, return the error before anything else

                if (err)
                    return done(err);

                // if no user is found, return the message
                if (!user)
                    return done(null, false, { message: 'Email not exists in our system' }); // req.flash is the way to set flashdata using connect-flash
                //console.log(user);
                // if the user is found but the password is wrong

                if (user.status == 0)
                    return done(null, false, { message: 'your account is deactivated please activate your account' });

                if (!user.validPassword(password))
                    return done(null, false, { message: 'Oops! Wrong password.' }); // create the loginMessage and save it to session as flashdata
                // all is well, return successful user
                return done(null, user);
            });

        }));

    function saveUser(user, done) {
        user.save(function (err) {
            if (err)
                throw err;
            return done(null, user);
        });
    }
};
