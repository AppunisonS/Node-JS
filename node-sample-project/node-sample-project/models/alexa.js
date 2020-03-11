'use strict';
var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var User = require('./user');

var alexaSchema = mongoose.Schema({
    title: {type: String, required: true},
    subTitle:{type: String, required: true},
    auther: {type: String, required: true},
    description:{type: String, required: true},
    fileName: {type: String, required: true},
    audioName:{type: String, required: true},
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    size: {type: String},
    fileFormat: {type: String},
    sampleRate: {type: String},
    viseme: {type: Boolean},
    word: {type: Boolean},
    sentence: {type: Boolean},
    language: {type: String},
    gender: {type: String},
    text: {type: String},
    deleted: {type: Number, default: 0},
    status: {type: Number, default: 1},
    optionsModel:{type:Array},
    created: {type: Date, default: Date.now()},
    modified: {type: Date, default: Date.now()}
});

alexaSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Alexa', alexaSchema);
