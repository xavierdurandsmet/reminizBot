const mongoose = require('mongoose');
const request = require('request');

var UserSchema = new mongoose.Schema({
  facebook_id: { type: String, index: true, unique: true },
  details: {
    profile_pic: String,
    first_name: String,
    last_name: String,
    gender: String,
    email: String,
    timezone: Number,
    locale: String,
    is_payment_enabled: Boolean
  },
  favorite_actors: [String], // not completely sure what to do there
  notification: {
    isActive: { type: Boolean, default: false },
  }
}, { timestamps: true });


// TODO
// Function to create user
