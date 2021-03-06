require('dotenv').config(({ silent: true }));

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const mongoose = require('mongoose');

const Bot = require('./app/Bot');
const threadSettings = require('./app/thread_settings');
const User = require('./app/models/user');
const Actor = require('./app/models/actor');

const dashbot = require('dashbot')(process.env.DASHBOT_API_KEY).facebook;

app.set('port', (process.env.PORT || 5000));

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// Process application/json
app.use(bodyParser.json());

app.use(express.static('app/public'));

app.listen(app.get('port'), function (err) {
  if (err) {
    return err;
  }
  // Uncomment this line to install thread settings
  threadSettings();
  console.log('running on port', app.get('port'));
});

const MONGODB_URI = process.env.MONGODB_URI;
mongoose.Promise = require('bluebird'); // Mongoose promise library is deprecated
mongoose.connect(MONGODB_URI);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log(`Successfully connected to ${MONGODB_URI}`);
});

// -----------------------------------------------------------------------------
// ROUTES
// -----------------------------------------------------------------------------

// Index route
app.get('/', function (req, res) {
  res.send('Welcome to the Bot Server');
});

// for Facebook verification
app.get('/webhook/', function (req, res) {
  if (req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.send('Error, wrong token');
  }
});

// MAIN ROUTE - This is called every time the bot receives a message
app.post('/webhook/', function (req, res) {
  dashbot.logIncoming(req.body); // Analytics
  let events = req.body.entry[0].messaging;
  for (let i = 0; i < events.length; i++) {
    let event = events[i];
    console.log('event ', event);
    let postback = event.postback;
    let senderId = event.sender.id;
    // When a user clicks on the GET STARTED button, send the default answer
    if ((postback && postback.payload === 'GET_STARTED')) {
      Bot.sendChannelsList(senderId);
    }
    if ((postback && postback.payload === 'FAVORITES') || (event.message && event.message.quick_reply && event.message.quick_reply.payload === 'FAVORITES')) {
      User.findOrCreate(senderId, function (currentUser) {
        Bot.sendFavoriteActors(currentUser);
      });
    }
    // Send the default answer for any text message
    if ((postback && postback.payload === 'TV_CHANNELS') ||
      (event.message && event.message.quick_reply && event.message.quick_reply.payload === 'TV_CHANNELS') ||
      (event.message && event.message.sticker_id) || // sticker input
      (event.message && event.message.attachments) ||  // attachement
      (event.message && event.message.text && !event.message.quick_replies && !event.message.quick_reply) // text input
      ) {
      Bot.sendChannelsList(senderId);
    } else if (postback && postback.payload) {
      if (postback.payload.substr(0, 7) === 'CHANNEL') {
        let channelName = postback.payload.substr(8);
        Bot.getLiveActors(channelName, function (actors) {
          if (!actors || actors.length === 0) {
            Bot.reply(senderId, 'Nobody on screen right now', function () {
              Bot.sendNextStepMessage(senderId);
            });
          }
          if (actors) {
            for (let i = 0; i < actors.length; i++) {
              Actor.findOneAndUpdate(
                { name: actors[i].name },
                { $set: {
                  name: actors[i].name,
                  instagram: actors[i].instagram,
                  is_actor: actors[i].is_actor
                }
                },
                { upsert: true, new: true }, function (err) {
                  Bot.checkForErrors(err);
                }
              );
            }
            if (actors.length === 1) {
              Bot.reply(senderId, `${actors[0].name} is live ❤️`, function () {
                Bot.sendSingleActor(senderId, actors[0].name);
              });
            } else {
              User.findOrCreate(senderId, function (currentUser) {
                Bot.sendCarouselOfActors(currentUser, actors, 'Many people on screen right now 😎 Who are you interested in?');
              });
            }
          }
        });
      } else if (postback.payload.substr(0, 4) === 'LIVE') {
        let liveLink = postback.payload.substr(5);
        Bot.reply(senderId, `Watch the live there: ${liveLink}`, function () {
          Bot.sendNextStepMessage(senderId);
        });
      } else if (postback.payload.substr(0, 12) === 'SINGLE_ACTOR') {
        let info = postback.payload.split(',');
        let actorName = info[1];
        Bot.reply(senderId, `${actorName} is live ❤️`, function () {
          Bot.sendSingleActor(senderId, actorName);
        });
      } else if (postback.payload.substr(0, 6) === 'AMAZON') {
        let actorName = postback.payload.substr(7);
        Bot.reply(senderId, `Getting ${actorName}'s best sellers, this might take a few seconds 🎈`, function () {
          Bot.sendAmazonProducts(senderId, actorName);
        });
        Actor.findOneAndUpdate(
          { name: actorName },
          { $inc: { 'timesSectionsAreClicked.products': 1 } },
          { upsert: true }, function (error) { // replace name with id
            if (error) {
              return res.send(error);
            }
          });
      } else if (postback.payload.substr(0, 11) === 'FILMOGRAPHY') {
        let actorName = postback.payload.substr(12);
        Bot.reply(senderId, `Getting ${actorName}'s movies and shows, this might take a few seconds 🎈`, function () {
          Bot.sendCarouselOfFilms(senderId, actorName);
        });
        Actor.findOneAndUpdate(
         { name: actorName },
         { $inc: { 'timesSectionsAreClicked.filmography': 1 } },
         { upsert: true }, function (error) { // replace name with id
           if (error) {
             return res.send(error);
           }
         });
      } else if (postback.payload.substr(0, 4) === 'NEWS') {
        let actorName = postback.payload.substr(5);
        Bot.reply(senderId, `Getting ${actorName}'s latest news, this might take a few seconds 🎈`, function () {
          Bot.sendCarouselOfNews(senderId, actorName);
        });
        Actor.findOneAndUpdate(
          { name: actorName },
          { $inc: { 'timesSectionsAreClicked.news': 1 } },
          { upsert: true }, function (error) { // replace name with id
            if (error) {
              return res.send(error);
            }
          });
      } else if (postback.payload.substr(0, 9) === 'INSTAGRAM') {
        const actorName = postback.payload.substr(10);
        Actor.findOne({name: actorName}, function (error, actor) {
          Bot.checkForErrors(error);
          Bot.sendInstagramFeed(senderId, actor.instagram);
        });
      } else if (postback.payload.substr(0, 7) === 'YOUTUBE') {
        const actorName = postback.payload.substr(8);
        Bot.sendYoutubeVideos(senderId, actorName);
      } else if (postback.payload.substr(0, 8) === 'BOOKMARK') { // User bookmarks an actor, bot sends the list of his fav actors
        // User bookmarks an actor, bot sends the list of his fav actors
        let newFavoriteActor = postback.payload.substr(9);

        User.findOrCreate(senderId, function (currentUser) {
          Actor.findOneAndUpdate(
            { name: newFavoriteActor },
            {
              $push: { bookmarkedBy: currentUser.fb_id },
              $inc: { bookmarkCounter: 1 }
            },
            {upsert: true, new: true}, function (error, actor) {
              if (error) {
                return error;
              }
            }
          );

          let currentFavoritesList = currentUser.favorites;
          if (currentFavoritesList.indexOf(newFavoriteActor) !== -1) {
            Bot.reply(currentUser.fb_id, 'You already bookmarked this actor 😀 Go to your favorites 😉', function () {
              Bot.sendNextStepMessage(currentUser.fb_id);
            });
          } else if (currentFavoritesList.indexOf(newFavoriteActor)) {
            currentFavoritesList.unshift(newFavoriteActor);
            // Add actor to the user's favorites
            User.findOneAndUpdate(
              { fb_id: senderId },
              { favorites: currentFavoritesList },
              { new: true }, function (error, updatedUser) {
                if (error) {
                  return res.send(error);
                } else if (!updatedUser) {
                  return res.sendStatus(400);
                }
                Bot.sendActorIsBookmarked(senderId, newFavoriteActor);
              }
            );
          }
        });
      } else if (postback.payload.substr(0, 10) === 'UNBOOKMARK') { // Remove an actor from the list of favorites
        let actorToUnbookmark = postback.payload.substr(11);
        User.findOrCreate(senderId, function (currentUser) {
          let indexOfActor = currentUser.favorites.indexOf(actorToUnbookmark);
          if (indexOfActor === -1) {
            Bot.reply(currentUser.fb_id, "Tryin' to trick me ? This actor isn't in your favorites 😉", function () {
              Bot.sendNextStepMessage(currentUser.fb_id);
            });
          } else {
            currentUser.favorites.splice(indexOfActor, 1);
            User.findOneAndUpdate({ fb_id: senderId }, { favorites: currentUser.favorites }, { new: true }, function (error, updatedUser) {
              if (error) {
                return res.send(error);
              } else if (!updatedUser) {
                return res.sendStatus(400);
              }
              Bot.sendActorIsUnbookmarked(senderId, actorToUnbookmark);

              Actor.findOneAndUpdate(
                { name: actorToUnbookmark },
                function (error, actor) { // replace name with id?
                  if (error) {
                    return error;
                  }
                  let indexOfUser = actor.bookmarkedBy.indexOf(currentUser.fb_id);
                  actor.bookmarkedBy.splice(indexOfUser, 1); // removes the element from the arr bookmarkedBy
                  actor.save(function (error) {
                    if (error) {
                      return error;
                    }
                  });
                }
              );
            });
          }
        });
      }
    }
  }
  res.sendStatus(200);
});
