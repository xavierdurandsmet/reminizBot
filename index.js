require('dotenv').config(({ silent: true }))

const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const mongoose = require('mongoose') // MongoDB lib
const Bot = require("./Bot")
const threadSettings = require('./app/controllers/thread_settings')
const User = require('./app/models/user')

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
  // threadSettings()
  console.log('running on port', app.get('port'))
})

// Start the database using Mongoose
const MONGODB_URI = process.env.MONGODB_URI
mongoose.Promise = require('bluebird') // Mongoose promise library is deprecated
mongoose.connect(MONGODB_URI)
const db = mongoose.connection
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
  }
  res.send('Error, wrong token')
})

// MAIN ROUTE - This is called every time the bot receives a message
app.post('/webhook/', function (req, res) {
  let events = req.body.entry[0].messaging;
  for (let i = 0; i < events.length; i++) {
    let event = events[i];
    let postback = event.postback
    let senderId = event.sender.id
    // When a user clicks on the GET STARTED button, send the default answer
    if ((postback && postback.payload === "GET_STARTED")) {
      User.findOrCreate(senderId) // Creates the USER in the DB
      Bot.sendChannelsList(senderId)
    }
    // Send the default answer for any text message
    if ((postback && postback.payload === "TV_CHANNELS") || (event.message && event.message.text)) {
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
        Bot.sendSingleActor(senderId, channels[0].actors[0], channels[0].name)
      } else if (postback.payload === "DISNEY_CHANNEL") {
        Bot.sendManyActors(senderId, channels[1].actors, channels[1].name)
      } else if (postback.payload.substr(0, 12) === "SINGLE_ACTOR") {
        let info = postback.payload.split(",");
        let actor = info[1];
        let channel = info[2];
        Bot.sendSingleActor(senderId, actor, channel);
      } else if (postback.payload === "FAVORITES") {
        User.findOrCreate(senderId, function (currentUser) {
          Bot.sendFavoriteActors(senderId, currentUser.favorites);
        })
      } else if (postback.payload.substr(0, 8) === "BOOKMARK") {
        let newFavorite = postback.payload.substr(9);
        User.findOrCreate(senderId, function (currentUser) {
          let currentFavoritesList = currentUser.favorites;
          currentFavoritesList.unshift(newFavorite);
          User.findOneAndUpdate({ fb_id: senderId }, { favorites: currentFavoritesList }, function (updatedUser) {
            console.log("UPDATED USER", updatedUser); // find out why it's returning null
          });
        })
      }
    }
  }
  res.sendStatus(200)
})
