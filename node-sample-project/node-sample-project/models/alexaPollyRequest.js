'use strict';
var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var User = require('./user');
var UserPlanPurchased = require('./userPlanPurchased');

var alexaPollyRequestSchema = mongoose.Schema({
    fileNameBy: {type: String, required: true},
    fileName: {type: String, required: true},
    checkFileName: {type: String},
    audioName:{type: String, required: true},
    userPlanPurchased:{type: mongoose.Schema.Types.ObjectId, ref: 'UserPlanPurchased'},
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    checkFile: {type: Boolean},
    activeTab: {type: String},
    size: {type: String},
    fileFormat: {type: String},
    speakingRate: {type: Number},
    pitch: {type: Number},
    sampleRate: {type: String},
    viseme: {type: Boolean},
    word: {type: Boolean},
    sentence: {type: Boolean},
    language: {type: String},
    gender: {type: String},
    texthtml: {type: String},
    plainText:{type: String},
    ssmlText:{type: String},
    uploadFileText:{type: String},
    htmlTossmlText: {type: String},
    googleLanguage: {type: String},
    translateText: {type: String},
    type: {type: String},
    speechType: {type: String},
    textLength: {type: Number,default: 0},
    deleted: {type: Number, default: 0},
    status: {type: Number, default: 1},
    optionsModel:{type:Array},
    created: {type: Date, default: Date.now()},
    modified: {type: Date, default: Date.now()}
});

alexaPollyRequestSchema.plugin(mongoosePaginate);

// create the model for PollyLanguageRegion and expose it to our app
module.exports = mongoose.model('AlexaPollyRequest', alexaPollyRequestSchema);
