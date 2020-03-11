'use strict';
var mongoose = require('mongoose'),
    mongoosePaginate = require('mongoose-paginate');

var transcribeVocabularySchema = mongoose.Schema({
    name: {type: String, required: true},
    languageCode: {type: String, required: true},
    image: {type: String, required: true},
    deleted: {type: Number, default: 0},
    status: {type: Number, default: 1},
    created: {type: Date, default: Date.now()},
    modified: {type: Date, default: Date.now()}
});




transcribeVocabularySchema.plugin(mongoosePaginate);

// create the model for LanguageVoice and expose it to our app
module.exports = mongoose.model('TranscribeVocabulary', transcribeVocabularySchema);


