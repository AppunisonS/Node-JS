'use strict';
module.exports.init = function (app, passport) {
    require('./authController').init(app, passport);
    require('./adminController').init(app, passport);
    require('./adminLanguageRegionController').init(app);
    require('./userController').init(app, passport);
    require('./adminAlexaPollyController').init(app);
    require('./adminVoiceController').init(app);
    require('./lexiconController').init(app);
    require('./roleController').init(app);
    require('./characterLimitController').init(app);
    require('./questionAnswerController').init(app);
    require('./bookController').init(app);
    require('./userManualController').init(app);
    require('./audioInstructionsController').init(app);
    require('./planController').init(app);
    require('./transcribeController').init(app);
    require('./googleTranscribeController').init(app);
    require('./googleController').init(app);
    require('./gTranscribeController').init(app);
    require('./ibmWatsonController').init(app);
    require('./vocabularyController').init(app);

};
