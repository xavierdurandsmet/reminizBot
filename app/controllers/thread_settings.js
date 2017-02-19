const request = require('request')

const FACEBOOK_BASE_URL = "https://graph.facebook.com/v2.6/me/"
const THREAD_SETTINGS_URL = `${FACEBOOK_BASE_URL}thread_settings`

module.exports = function() {
  console.log("EXECUTING THREAD SETTINGS")
  addPersistentMenu()
  addGetStartedButton()
}

// Add a POSTBACK button for a user's first interaction
function addGetStartedButton() {
  request({
    url: THREAD_SETTINGS_URL,
    qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
    method: "POST",
    json: {
      setting_type: "call_to_actions",
      thread_state: "new_thread",
      call_to_actions:[{
        payload: "GET_STARTED" /* CHANGE HERE */
      }]
    }
  }, function(error, response) {
    if (error || response.body.error) {
      console.log("Error adding Get Started button")
    } else {
      console.log("Get started button successfully added")
    }
  })
}

function removeGetStartedButton() {
  request({
    url: THREAD_SETTINGS_URL,
    qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
    method: "DELETE",
    json: {
      setting_type: "call_to_actions",
      thread_state: "new_thread"
    }
  }, function(error, response) {
    if (error || response.body.error) {
      console.log("Error removing Get Started button")
    } else {
      console.log("Get started button successfully removed")
    }
  })
}


// Add a menu on the left, with buttons linking to main parts
function addPersistentMenu() {
  request({
    url: THREAD_SETTINGS_URL,
    qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
    method: "POST",
    json: {
      setting_type: "call_to_actions",
      thread_state: "existing_thread",
      call_to_actions: [{
        type:"postback",
        title:"Choose TV Channel ✔︎",
        payload: "TV_CHANNELS"
      }, {
        type:"postback",
        title:"My favorites ❤️",
        payload:"FAVORITES"
      }, {
        type:"postback",
        title:"Preferences ⚙",
        payload: "PREFERENCES"
      }
    ]
    }
  }, function (error, response, body) {
    if (error || response.body.error) {
      console.log('Could not add persistent menu')
    } else {
      console.log('Successfully added persistent menu')
    }
  })
}

function removePersistentMenu() {
  request({
    url: THREAD_SETTINGS_URL,
    qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
    method: "DELETE",
    json: {
      setting_type:"call_to_actions",
      thread_state:"existing_thread"
    }
  }, function(error, response, body) {
    if (error || response.body.error) {
      console.log("Couldn't delete persistent menu")
    } else {
      console.log("Successfully deleted persistent menu")
    }
  })
}
