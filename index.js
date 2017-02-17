require('dotenv').config(({silent: true}))

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const Bing = require('node-bing-api')({ accKey: "00c98764dd9d440ba8d15bf161787d0e" })
const wikipedia = require("node-wikipedia")
const app = express()
const mongoose = require('mongoose') // MongoDB lib

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
    console.log("hit here");
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        let sender = event.sender.id
        if (event.message && event.message.text) {
            let userText = event.message.text
            sendTextMessage(sender, userText)
        }
    }
    res.sendStatus(200)
})

const token = process.env.PAGE_ACCESS_TOKEN

// Send a text reply to a user
function sendTextMessage(sender, text) {

    Bing.images(text, {
        top: 15,   // Number of results (max 50)
        skip: 3    // Skip first 3 result
    }, function (error, res, body) {

        wikipedia.page.data(text, { content: true }, function(response) {
	    // structured information on the page for Clifford Brown (wikilinks, references, categories, etc.)
        console.log(response);
        });

        let messageData = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": [
                        {
                            "title": "Classic T-Shirt Collection",
                            "image_url": body.value[0].contentUrl,
                            "subtitle": "See all our colors",
                            "default_action": {
                                "type": "web_url",
                                "url": "https://c65e40c2.ngrok.io",
                                "messenger_extensions": true,
                                "webview_height_ratio": "tall",
                                "fallback_url": "https://c65e40c2.ngrok.io"
                            },
                            "buttons": [
                                {
                                    "title": "View",
                                    "type": "web_url",
                                    "url": "https://c65e40c2.ngrok.io",
                                    "messenger_extensions": true,
                                    "webview_height_ratio": "tall",
                                    "fallback_url": "https://c65e40c2.ngrok.io"
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
        }, function (error, response, body) {
            if (error) {
                console.log('Error sending messages: ', error)
            } else if (response.body.error) {
                console.log('Error: ', response.body.error)
            }
        })
    });
}


