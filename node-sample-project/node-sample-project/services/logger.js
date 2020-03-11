var winston = require('winston');
require('winston-mongodb').MongoDB;
var config     = require('../config/config.js');

winston.emitErrs = true;

var logger = new winston.Logger({
    transports: [
        new (winston.transports.MongoDB)({
            db: config.mongoUrl,
            collection: 'error-log',
            storeHost: true,
            level: 'error'
        }),
        new winston.transports.File({
            level: 'error',
            filename: './logs/all-logs.log',
            handleExceptions: true,
            json: true,
            maxsize: 5242880, //5MB
            colorize: true
        })
    ],
    exitOnError: false
});

module.exports = logger;

module.exports.stream = {
    write: function(message, encoding){
        logger.error(message);
    }
};

