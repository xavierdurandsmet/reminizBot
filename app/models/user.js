const mongoose = require('mongoose')
const request = require('request')

var UserSchema = new mongoose.Schema({
  fb_id: { type: String, index: true, unique: true },
  fb_profile_pic: String,
  fb_first_name: String,
  fb_last_name: String,
  fb_gender: String,
  fb_timezone: Number,
  fb_locale: String,
  favorites: [String], // not completely sure what to do there
  notification: { type: Boolean, default: false }
}, { timestamps: true });

// Find the user with this fb Id, create it if doesn't exist, and return it
UserSchema.statics.findOrCreate = function(facebookId) {
  const that = this
  if (!facebookId) {
    console.log('Missing facebook Id')
  }
  // Look up if the user exists
  this.findOne({ fb_id: facebookId }, function(error, currentUser) {
    if (error) {
      console.log('there was an error')
      return error
    }
    if (!currentUser) {
      console.log('no user found, creating one')
      // If no user, request to facebook graph API
      getFacebookProfile(facebookId, function(fbProfile) {
        if (!fbProfile) {
          return null
        }
        console.log('successfully found user profile')
        // Create the new user with fb profile and return it
        const newUser = new that({
          fb_id: facebookId,
          fb_first_name: fbProfile.first_name,
          fb_last_name: fbProfile.last_name,
          fb_gender: fbProfile.gender,
          fb_locale: fbProfile.locale,
          fb_profile_pic: fbProfile.profile_pic,
          fb_timezone: fbProfile.timezone
        })
        newUser.save(function (err, user) {
          if (err || !user) {
            return null
          }
          console.log('successfully saved the user', user)
          return user
        })
      })
    }
    // Return the user if it exists
    if (currentUser) {
      console.log('found the user', currentUser)
      return currentUser
    }
  })
}

// Get the Facebook profile from the Graph API, and print it
function getFacebookProfile(senderId, callback) {
  console.log('getting facebook profile')
  if (!senderId) {
    console.log('Missing senderId')
  }
  request(`https://graph.facebook.com/v2.6/${senderId}?access_token=${process.env.PAGE_ACCESS_TOKEN}`, function (error, response, body) {
    console.log('request to graph api')
    const fbProfile = JSON.parse(body)
    if (error || body.error) {
      console.log('error')

      return callback(null)
    }
    console.log('logging fb profile', fbProfile)

    return callback(fbProfile)
  })
}


module.exports = mongoose.model("User", UserSchema);

