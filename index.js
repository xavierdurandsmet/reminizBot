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
  let event = req.body.entry[0].messaging[0]
  let senderId = event.sender.id
  // When a user clicks on the GET STARTED button, send the default answer
  if ((event.postback && event.postback.payload === "GET_STARTED")) {
    User.findOrCreate(senderId) // Creates the USER in the DB
    Bot.sendChannelsList(senderId)
  }
  // Send the default answer for any text message
  if ((event.postback && event.postback.payload === "TV_CHANNELS") || (event.message && event.message.text)) {
    Bot.sendChannelsList(senderId)
  } else if (event.postback && event.postback.payload) {
    // will be replaced with the reminiz API
    let actorsLive = ["Justin Bieber"]
    if (event.postback.payload === "SINGLE_ACTOR") {
      Bot.sendSingleActor(senderId, actorsLive[0], "CNN")
    } else if (event.postback.payload === "MANY_ACTORS") {
      actorsLive = ["Justin Bieber", "Natalie Portman"]
      Bot.sendManyActors(senderId, actorsLive)
    } else if (event.postback.payload === "FAVORITES") {
      User.findOrCreate(senderId, function (currentUser) {
        Bot.sendFavoriteActors(senderId, currentUser.favorites);
      })
    } else {
      let newFavorite = event.postback.payload;
      User.findOrCreate(senderId, function(currentUser) {
        let currentFavoritesList = currentUser.favorites;
        currentFavoritesList.push(newFavorite);
        User.findOneAndUpdate({fb_id: senderId}, {favorites: currentFavoritesList}, function(updatedUser) {
          console.log("UPDATED USER", updatedUser); // find out why it's returning null
        });
      })
    }
  }
  res.sendStatus(200)
})
