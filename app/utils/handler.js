const request = require('request');
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const dashbot = require('dashbot')(process.env.DASHBOT_API_KEY).facebook;

module.exports = {
    reply: reply,
    sendNextStepMessage: sendNextStepMessage
}

function reply (senderId, response, cb) { // Send a response to user
  let messageData = {};
  if (typeof (response) === 'string') {
    messageData.text = response;
  } else {
    messageData = response;
  }
  const requestData = {
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: {
      recipient: { id: senderId },
      message: messageData
    }
  };
  request(requestData, function (error, response, body) {
    dashbot.logOutgoing(requestData, response.body);
    if (error) {
      console.log('Error sending messages: ', error);
    } else if (response.body.error) {
      console.log('Error: ', response.body.error);
    }
    return cb && cb(null, body);
  });
}

// Generic follow up message
function sendNextStepMessage (senderId) {
  let nextStepMessage = {
    text: 'What should we do now?',
    quick_replies: [
      {
        'content_type': 'text',
        'title': 'TV Channels 📺',
        'payload': 'TV_CHANNELS'
      },
      {
        'content_type': 'text',
        'title': 'My Favorites ❤️',
        'payload': 'FAVORITES'
      }
    ]
  };
  setTimeout(function () {
    reply(senderId, nextStepMessage);
  }, 1000);
}