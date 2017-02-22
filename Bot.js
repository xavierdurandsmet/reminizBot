const request = require('request')
const Bing = require('node-bing-api')({ accKey: process.env.BING_ACCESS_KEY }) // put this in .env
const MovieDB = require('moviedb')(process.env.MOVIE_DB_ACCESS_KEY); // put this in .env
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
  User.findOrCreate(senderId, function (user) { // Find the current user first_name
    let introductionMessage = `Hi ${user.fb_first_name} 👋 Pick a TV channel to know who's on screen in real time ⚡️` // Greet user by its first name
    let channels = ['CNN', 'DISNEY_CHANNEL']
    let listOfChannelsMessage = messageTemplate.createGenericTemplate(
      [
        {
          "title": channels[0].replace("_", " "),
          "image_url": 'https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcQn4O8zXpRf9xbk8vy0LdrXqa8jXUduoKdlc2YfrsL5cKxLBegR_e89HXg',
          "subtitle": 'The news channel',
          "buttons": [{ "title": 'Choose ✔︎', "payload": channels[0] }]
        },
        {
          "title": channels[1].replace("_", " "),
          "image_url": 'http://vignette4.wikia.nocookie.net/logopedia/images/8/87/Disney_Channel_2014.png/revision/latest?cb=20140522224840',
          "subtitle": 'Children love it',
          "buttons": [{ "title": 'Choose ✔︎', "payload": channels[1] }]
        }
      ]
    )

    reply(senderId, introductionMessage, function () {
      reply(senderId, listOfChannelsMessage)
    })
  })
}

function sendSingleActor(senderId, actorName, channel) { // Send an actor's template

  let actor = {
    name: actorName,
    channel: channel.replace("_", " ") // prettify the channel name
  };
  let introductionMessage = channel ? `${actor.name} is on screen on ${actor.channel} ❤️` : `${actor.name} ❤️`;
  let defaultBingNewsImage = 'https://s3.amazonaws.com/images.seroundtable.com/t-bing-news-1300711212.png'; // in case there is no image for the news

  Bing.images(actor.name, { top: 15, skip: 3 },
    function (error, res, body) {
      checkForErrors(error);
      let options = { query: actor.name, format: 'html', summaryOnly: true, lang: 'en' } // get the Wiki summary
      wikipedia.searchArticle(options, function (err, htmlWikiText) {
        checkForErrors(err);
        if (htmlWikiText) {
          actor.descriptionSummary = htmlWikiText.replace(/<[^>]*>?/gm, '') // to improve: to remove imperfections in parsing
        }
        actor.image = body.value[0].contentUrl;

        MovieDB.searchPerson({ query: actor.name }, (err, res) => {
          checkForErrors(err);
          actor.id = res.results[0].id;

          MovieDB.personMovieCredits({ id: actor.id }, (err, res) => {
            checkForErrors(err);
            actor.movie = res.cast[0]

            Bing.images(actor.movie.original_title + 'movie', { top: 15, skip: 3 }, // get image of the first movie to display
              function (error, res, body) {
                checkForErrors(err);
                actor.movie.image = body.value[0].contentUrl;

                Bing.news(actor.name, { top: 10, skip: 3 }, function (error, res, body) {
                  checkForErrors(err);
                  actor.news = body.value[0];
                  actor.description = messageTemplate.createListTemplate( // List template with the actor profile
                    [
                      {
                        "title": actor.name,
                        "image_url": actor.image,
                        "subtitle": actor.descriptionSummary,
                        "default_action": { url: 'https://en.wikipedia.org/wiki/' + actor.name, fallback_url: 'https://en.wikipedia.org/wiki/' + actor.name },
                        "buttons": [{ "type": "postback", "title": 'Bookmark ❤️', "payload": "BOOKMARK" }]
                      },
                      {
                        "title": 'Filmography',
                        "image_url": actor.movie.image,
                        "subtitle": actor.movie.original_title,
                        "default_action": { url: 'https://en.wikipedia.org/wiki/' + actor.movie.original_title, fallback_url: 'https://en.wikipedia.org/wiki/' + actor.movie.original_title },
                        "buttons": [{ "type": "web_url", "title": 'See More!', "url": "https://www.themoviedb.org/person/" + actor.id }]
                      },
                      {
                        // Bug with actor.news
                        "title": 'News',
                        "image_url": defaultBingNewsImage,
                        "subtitle": actor.news.name,
                        "default_action": { url: 'https://en.wikipedia.org/wiki/' + actor, fallback_url: 'https://en.wikipedia.org/wiki/' + actor }, // to change to next line but currently not working
                        // "default_action": { url: actor.news.url, fallback_url: actor.news.url},
                        "buttons": [{ "type": "web_url", "title": 'See More!', "url": actor.news.url }]
                      }
                    ]
                  )
                  reply(senderId, introductionMessage, function () { // Sending the messages to the user, in the right order
                    reply(senderId, actor.description, function () {
                      sendNextStepMessage(senderId, actor)
                    })
                  })
                })
              })
          })
        })
      })
    })
}

function sendManyActors(senderId, listOfActors, channelName) {
  let introductionMessage = 'There are multiple actors on screen right now 😎 \n Which one are you interested in?' // change to user name
  sendGenericTemplate(senderId, listOfActors, introductionMessage, channelName)
}

// THIS FUNCTION ALWAYS CRASHES
function sendFavoriteActors(senderId, listOfActors) {
  let introductionMessage = "Here will be your favorite actors ❤️"
  if (listOfActors.length < 1) {
    sendNextStepMessage(senderId); // temp solution
  }
  sendGenericTemplate(senderId, listOfActors, introductionMessage);
}

function sendGenericTemplate(senderId, listOfActors, introductionMessage, channelName) {
  let actorsInfo = [];
  Bing.images(listOfActors[0], { top: 5, skip: 3 },
    function (error, res, body) {
      actorsInfo[0] = {
        name: listOfActors[0],
        image: body.value[0].contentUrl
      }
      Bing.images(listOfActors[1], { top: 5, skip: 3 },
        function (error, res, body) {
          actorsInfo[1] = {
            name: listOfActors[1],
            image: body.value[0].contentUrl
          }

          let listOfActorsMessage = messageTemplate.createGenericTemplate(
            [
              {
                "title": actorsInfo[0].name,
                "image_url": actorsInfo[0].image,
                "subtitle": 'DESCRIPTION HERE',
                "buttons": [{ "title": 'Choose ✔︎', "payload": 'SINGLE_ACTOR,' + actorsInfo[0].name + "," + (channelName ? channelName : "") }]
              },
              {
                "title": actorsInfo[1].name,
                "image_url": actorsInfo[1].image,
                "subtitle": 'DESCRIPTION HERE',
                "buttons": [{ "title": 'Choose ✔︎', "payload": 'SINGLE_ACTOR,' + actorsInfo[1].name + "," + (channelName ? channelName : "") }]
              }
            ]
          )

          reply(senderId, introductionMessage, function () {
            reply(senderId, listOfActorsMessage)
          })
        })
    })
}

// Generic follow up message
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

function reply(senderId, response, cb) { // Send a response to user
  let messageData = {};
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

function checkForErrors(err) {
  if (err) {
    console.log('An error occurred', err)
    return err;
  }
}

