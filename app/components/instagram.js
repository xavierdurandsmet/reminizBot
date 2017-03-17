const request = require('request');
const messageTemplate = require('../utils/messageTemplate');
const errorChecker = require('../utils/errorChecker');
const handler = require('../utils/handler');

module.exports = {
    sendInstagramFeed: sendInstagramFeed
}

function sendInstagramFeed (senderId, instagramHandle) {
  if (instagramHandle === 'None') {
    handler.reply(senderId, 'Sorry, there was an error with the Instagram feed...', function () {
      handler.sendNextStepMessage(senderId);
    });
  } else {
    let elements = [];
    request(`http://www.instagram.com/${instagramHandle}/media/`, function (error, response, body) {
      errorChecker.checkForErrors(error);
      const items = JSON.parse(body).items;
      if (response && response.statusCode === 200) {
        for (let i = 0; i < 10; i++) {
          let card = {};
          if (items[i]) {
            if (items[i].caption === null) {
              card.title = items[i].user.name;
            } else {
              card.title = items[i].caption.text;
            }
            card.item_url = items[i].link;
            card.image_url = items[i].images.standard_resolution.url;
            card.subtitle = `❤️ ${items[i].likes.count}`;
            elements.push(card);
          }
        }
        let instagramTemplate = messageTemplate.createGenericTemplate(elements);
        handler.reply(senderId, `Here's ${instagramHandle} on Instagram:`, function () {
          handler.reply(senderId, instagramTemplate, function () {
            handler.sendNextStepMessage(senderId);
          });
        });
      } else {
        handler.reply(senderId, 'Sorry, there was an error with the Instagram feed...', function () {
          handler.sendNextStepMessage(senderId);
        });
      }
    });
  }
}