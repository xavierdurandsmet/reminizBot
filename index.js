require('dotenv').config(({ silent: true }));

const express = require('express');
const bodyParser = require('body-parser')
const app = express()
const mongoose = require('mongoose') // MongoDB lib
const Bot = require("./Bot")
const threadSettings = require('./app/controllers/thread_settings')
const User = require('./app/models/user')
const Actor = require('./app/models/actor')

app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// Process application/json
app.use(bodyParser.json())

// Spin up the server
app.listen(app.get('port'), function (err) {
  if (err) {
    return err
  }
  // Uncomment this line to install thread settings
  threadSettings()
  console.log('running on port', app.get('port'))
})

// Start the database using Mongoose
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.Promise = require('bluebird'); // Mongoose promise library is deprecated
mongoose.connect(MONGODB_URI);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', () => {
  console.log(`Successfully connected to ${MONGODB_URI}`)
})

// -----------------------------------------------------------------------------
// ROUTES
// -----------------------------------------------------------------------------

// Index route
app.get('/', function (req, res) {
  res.send("Welcome to the Bot Server")
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
  if (req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
    res.send(req.query['hub.challenge'])
  } else {
    res.send('Error, wrong token')
  }
})

// MAIN ROUTE - This is called every time the bot receives a message
app.post('/webhook/', function (req, res) {
  let events = req.body.entry[0].messaging;
  for (let i = 0; i < events.length; i++) {
    let event = events[i];
    console.log("event ", event)
    let postback = event.postback
    let senderId = event.sender.id
    // When a user clicks on the GET STARTED button, send the default answer
    if ((postback && postback.payload === "GET_STARTED")) {
      Bot.sendChannelsList(senderId)
    }
    if ((postback && postback.payload === "FAVORITES") || (event.message && event.message.quick_reply && event.message.quick_reply.payload === "FAVORITES")) {
        User.findOrCreate(senderId, function (currentUser) {
          Bot.sendFavoriteActors(currentUser);
        })
    }
    // Send the default answer for any text message
    if ((postback && postback.payload === "TV_CHANNELS") || (event.message && event.message.quick_reply && event.message.quick_reply.payload === "TV_CHANNELS")) {
      Bot.sendChannelsList(senderId)
    } else if (postback && postback.payload) {
      // will be replaced with the reminiz API
      let channels = [
        {
          name: "CNN",
          actors: ["Natalie Portman"]
        },
        {
          name: "DISNEY_CHANNEL",
          actors: ["Justin Bieber", "Justin Timberlake"]
        }
      ]
      if (postback.payload === "CNN") {
        Bot.sendSingleActor(senderId, channels[0].actors[0])
      } else if (postback.payload === "DISNEY_CHANNEL") {
        User.findOrCreate(senderId, function (currentUser) {
          Bot.sendManyActors(currentUser, channels[1].actors);
        });
      } else if (postback.payload.substr(0, 12) === "SINGLE_ACTOR") {
        let info = postback.payload.split(",");
        let actor = info[1];
        Bot.sendSingleActor(senderId, actor);
      } else if (postback.payload.substr(0, 6) === "AMAZON") {
        let actorName = postback.payload.substr(7);
        let lastName = 'Portman' // we should receive id for each actor by reminiz, replace this value with the id
        Bot.sendAmazonProducts(senderId, actorName);
        Actor.findOneAndUpdate({ last_name: lastName }, { $inc: { 'sectionsClicked.products': 1 } }, function (error, updatedActor) { // replace last_name with id
          if (error) {
            return res.send(error);
          }
        })
      } else if (postback.payload.substr(0, 11) === "FILMOGRAPHY") {
        let actorName = postback.payload.substr(12);
        let lastName = 'Portman' // we should receive id for each actor by reminiz, replace this value with the id
        Bot.sendCarouselOfFilms(senderId, actorName);
        Actor.findOneAndUpdate({ last_name: lastName }, { $inc: { 'sectionsClicked.filmography': 1 } }, function (error, updatedActor) { // replace last_name with id
          console.log("updatedActor ", updatedActor)
          if (error) {
            return res.send(error);
          }
        })
      } else if (postback.payload.substr(0, 4) === "NEWS") {
        let actorName = postback.payload.substr(5);
        let lastName = 'Portman' // we should receive id for each actor by reminiz, replace this value with the id
        Bot.sendCarouselOfNews(senderId, actorName);
        Actor.findOneAndUpdate({ last_name: lastName }, { $inc: { 'sectionsClicked.news': 1 } }, function (error, updatedActor) { // replace last_name with id
          if (error) {
            return res.send(error);
          }
        })
      } else if (postback.payload.substr(0, 8) === "BOOKMARK") { // User bookmarks an actor, bot sends the list of his fav actors
        let newFavoriteActor = postback.payload.substr(9);
        let lastName = 'Portman' // we should receive id for each actor by reminiz, replace this value with the id
        User.findOrCreate(senderId, function (currentUser) {
          let currentFavoritesList = currentUser.favorites;
          currentFavoritesList.unshift(newFavoriteActor);
          if (currentFavoritesList.length > 2) {
            currentFavoritesList.pop(); // temp business logic: favorites is max 2 (change this logic after refactoring the sendGenericTemplate function)
          }
          User.findOneAndUpdate({ fb_id: senderId }, { favorites: currentFavoritesList }, { new: true }, function (error, updatedUser) {
            if (error) {
              return res.send(error);
            } else if (!updatedUser) {
              return res.sendStatus(400);
            }
            Bot.sendActorIsBookmarked(senderId, newFavoriteActor);
            Actor.findByIdAndUpdate({ id: lastName }, { $inc: { bookmarked: 1 } }, function (error, updatedActor) {
              if (error) {
                return res.send(error);
              }
            })
          });
        })
      } else if (postback.payload.substr(0, 10) === "UNBOOKMARK") { // Remove an actor from the list of favorites
        const actorToUnbookmark = postback.payload.substr(11);
        User.findOrCreate(senderId, function (currentUser) {
          const indexOfActor = currentUser.favorites.indexOf(actorToUnbookmark);
          if (indexOfActor === -1) {
            Bot.reply(currentUser.fb_id, "Tryin' to trick me ? This actor isn't in your favorites 😉", function () {
              Bot.sendNextStepMessage(currentUser.fb_id);
            });
          } else {
            currentUser.favorites.splice(indexOfActor, 1);
            User.findOneAndUpdate({fb_id: senderId}, { favorites: currentUser.favorites }, {new: true}, function (error, updatedUser) {
              if (error) {
                return res.send(error);
              } else if (!updatedUser) {
                return res.sendStatus(400);
              }
              Bot.sendActorIsUnbookmarked(senderId, actorToUnbookmark);
            });
          }
        });
      }
    }
  }
  res.sendStatus(200)
})
