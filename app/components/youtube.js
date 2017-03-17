const request = require('request');
const messageTemplate = require('../utils/messageTemplate');
const errorChecker = require('../utils/errorChecker');
const replier = require('../utils/replier');

module.exports = {
    sendYoutubeVideos: sendYoutubeVideos
}

function sendYoutubeVideos (senderId, actorName) {
  const youtubeBaseUri = 'https://www.googleapis.com/youtube/v3/search';
  const youtubeApiKey = process.env.YOUTUBE_API_KEY;
  let elements = [];
  request(`${youtubeBaseUri}?part=snippet&type=video&q=${actorName}&key=${youtubeApiKey}`, function (error, response, body) {
    errorChecker.checkForErrors(error);
    const items = JSON.parse(body).items;
    if (response && response.statusCode === 200) {
      for (let i = 0; i < 6; i++) {
        let card = {};
        if (items[i]) {
          card.title = items[i].snippet.title;
          card.item_url = `https://www.youtube.com/watch?v=${items[i].id.videoId}`;
          card.image_url = items[i].snippet.thumbnails.medium.url;
          card.subtitle = items[i].snippet.description;
          elements.push(card);
        }
      }
      let youtubeTemplate = messageTemplate.createGenericTemplate(elements);
      replier.reply(senderId, `Here's ${actorName} on Youtube:`, function () {
        replier.reply(senderId, youtubeTemplate, function () {
          replier.sendNextStepMessage(senderId);
        });
      });
    } else {
      replier.reply(senderId, 'Sorry, there was an error with the Youtube feed...', function () {
        replier.sendNextStepMessage(senderId);
      });
    }
  });
}
