'use strict';
var mongoose = require('mongoose');
var   mongoosePaginate = require('mongoose-paginate');
var    User = require('./user');
var    Admin = require('./admin');
var    UserPlanPurchased = require('./userPlanPurchased');


var translateSchema = mongoose.Schema({
    plainText: {type: String, required: true},
    text: {type: String, required: true},
    googleLanguage: {type: String, required: true},
    userPlanPurchased:{type: mongoose.Schema.Types.ObjectId, ref: 'UserPlanPurchased'},
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    adminId: {type: mongoose.Schema.Types.ObjectId, ref: 'Admin'},
    textLength: {type: Number,default: 0},
    deleted: {type: Number, default: 0},
    status: {type: Number, default: 1},
    created: {type: Date, default: Date.now()},
    modified: {type: Date, default: Date.now()}
});

translateSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Translate', translateSchema);
