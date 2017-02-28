const request = require('request')
const Bing = require('node-bing-api')({ accKey: process.env.BING_ACCESS_KEY }) // put this in .env
const MovieDB = require('moviedb')(process.env.MOVIE_DB_ACCESS_KEY); // put this in .env
const wikipedia = require('wikipedia-js')
const User = require('./app/models/user')
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN
const messageTemplate = require('./messageTemplate')
const amazon = require('amazon-product-api');
const client = amazon.createClient({
  awsId: process.env.AMAZON_ID,
  awsSecret: process.env.AMAZON_SECRET_KEY
});

module.exports = {
  sendChannelsList: sendChannelsList,
  sendSingleActor: sendSingleActor,
  sendManyActors: sendManyActors,
  sendFavoriteActors: sendFavoriteActors,
  sendActorIsBookmarked: sendActorIsBookmarked,
  sendActorIsUnbookmarked: sendActorIsUnbookmarked,
  sendAmazonProducts: sendAmazonProducts,
  reply: reply,
  sendNextStepMessage: sendNextStepMessage
}

function sendChannelsList(senderId) {
  User.findOrCreate(senderId, function (user) {
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
    });
  });
}

function sendSingleActor(senderId, actorName) { // Send an actor's template

  let actor = {
    name: actorName
  };
  let introductionMessage = `${actor.name} is live ❤️`;
  let defaultBingNewsImage = 'http://news.thewindowsclubco.netdna-cdn.com/wp-content/uploads/2015/01/Bing-News.jpg'; // in case there is no image for the news
  console.log(actor.name)
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
                        "buttons": [{ "type": "postback", "title": 'Bookmark ❤️', "payload": "BOOKMARK " + actor.name }]
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
                      },
                      {
                        "title": 'Products',
                        "image_url": 'https://images-na.ssl-images-amazon.com/images/G/01/gc/designs/livepreview/a_generic_white_10_us_noto_email_v2016_us-main._CB277146614_.png',
                        "subtitle": 'Find Amazon products related to this actor',
                        "default_action": { url: 'https://en.wikipedia.org/wiki/' + actor.movie.original_title, fallback_url: 'https://en.wikipedia.org/wiki/' + actor.movie.original_title },
                        "buttons": [{ "type": "postback", "title": 'See More Products!', "payload": "AMAZON " + actor.name }]
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

function sendManyActors(user, listOfActors) {
  let introductionMessage = 'There are multiple actors on screen right now 😎 \n Which one are you interested in?' // change to user name
  sendCarouselOfActors(user, listOfActors, introductionMessage)
}

// THIS FUNCTION ALWAYS CRASHES
function sendFavoriteActors(user) {
  if (user.favorites.length === 0) {
    reply(user.fb_id, "You don't have any favorites yet 😞", function () {
      reply(user.fb_id, "But don't be sad 😄", function () {
        reply(user.fb_id, "Click on 'Bookmark ❤️' to add an actor to your favorites, like a pro 😎", function () {
          sendNextStepMessage(user.fb_id);
        })
      })
    })
  } else {
    let introductionMessage = "And your favorite actors are...(drumroll) 🙌️"
    sendCarouselOfActors(user, user.favorites, introductionMessage);
  }
}

function sendActorIsBookmarked(senderId, newFavorite) {
  let introductionMessage = `${newFavorite} is now bookmarked 😎 You can access bookmarked actors by clicking on "My favorites" ❤️`;
  reply(senderId, introductionMessage, function () {
    sendNextStepMessage(senderId);
  });
}

function sendActorIsUnbookmarked(senderId, actorName) {
  let introductionMessage = `${actorName} successfully unbookmarked ❌️`;
  reply(senderId, introductionMessage, function () {
    sendNextStepMessage(senderId);
  });
}


function sendAmazonProducts(senderId, actorName) {
  client.itemSearch({ // do the Amazon call here rather than in sendSingleActor because the latter is already overloaded
    searchIndex: 'All',
    keywords: actorName, // we might have to change the query to adapt to Jack's will
    responseGroup: 'ItemAttributes,Offers,Images'
  }, function (err, results) {
    checkForErrors(err);
    let productList = [];
    for (let i = 0; i <= 4; i++) {
      let product = {};
      product.title = "FIND WHICH PROPERTY OF THE JSON FITS BEST FOR TITLE";
      product.image_url = results[i].LargeImage[0].URL[0];
      product.subtitle = results[0].OfferSummary[0].LowestNewPrice[0].FormattedPrice[0];
      product.buttonsURL = [{ "title": 'Buy it!', "url": results[i].DetailPageURL[0] ? results[i].DetailPageURL[0] : 'https://en.wikipedia.org/' }]
      productList.push(product);
    }
    let productTemplate = messageTemplate.createGenericTemplate(productList)
    reply(senderId, productTemplate, function () {
      sendNextStepMessage(senderId)
    })
  })
}

function sendCarouselOfActors(currentUser, listOfActors, introductionMessage) {
  let elements = [];
  let counter = 0;
  getActorsInfo(listOfActors, function(actorsInfo) {
    for (let i = 0; i < actorsInfo.length; i++) {
      let element = {
        title: actorsInfo[i].name,
        image_url: actorsInfo[i].image,
        subtitle: 'DESCRIPTION HERE',
      }
      console.log(currentUser.favorites.indexOf(actorsInfo[i].name))
      if (currentUser.favorites.indexOf(actorsInfo[i].name) === -1) {
        element.buttons = [
            {
              "title": "Choose ✔︎",
              "payload": "SINGLE_ACTOR," + actorsInfo[i].name
            },
            {
              "title": "Bookmark ❤️",
              "payload": "BOOKMARK," + actorsInfo[i].name
            }
          ]
        } else {
        element.buttons = [
            {
              "title": "Choose ✔︎",
              "payload": "SINGLE_ACTOR," + actorsInfo[i].name
            },
            {
              "title": "Unbookmark ❌",
              "payload": "UNBOOKMARK," + actorsInfo[i].name
            }
          ]
        }
      elements.push(element);
      counter += 1;
      if (counter === actorsInfo.length) {
        let listOfActorsMessage = messageTemplate.createGenericTemplate(elements);
        reply(currentUser.fb_id, introductionMessage, function () {
          reply(currentUser.fb_id, listOfActorsMessage);
        })
      }
    }
  });
}

function getActorsInfo(listOfActors, callback) {
  let actorsInfo = [];
  let counter = 0;
  for (let i = 0; i < listOfActors.length; i++) {
    Bing.images(listOfActors[i], { top: 5, skip: 3 }, function (error, res, body) {
      checkForErrors(error);
      actorsInfo.push({
        name: listOfActors[i],
        image: body.value ? body.value[i].contentUrl : "" // temp fix, change the lib
      });
      counter += 1;
      if (counter === listOfActors.length) {
        return callback(actorsInfo);
      }
    });
  }
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

