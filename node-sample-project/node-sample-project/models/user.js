'use strict';
var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var mongoosePaginate = require('mongoose-paginate');
var Plan = require('./plan');
var UserPlanPurchased = require('./userPlanPurchased');

var userSchema = mongoose.Schema({
    name: {type: String, required: true},
    lastName: {type: String, required: true},
    email: {type: String, required: true},
    plan: {type: mongoose.Schema.Types.ObjectId, ref: 'Plan'},
    userPlanPurchased: {type: mongoose.Schema.Types.ObjectId, ref: 'UserPlanPurchased'},
    password: String,
    image: String,
    token: String,
    otp:{type: String},
    deleted: {type: Number, default: 0},
    status: {type: Number, default: 1},
    created: {type: Date, default: Date.now()},
    modified: {type: Date, default: Date.now()}
});

userSchema.plugin(mongoosePaginate);


/* generating a hash*/
userSchema.methods.generateHash = function (password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function (password) {
    if (this.password != undefined) {
        return bcrypt.compareSync(password, this.password);
    } else {
        return false;
    }
};


// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);
