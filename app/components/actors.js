const Bing = require('node-bing-api')({ accKey: process.env.BING_ACCESS_KEY });
const wikipedia = require('wikipedia-js');
const messageTemplate = require('../utils/messageTemplate');
const bingNewsImage = `${process.env.SERVER_URI}images/bing.jpg`;
const Actor = require('../models/actor');
const errorChecker = require('../utils/errorChecker');
const handler = require('../utils/handler');

module.exports = {
    getActorsInfo: getActorsInfo,
    sendSingleActor: sendSingleActor,
    sendCarouselOfActors: sendCarouselOfActors,
    sendFavoriteActors: sendFavoriteActors,
    sendActorIsBookmarked: sendActorIsBookmarked,
    sendActorIsUnbookmarked: sendActorIsUnbookmarked
}

// Query Bing to get Actor Thumbnail and return actor as an object for Carousels
function getActorsInfo (listOfActors, callback) {
  let actorsInfo = [];
  let counter = 0;
  for (let i = 0; i < listOfActors.length; i++) {
    Bing.images(listOfActors[i].name || listOfActors[i], { top: 5, skip: 3 }, function (error, res, body) {
      errorChecker.checkForErrors(error);
      actorsInfo.push({
        name: listOfActors[i].name || listOfActors[i],
        image: body && body.value && body.value[i] ? body.value[i].contentUrl : `${process.env.SERVER_URI}images/image-not-found.png`
      });
      counter += 1;
      if (counter === listOfActors.length) {
        return callback(actorsInfo);
      }
    });
  }
}

// Send  list template containing the actor profile
function sendSingleActor (senderId, actorName) {
  Actor.findOne({ name: actorName }, function (error, actor) {
    errorChecker.checkForErrors(error);
    if (!actor) {
      handler.reply(senderId, 'Nobody on screen right now...Try again 😊', function () {
        handler.sendNextStepMessage(senderId, actor);
      });
    }
    let biography = actor.name;
    const filmImage = `${process.env.SERVER_URI}images/movie_db.jpg`;
    const instagramLogo = `${process.env.SERVER_URI}images/instagram.png`;
    const productImage = `${process.env.SERVER_URI}images/best_sellers.png`;
    const productName = 'Best sellers';
    const youtubeLogo = `${process.env.SERVER_URI}images/youtube.png`;

    Bing.images(actor.name, { top: 15, skip: 3 }, function (error, res, body) {
      errorChecker.checkForErrors(error);
      let options = { query: actor.name, format: 'html', summaryOnly: true, lang: 'en' }; // get the Wiki summary
      wikipedia.searchArticle(options, function (err, htmlWikiText) {
        errorChecker.checkForErrors(err);
        if (htmlWikiText) {
          actor.descriptionSummary = htmlWikiText.replace(/<[^>]*>?/gm, ''); // to improve: to remove imperfections in parsing
        }
        actor.image = body.value[0].contentUrl; // put a default image if JSON is incorrect
        // >If it's an actor then send filmography
        let elements = [
          {
            'title': biography,
            'subtitle': `Click to get ${actor.name}'s biography`, // change to actor.name
            'image_url': actor.image,
            'default_action': { url: 'https://en.wikipedia.org/wiki/' + actor.name, fallback_url: 'https://en.wikipedia.org/wiki/' + actor.name },
            'buttons': [{ 'type': 'postback', 'title': 'Bookmark ❤️', 'payload': 'BOOKMARK ' + actor.name }]
          },
          {
            'title': 'Latest News',
            'image_url': bingNewsImage,
            'buttons': [{ 'type': 'postback', 'title': 'Read News', 'payload': 'NEWS ' + actor.name }]
          }
        ];
        // Send filmography in 1st position if it's an actor
        if (actor.is_actor) {
          elements.splice(
            1,
            0,
            {
              'title': 'Movies and Shows',
              'image_url': filmImage,
              'buttons': [{ 'type': 'postback', 'title': 'See Collection', 'payload': `FILMOGRAPHY ${actor.name}` }]
            }
          );
        } else {
          elements.splice(
            1,
            0,
            {
              'title': productName,
              'image_url': productImage,
              'buttons': [{ 'type': 'postback', 'title': 'See Products', 'payload': `AMAZON ${actor.name}` }]
            }
          );
        }
        // Include social accounts in 3rd position if they exist
        if (actor.instagram) {
          elements.splice(
            3,
            0,
            {
              'title': 'Social',
              'image_url': instagramLogo,
              'buttons': [{ 'type': 'postback', 'title': 'See Instagram', 'payload': `INSTAGRAM ${actor.name}` }]
            }
          );
        } else {
          elements.splice(
            3,
            0,
            {
              'title': 'Best Videos',
              'image_url': youtubeLogo,
              'buttons': [{ 'type': 'postback', 'title': 'Watch Videos', 'payload': `YOUTUBE ${actor.name}` }]
            }
          );
        }
        // Only render the first 4 elements
        actor.list = messageTemplate.createListTemplate(elements.slice(0, 4));
        handler.reply(senderId, actor.list, function () {
          handler.sendNextStepMessage(senderId, actor);
        });
      });
    });
  });
}

function sendCarouselOfActors (currentUser, listOfActors, introductionMessage) {
  let elements = [];
  let counter = 0;
  getActorsInfo(listOfActors, function (actorsInfo) {
    for (let i = 0; i < actorsInfo.length; i++) {
      let element = {
        title: actorsInfo[i].name,
        image_url: actorsInfo[i].image,
        subtitle: 'Click on "Choose" to know more about ' + actorsInfo[i].name
      };
      if (currentUser.favorites && currentUser.favorites.indexOf(actorsInfo[i].name) === -1) {
        element.buttons = [
          {
            'type': 'postback',
            'title': 'Choose ✔︎',
            'payload': 'SINGLE_ACTOR,' + actorsInfo[i].name
          },
          {
            'type': 'postback',
            'title': 'Bookmark ❤️',
            'payload': 'BOOKMARK ' + actorsInfo[i].name
          }
        ];
      } else {
        element.buttons = [
          {
            'type': 'postback',
            'title': 'Choose ✔︎',
            'payload': 'SINGLE_ACTOR,' + actorsInfo[i].name
          },
          {
            'type': 'postback',
            'title': 'Unbookmark ❌',
            'payload': 'UNBOOKMARK ' + actorsInfo[i].name
          }
        ];
      }
      elements.push(element);
      counter += 1;
      if (counter === actorsInfo.length) {
        let listOfActorsMessage = messageTemplate.createGenericTemplate(elements);
        handler.reply(currentUser.fb_id, introductionMessage, function () {
          setTimeout(function () {
            handler.reply(currentUser.fb_id, listOfActorsMessage);
          }, 2000);
        });
      }
    }
  });
}

function sendFavoriteActors (user) {
  if (user.favorites.length === 0) {
    handler.reply(user.fb_id, "You don't have any favorites yet 😞", function () {
      handler.reply(user.fb_id, "But don't be sad 😄", function () {
        setTimeout(function () {
          handler.reply(user.fb_id, "Click on 'Bookmark ❤️' to add an actor to your favorites, like a pro 😎", function () {
          }, 2000);
          handler.sendNextStepMessage(user.fb_id);
        });
      });
    });
  } else {
    let introductionMessage = 'And your favorite actors are...(drumroll) 🙌️';
    sendCarouselOfActors(user, user.favorites, introductionMessage);
  }
}

function sendActorIsBookmarked (senderId, newFavorite) {
  let introductionMessage = `${newFavorite} is now bookmarked 😎 You can access bookmarked actors by clicking on "My favorites" ❤️`;
  handler.reply(senderId, introductionMessage, function () {
    handler.sendNextStepMessage(senderId);
  });
}

function sendActorIsUnbookmarked (senderId, actorName) {
  let introductionMessage = `${actorName} successfully unbookmarked ❌️`;
  handler.reply(senderId, introductionMessage, function () {
    handler.sendNextStepMessage(senderId);
  });
}