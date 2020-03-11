'use strict';
var mongoose = require('mongoose');
var  bcrypt = require('bcrypt-nodejs');
var  mongoosePaginate = require('mongoose-paginate');
var  Role = require('./role');
var  adminPermission = require('./adminPermission');

var adminSchema = mongoose.Schema({
  email: {type: String, required: true, trim: true},
  password: {type: String, required: true},
  name: {type: String, required: true},
  phone: {type: String, required: true},
  forgotPasswordToken: String,
  role: {type: mongoose.Schema.Types.ObjectId, ref: 'Role'},
  image: String,
  otp: String,
  token:String,
  deleted: {type: Number, default: 0},
  status: {type: Number, default: 1},
  created: {type: Date, default: Date.now()},
  modified: {type: Date, default: Date.now()}
});

adminSchema.plugin(mongoosePaginate);


/* generating a hash*/
adminSchema.methods.generateHash = function (password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
adminSchema.methods.validPassword = function (password) {
  if (this.password != undefined) {
    return bcrypt.compareSync(password, this.password);
  } else {
    return false;
  }
};

// create the model for users and expose it to our app
module.exports = mongoose.model('Admin', adminSchema);
