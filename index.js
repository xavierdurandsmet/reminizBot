require('dotenv').config(({silent: true}))

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()
const mongoose = require('mongoose') // MongoDB lib
const token = process.env.PAGE_ACCESS_TOKEN
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
  console.log('running on port', app.get('port'))
})

// Start the database using Mongoose
const MONGODB_URI = process.env.MONGODB_URI
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
    res.send("YOOOOOO Hello World to all my ngs");
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})

app.post('/webhook/', function (req, res) {
    console.log('Bot received a message');
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        let senderId = event.sender.id
        if (event.message && event.message.text) {
          const currentUser = User.findOrCreate(senderId)
          console.log(currentUser)
          sendDefaultMessage(senderId, event.message.text)
        }
    }
    res.sendStatus(200)
})


// Send a text reply to a user
function sendDefaultMessage(sender) {
  let messageData = {
      "attachment": {
          "type": "template",
          "payload": {
              "template_type": "generic",
              "elements": [
                  {
                      "title": "CNN",
                      "image_url": 'https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcQn4O8zXpRf9xbk8vy0LdrXqa8jXUduoKdlc2YfrsL5cKxLBegR_e89HXg',
                      "subtitle": "The news channel",
                      "buttons": [
                        {
                          "type":"postback",
                          "title":"Choose ✔︎",
                          "payload":"SINGLE_ACTOR"
                        }
                      ]
                  },
                  {
                      "title": "Disney Channel",
                      "image_url": 'http://vignette4.wikia.nocookie.net/logopedia/images/8/87/Disney_Channel_2014.png/revision/latest?cb=20140522224840',
                      "subtitle": "Children love it",
                      "buttons": [
                        {
                          "type":"postback",
                          "title":"Choose ✔︎",
                          "payload":"MANY_ACTORS"
                        }
                      ]
                  }
              ]
          }
      }
  }
  request({
      url: 'https://graph.facebook.com/v2.6/me/messages',
      qs: { access_token: token },
      method: 'POST',
      json: {
          recipient: { id: sender },
          message: messageData,
      }
  }, function (error, response) {
      if (error) {
          console.log('Error sending messages: ', error)
      } else if (response.body.error) {
          console.log('Error: ', response.body.error)
      }
  })
}
