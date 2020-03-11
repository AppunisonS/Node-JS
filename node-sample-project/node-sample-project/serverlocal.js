'use strict';
var http = require('http');
var bodyParser = require('body-parser');
var express = require('express');
var port = process.env.PORT || 5558;
var app = express();
var passport = require('passport');
var controllers = require('./controllers');
var mongoose = require('mongoose');
var fs = require('fs');
var config = require('./config/config.js');
var session = require('express-session');

require('./authentication/passport')(passport);

mongoose.Promise = global.Promise;
mongoose.connect(config.mongoUrl, { useMongoClient: true }, function (err) {
      if (err) {
        console.log(err);
        console.error('Could not connect to MongoDB!');
       }
});

app.use(express.static('www'));
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3035');
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
    next();
});


app.set('view engine', 'vash');

app.use(bodyParser.urlencoded({limit: '50mb',extended: true}));
app.use(bodyParser.json({limit: '50mb', extended: true}));


app.use(passport.initialize());
//app.use(session({secret: 'keyboard cat ssshhhhh'}));

console.log('Environment ', app.get('env'));
console.log(port);
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
} else {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
            //error: {}
        });
    });
}

controllers.init(app, passport);
app.set('views', __dirname + '/www');

var server = http.createServer(app);
server.listen(port);
server.timeout = 100;

/*
 const options = {
 ca: fs.readFileSync('/etc/letsencrypt/live/alexa.appunison.in/cert.pem'),
 key: fs.readFileSync('/etc/letsencrypt/live/alexa.appunison.in/privkey.pem'),
 cert: fs.readFileSync('/etc/letsencrypt/live/alexa.appunison.in/fullchain.pem')
 };

 var server = https.createServer(options,app);

 server.listen(port);
 */

