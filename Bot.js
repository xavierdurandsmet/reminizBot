const request = require('request')
const Bing = require('node-bing-api')({ accKey: '00c98764dd9d440ba8d15bf161787d0e' }) // put this in .env
const wikipedia = require('wikipedia-js')
const User = require('./app/models/user')
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN
const messageTemplate = require('./messageTemplate')

module.exports = {
  sendChannelsList: sendChannelsList,
  sendSingleActor: sendSingleActor,
  sendManyActors: sendManyActors,
  sendFavoriteActors: sendFavoriteActors
}

function sendChannelsList(senderId) {
  // Find the current user first
  User.findOrCreate(senderId, function (user) {
    // Greet user by its first name
    let introductionMessage = `Hi ${user.fb_first_name} 👋 Pick a TV channel to know who's on screen in real time ⚡️` // change to user name
    let listOfChannelsMessage = messageTemplate.createGenericTemplate(
      [
        {
          "title": 'CNN',
          "image_url": 'https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcQn4O8zXpRf9xbk8vy0LdrXqa8jXUduoKdlc2YfrsL5cKxLBegR_e89HXg',
          "subtitle": 'The news channel',
          "buttons": [{ "title": 'Choose ✔︎', "payload": 'SINGLE_ACTOR' }]
        },
        {
          "title": 'Disney Channel',
          "image_url": 'http://vignette4.wikia.nocookie.net/logopedia/images/8/87/Disney_Channel_2014.png/revision/latest?cb=20140522224840',
          "subtitle": 'Children love it',
          "buttons": [{ "title": 'Choose ✔︎', "payload": 'MANY_ACTORS' }]
        }
      ]
    )

    reply(senderId, introductionMessage, function () {
      reply(senderId, listOfChannelsMessage)
    })
  })
}

// Send an actor's template
function sendSingleActor(senderId, actorNameQuery, channel) {

  Bing.images(actorNameQuery, {
    top: 15,   // Number of results (max 50)
    skip: 3    // Skip first 3 result
  }, function (error, res, body) {

    // get the Wiki summary
    let options = { query: actorNameQuery, format: 'html', summaryOnly: true, lang: 'en' }
    wikipedia.searchArticle(options, function (err, htmlWikiText) {
      if (err) {
        console.log('An error occurred', err)
        return
      }
      let descriptionSummary = htmlWikiText.replace(/<[^>]*>?/gm, '') // to improve: to remove imperfections in parsing
      let introductionMessage = `${actorNameQuery} is on screen on ${channel} ❤️`

      // List template with the actor profile
      let actorDescription = messageTemplate.createListTemplate(
        [
          {
            "title": actorNameQuery,
            "image_url": body.value[0].contentUrl,
            "subtitle": descriptionSummary,
            "default_action": { url: 'https://en.wikipedia.org/wiki/Justin_Bieber', fallback_url: 'https://en.wikipedia.org/wiki/Justin_Bieber' },
            "buttons": [{ "title": 'Bookmark', "payload": actorNameQuery }]
          },
          {
            "title": 'Filmography',
            "image_url": 'https://en.wikipedia.org/wiki/Justin_Bieber',
            "subtitle": "TBD",
            "default_action": { url: 'https://en.wikipedia.org/wiki/Justin_Bieber', fallback_url: 'https://en.wikipedia.org/wiki/Justin_Bieber' },
            "buttons": [{ "title": 'Shop Now', "payload": "SHOP_NOW" }]
          }
        ]
      )

      // Sending the messages to the user, in the right order
      reply(senderId, introductionMessage, function () {
        reply(senderId, actorDescription, function () {
          sendNextStepMessage(senderId)
        })
      })
    })
  })
}

function sendManyActors(senderId, listOfActors) {
  // Query Bing for actors info and populate the actorsInro array
  let actorsInfo = []
  Bing.images(listOfActors[0], {
    top: 5,   // Number of results (max 50)
    skip: 3    // Skip first 3 result
  }, function (error, res, body) {
    actorsInfo[0] = {
      name: listOfActors[0],
      image: body.value[0].contentUrl
    }
    Bing.images(listOfActors[1], {
      top: 5,
      skip: 3
    }, function () {

      actorsInfo[1] = {
        name: listOfActors[1],
        image: body.value[0].contentUrl
      }

      let introductionMessage = 'There are multiple actors on screen right now 😎 \n Which one are you interested in?' // change to user name
      let listOfActorsMessage = messageTemplate.createGenericTemplate(
        [
          {
            "title": actorsInfo[0].name,
            "image_url": actorsInfo[0].image,
            "subtitle": 'DESCRIPTION HERE',
            "buttons": [{ "title": 'Choose ✔︎', "payload": 'SINGLE_ACTOR' }]
          },
          {
            "title": actorsInfo[1].name,
            "image_url": actorsInfo[1].image,
            "subtitle": 'DESCRIPTION HERE',
            "buttons": [{ "title": 'Choose ✔︎', "payload": 'SINGLE_ACTOR' }]
          }
        ]
      )

      reply(senderId, introductionMessage, function () {
        reply(senderId, listOfActorsMessage)
      })
    })
  })
}

function sendFavoriteActors(senderId, listOfActors) {
  let actorsInfo = []
  Bing.images(listOfActors[0], {
    top: 5,   // Number of results (max 50)
    skip: 3    // Skip first 3 result
  }, function (error, res, body) {
    actorsInfo[0] = {
      name: listOfActors[0],
      image: body.value[0].contentUrl
    }
    Bing.images(listOfActors[1], {
      top: 5,
      skip: 3
    }, function () {

      actorsInfo[1] = {
        name: listOfActors[1],
        image: body.value[0].contentUrl
      }

      let listOfActorsMessage = messageTemplate.createGenericTemplate(
        [
          {
            "title": actorsInfo[0].name,
            "image_url": actorsInfo[0].image,
            "subtitle": 'DESCRIPTION HERE'
          },
          {
            "title": actorsInfo[1].name,
            "image_url": actorsInfo[1].image,
            "subtitle": 'DESCRIPTION HERE'
          }
        ]
      )

      reply(senderId, {}, function () {
        reply(senderId, listOfActorsMessage)
      })
    })
  })
}

function sendNextStepMessage(senderId) {
  let nextStepMessage = {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'button',
        text: 'What should we do now?',
        buttons: [
          {
            type: 'postback',
            title: 'TV Channels',
            payload: 'TV_CHANNELS'
          },
          {
            type: 'postback',
            title: 'My Favorites ❤️',
            payload: 'FAVORITES' // to define
          }
        ]
      }
    }
  }
  reply(senderId, nextStepMessage)
}

// Send a response to user
function reply(senderId, response, cb) {
  let messageData = {}
  if (typeof (response) === 'string') {
    messageData.text = response
  } else {
    messageData = response
  }

  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: {
      recipient: { id: senderId },
      message: messageData,
    }
  }, function (error, response, body) {
    if (error) {
      console.log('Error sending messages: ', error)
    } else if (response.body.error) {
      console.log('Error: ', response.body.error)
    }
    return cb && cb(null, body)
  })
}

