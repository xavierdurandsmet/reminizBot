const request = require('request');
const messageTemplate = require('../utils/messageTemplate');
const errorChecker = require('../utils/errorChecker');
const replier = require('../utils/replier');
const Bing = require('node-bing-api')({ accKey: process.env.BING_ACCESS_KEY });
const bingNewsImage = `${process.env.SERVER_URI}images/bing.jpg`;

module.exports = {
    sendCarouselOfNews: sendCarouselOfNews
}

function sendCarouselOfNews (senderId, actorName) {
  Bing.news(actorName, { top: 10, skip: 3, safeSearch: 'Moderate' }, function (error, res, body) {
    errorChecker.checkForErrors(error);
    let JSONResponse = body.value;
    let newsList = [];
    for (let i = 0; i <= 4; i++) {
      if (JSONResponse[i]) {
        let newsArticle = {};
        if (JSONResponse[i]) {
          newsArticle.title = JSONResponse[i].name;
          if (!JSONResponse[i].image) {
            newsArticle.image_url = bingNewsImage;
          } else if (JSONResponse[i].image.thumbnail.contentUrl) {
            newsArticle.image_url = JSONResponse[i].image.thumbnail.contentUrl; // get better quality images?
          }
          newsArticle.subtitle = JSONResponse[i].description;
          newsArticle.buttons = [{ 'type': 'web_url', 'title': 'Read More', 'url': JSONResponse[i].url }]; // change to specific movie
          newsList.push(newsArticle);
        }
      }
    }
    if (!newsList.length) {
      replier.reply(senderId, 'No TV News were found for this person', function () {
        sendSingleActor(senderId, actorName);
      });
    } else {
      let newsTemplate = messageTemplate.createGenericTemplate(newsList);
      replier.reply(senderId, newsTemplate, function () {
        replier.sendNextStepMessage(senderId);
      });
    }
  });
}