require('dotenv').config(({ silent: true }));
// Dependencies
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const mongoose = require('mongoose');
const CronJob = require('cron').CronJob;
const path = require('path');

const Bot = require("./Bot");
const threadSettings = require('./app/controllers/thread_settings');
const User = require('./app/models/user');
const Actor = require('./app/models/actor');

app.set('port', (process.env.PORT || 5000));

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// Process application/json
app.use(bodyParser.json());

app.use(express.static('app/public'));

// Spin up the server
app.listen(app.get('port'), function (err) {
  if (err) {
    return err;
  }
  // Uncomment this line to install thread settings
  threadSettings();
  console.log('running on port', app.get('port'));
})

// Start the database using Mongoose
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.Promise = require('bluebird'); // Mongoose promise library is deprecated
mongoose.connect(MONGODB_URI);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', () => {
  console.log(`Successfully connected to ${MONGODB_URI}`);
})

// -----------------------------------------------------------------------------
// ROUTES
// -----------------------------------------------------------------------------

// Index route
app.get('/', function (req, res) {
  res.send("Welcome to the Bot Server");
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
  if (req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.send('Error, wrong token');
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
          actors: ["Aaron Paul"]
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
        Bot.sendAmazonProducts(senderId, actorName);
        Actor.findOneAndUpdate(
          { full_name: actorName },
          { $inc: { 'timesSectionsAreClicked.products': 1 } },
          { upsert: true }, function (error) { // replace full_name with id
            if (error) {
              return res.send(error);
            }
          })
      } else if (postback.payload.substr(0, 11) === "FILMOGRAPHY") {
        let actorName = postback.payload.substr(12);
        Bot.sendCarouselOfFilms(senderId, actorName);
        Actor.findOneAndUpdate(
         { full_name: actorName },
         { $inc: { 'timesSectionsAreClicked.filmography': 1 } },
         { upsert: true }, function (error) { // replace full_name with id
          if (error) {
            return res.send(error);
          }
        })
      } else if (postback.payload.substr(0, 4) === "NEWS") {
        let actorName = postback.payload.substr(5);
        Bot.sendCarouselOfNews(senderId, actorName);
        Actor.findOneAndUpdate(
          { full_name: actorName },
          { $inc: { 'timesSectionsAreClicked.news': 1 } },
          { upsert: true }, function (error) { // replace full_name with id
          if (error) {
            return res.send(error);
          }
        })
      } else if (postback.payload.substr(0, 9) === "INSTAGRAM") {
        const actorName = postback.payload.substr(10);
        Actor.findOne({full_name: actorName}, function(error, actor) {
          Bot.checkForErrors(error);
          Bot.sendInstagramFeed(senderId, actor.instagram);
        });
      } else if (postback.payload.substr(0, 7) === "YOUTUBE") {
        const actorName = postback.payload.substr(8);
        Bot.sendYoutubeVideos(senderId, actorName);
      } else if (postback.payload.substr(0, 8) === "BOOKMARK") { // User bookmarks an actor, bot sends the list of his fav actors
        // User bookmarks an actor, bot sends the list of his fav actors
        let newFavoriteActor = postback.payload.substr(9);
        console.log("")

        User.findOrCreate(senderId, function (currentUser) {
          Actor.findOneAndUpdate(
            { full_name: newFavoriteActor },
            {
              $push: { bookmarkedBy: currentUser.fb_id },
              $inc: { timesBookmarked: 1 },
              $inc: { bookmarkCounter: 1 },
            },
            { upsert: true, new: true}, function (error, actor) {
            if (error) {
              return error;
            }
            console.log(actor)
          });


          let currentFavoritesList = currentUser.favorites;
          if (currentFavoritesList.indexOf(newFavoriteActor) !== -1) {
            Bot.reply(currentUser.fb_id, "You already bookmarked this actor 😀 Go to your favorites 😉", function () {
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
        })
      } else if (postback.payload.substr(0, 10) === "UNBOOKMARK") { // Remove an actor from the list of favorites
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
                { full_name: actorToUnbookmark },
                function (error, actor) { // replace name with id?
                  if (error) {
                    return error;
                  }
                  console.log(actor);
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
  res.sendStatus(200)
})

// NOTIFICATIONS
new CronJob({
  cronTime: '* * * *', // CHANGE TO AVOID SENDING AT NIGHT, here runs every minute
  onTick: function() {
    console.log("Sending message, at", new Date());
    sendNotifications();
  },
  start: true,
  timeZone: 'Europe/Paris' // CHANGE BEFORE CONFERENCE
});

function sendNotifications() { // actors is an array
  User.
    find({
      hasBeenNotified: false,
      // favorites: { $gt: 2}
    }, function(error, users) {
      if (error) {
        console.log(error);
        return error;
      }
      console.log(users)
      for (let i = 0; i < users.length; i++) {
        if (users[i].favorites.length < 1) {
          return;
        }
        let actor = users[i].favorites[0];
        Bot.reply(users[i].fb_id, `${actor} is on screen right now ${users[i].fb_first_name}`);
        users[i].hasBeenNotified = true;
        users[i].save(function(err) {
          if (err) {
            return (err);
          }
        });
      }
    })
}

// // SEED DATABASE
const actors = [
  {"id": 1,
   "full_name": "Aaron Paul",
   "is_actor": true
  },
  {"id": 2,
   "full_name": "Justin Timberlake",
   "is_actor": true,
   "instagram": "justintimberlake"
  },
  {"id": 3,
   "full_name": "Justin Bieber",
   "is_actor": false,
   "instagram": "justinbieber"
  }
];

Actor.create(actors, function (err) {
  if (err) {
    console.log('Error seeding DB:', err);
    return err;
  }
});


