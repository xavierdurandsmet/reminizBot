const request = require('request')
const Bing = require('node-bing-api')({ accKey: '00c98764dd9d440ba8d15bf161787d0e' })
const wikipedia = require('wikipedia-js');
const FACEBOOK_BASE_URL = 'https://graph.facebook.com/v2.6/me/';
const THREAD_SETTINGS_URL = FACEBOOK_BASE_URL + 'thread_settings';
const MESSAGES_URL = FACEBOOK_BASE_URL + 'messages';
const token = process.env.PAGE_ACCESS_TOKEN

module.exports = {
  sendChannelsList: sendChannelsList,
  sendSingleActor: sendSingleActor,
  sendManyActors: sendManyActors
}

function sendChannelsList(sender) {
  let introductionMessage = "Choose a TV channel to know who's on screen, in real time ⚡️" // change to user name
  let listOfChannelsMessage = {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'generic',
        elements: [
          {
            title: 'CNN',
            image_url: 'https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcQn4O8zXpRf9xbk8vy0LdrXqa8jXUduoKdlc2YfrsL5cKxLBegR_e89HXg',
            subtitle: 'The news channel',
            buttons: [
              {
                type: 'postback',
                title: 'Choose ✔︎',
                payload: 'SINGLE_ACTOR' // to replace with reminiz API
              }
            ]
          },
          {
            title: 'Disney Channel',
            image_url: 'http://vignette4.wikia.nocookie.net/logopedia/images/8/87/Disney_Channel_2014.png/revision/latest?cb=20140522224840',
            subtitle: 'Children love it',
            buttons: [
              {
                type: 'postback',
                title: 'Choose ✔︎',
                payload: 'MANY_ACTORS'
              }
            ]
          }
        ]
      }
    }
  }
  reply(sender, introductionMessage, function () {
    reply(sender, listOfChannelsMessage)
  });
}

// Send an actor's template
function sendSingleActor(sender, actorNameQuery, channel) {
  Bing.images(actorNameQuery, {
    top: 15,   // Number of results (max 50)
    skip: 3    // Skip first 3 result
  }, function (error, res, body) {

    // // get the Wiki summary
    let options = { query: actorNameQuery, format: 'html', summaryOnly: true, lang: 'en' }
      wikipedia.searchArticle(options, function (err, htmlWikiText) {
        if (err) {
            console.log('An error occurred', err)
            return
        }
        let descriptionSummary = htmlWikiText.replace(/<[^>]*>?/gm, ''); // to improve: to remove imperfections in parsing
        let introductionMessage = `${actorNameQuery} is on screen on ${channel} ❤️`
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
                  payload: 'USER_DEFINED_PAYLOAD' // to define
                }
              ]
            }
          }
        }
        // List template with the actor profile
        let actorDescription = {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'list',
              elements: [
                {
                  title: actorNameQuery,
                  image_url: body.value[0].contentUrl,
                  subtitle: descriptionSummary, // improve the parsing
                  default_action: {
                    type: 'web_url',
                    url: 'https://c65e40c2.ngrok.io', // link to specific wikipedia page
                    messenger_extensions: true,
                    webview_height_ratio: 'tall',
                    fallback_url: 'https://c65e40c2.ngrok.io'
                  },
                  buttons: [
                    {
                      title: 'View Now!',
                      type: 'postback',
                      payload: 'DEVELOPER_DEFINED_PAYLOAD',
                      webview_height_ratio: 'tall'
                    }
                  ]
                },
                {
                  title: 'Filmography',
                  image_url: 'https://c65e40c2.ngrok.io',
                  subtitle: '100% Cotton, 200% Comfortable',
                  default_action: {
                    type: 'web_url',
                    url: 'https://c65e40c2.ngrok.io',
                    messenger_extensions: true,
                    webview_height_ratio: 'tall',
                    fallback_url: 'https://c65e40c2.ngrok.io'
                  },
                  buttons: [
                    {
                      title: 'Shop Now',
                      type: 'web_url',
                      url: 'https://c65e40c2.ngrok.io',
                      messenger_extensions: true,
                      webview_height_ratio: 'tall',
                      fallback_url: 'https://c65e40c2.ngrok.io'
                    }
                  ]
                }
              ]
            }
          }
        }

      });
  });
}

function sendManyActors(sender, listOfActors) { // Changed the name of the function

  let actorsInfo = [];
  // Query Bing for actors info
  Bing.images(listOfActors[0], {
    top: 5,   // Number of results (max 50)
    skip: 3    // Skip first 3 result
  }, function (error, res, body) {

    actorsInfo[0] = {
        name: listOfActors[0],
        image: body.value[0].contentUrl
    };

    Bing.images(listOfActors[1], {
        top: 5,   // Number of results (max 50)
        skip: 3    // Skip first 3 result
    }, function (error, res, body) {

        actorsInfo[1] = {
          name: listOfActors[1],
          image: body.value[0].contentUrl
        }

        let introductionMessage = 'There are multiple actors on screen right now 😎 \n Which one are you interested in?' // change to user name
        let listOfActorsMessage = {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: [
                {
                  title: actorsInfo[0].name,
                  image_url: actorsInfo[0].image,
                  subtitle: 'DESCRIPTION HERE',
                  buttons: [
                    {
                      type: 'postback',
                      title: 'Choose ✔︎',
                      payload: 'SINGLE_ACTOR'
                    }
                  ]
                },
                {
                  title: actorsInfo[1].name,
                  image_url: actorsInfo[1].image,
                  subtitle: 'DESCRIPTION HERE',
                  buttons: [
                    {
                      type: 'postback',
                      title: 'Choose ✔︎',
                      payload: 'SINGLE_ACTOR'
                    }
                  ]
                }
              ]
            }
          }
        }
        reply(sender, introductionMessage, function () {
            reply(sender, listOfActorsMessage);
        });
    })
  })
}

// Function to handle incoming messages
function reply(sender, response, cb) {

    let messageData = {};

    if (typeof (response) === 'string') {
        messageData.text = response;
    } else {
        messageData = response;
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
        cb && cb(null, body);
    })
}

