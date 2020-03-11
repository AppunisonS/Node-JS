'use strict';
var mongoose = require('mongoose');
var   mongoosePaginate = require('mongoose-paginate');
var    User = require('./user');
var    Admin = require('./admin');

var transcribeSchema = mongoose.Schema({
    name: {type: String, required: true},
    title: {type: String, required: true},
    language: {type: String, required: true},
    file:{type: String},
    image:{type: String},
    audioname:{type: String},
    userPlanPurchased:{type: mongoose.Schema.Types.ObjectId, ref: 'UserPlanPurchased'},
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    adminId: {type: mongoose.Schema.Types.ObjectId, ref: 'Admin'},
    transcript: {type: String},
    data: {type: Object},
    MediaFileUri: {type: String},
    streamUrl: {type: String},
    type:{type: String},
    speakerIdentificationCheck:{type:Boolean},
    deleted: {type: Number, default: 0},
    status: {type: Number, default: 1},
    created: {type: Date, default: Date.now()},
    modified: {type: Date, default: Date.now()}
});

transcribeSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Transcribe', transcribeSchema);
