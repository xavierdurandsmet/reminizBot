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
  sendAmazonProducts: sendAmazonProducts,
  sendCarouselOfFilms: sendCarouselOfFilms,
  sendCarouselOfNews: sendCarouselOfNews
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

function sendSingleActor(senderId, actorName) { // Send an actor's template

  let actor = { name: actorName },
      bingNewsImage = 'http://news.thewindowsclubco.netdna-cdn.com/wp-content/uploads/2015/01/Bing-News.jpg', // in case there is no image for the news
      filmImage = 'https://pbs.twimg.com/profile_images/789117657714831361/zGfknUu8.jpg',
      introductionMessage = `${actor.name} is live ❤️`,
      productImage = 'https://images-na.ssl-images-amazon.com/images/G/01/gc/designs/livepreview/a_generic_white_10_us_noto_email_v2016_us-main._CB277146614_.png'

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
              "image_url": filmImage,
              "subtitle": 'Find Movies related to ' + actor.name,
              "default_action": { url: 'https://www.themoviedb.org/person/' + actor.id, fallback_url: 'https://www.themoviedb.org/person/' + actor.id },
              "buttons": [{ "type": "postback", "title": 'See Films 🎬', "payload": "FILMOGRAPHY " + actor.name }]
            },
            {
              "title": 'News',
              "image_url": bingNewsImage,
              "subtitle": 'Find News related to ' + actor.name,
              "default_action": { url: 'https://en.wikipedia.org/wiki/' + actor, fallback_url: 'https://en.wikipedia.org/wiki/' + actor }, // to change to next line but currently not working
              "buttons": [{ "type": "postback", "title": 'Read News 📰', "payload": "NEWS " + actor.name }]
            },
            {
              "title": 'Products',
              "image_url": productImage,
              "subtitle": 'Find Amazon products related to ' + actor.name,
              "default_action": { url: 'https://en.wikipedia.org/wiki/' + actor.name, fallback_url: 'https://en.wikipedia.org/wiki/' + actor.name }, // change this?
              "buttons": [{ "type": "postback", "title": 'See Products 🛒', "payload": "AMAZON " + actor.name }]
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
}

function sendManyActors(senderId, listOfActors) {
  let introductionMessage = 'There are many actors on screen right now 😎 Which one are you interested in?'
  sendCarouselOfActors(senderId, listOfActors, introductionMessage)
}

// THIS FUNCTION ALWAYS CRASHES
function sendFavoriteActors(user) {
  let introductionMessage = "And your favorite actors are...(drumroll) 🙌️"
  sendCarouselOfActors(user.fb_id, user.favorites, introductionMessage);
}

function sendActorIsBookmarked(senderId, newFavorite) {
  let introductionMessage = `${newFavorite} is now bookmarked 😎 You can access bookmarked actors by clicking on "My favorites" ❤️`;
  reply(senderId, introductionMessage, function () {
    sendNextStepMessage(senderId);
  });
}

function sendCarouselOfFilms(senderId, actorName) {
  let actor = {};
  MovieDB.searchPerson({ query: actorName }, (err, res) => {
    checkForErrors(err);
    actor.id = res.results[0].id;
    MovieDB.personMovieCredits({ id: actor.id }, (err, res) => {
      checkForErrors(err);
      let JSONResponse = res.cast;
      let filmList = [];
      for (let i = 0; i <= 4; i++) {
        let film = {
          id: JSONResponse[i].id,
          title: JSONResponse[i].title,
          image_url: 'https://image.tmdb.org/t/p/w500/' + JSONResponse[i].poster_path,
          subtitle: JSONResponse[i].release_date ? JSONResponse[i].release_date.substr(0, 4) : "",
          buttonsURL: [{ "title": 'See More', "url": "https://www.themoviedb.org/person/" + actor.id }] // change to specific movi,
        }
        filmList.push(film)
      }
      let filmListToPush = [];
      filmList.forEach(function (film) { // use forEach to create its own scope, for the async call
        MovieDB.movieTrailers({ id: film.id }, function (err, res) {
          checkForErrors(err);
          console.log("res ", res)
          film.trailer = res.youtube[0] ? "https://www.youtube.com/watch?v=" + res.youtube[0].source : "https://www.youtube.com";
          film.buttonsURL.push({ "title": 'Watch Trailer', "url": film.trailer })
          filmListToPush.push(film);
          if (filmListToPush.length === 5) { // if statement inside the forEach to not have asynchronous pbs
            let filmTemplate = messageTemplate.createGenericTemplate(filmListToPush)
            reply(senderId, filmTemplate, function () {
              sendNextStepMessage(senderId)
            })
          }
        })
      })
    })
  })
}

function sendCarouselOfNews(senderId, actorName) {
  let actor = {};
  Bing.news(actorName, { top: 10, skip: 3, safeSearch: "Moderate" }, function (error, res, body) {
    checkForErrors(error);
    let JSONResponse = body.value;
    let newsList = [];
    for (let i = 0; i <= 4; i++) {
      let newsArticle = {};
      newsArticle.title = JSONResponse[i].name;
      if (JSONResponse[i].image.thumbnail.contentUrl) {
        newsArticle.image_url = JSONResponse[i].image.thumbnail.contentUrl; // get better quality images?
      } else {
        newsArticle.image_url = "data:image/png;base64,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";
      }
      newsArticle.subtitle = JSONResponse[i].description;
      newsArticle.buttonsURL = [{ "title": 'Read More', "url": JSONResponse[i].url }]; // change to specific movie
      newsList.push(newsArticle);
    }
    let newsTemplate = messageTemplate.createGenericTemplate(newsList)
    reply(senderId, newsTemplate, function () {
      sendNextStepMessage(senderId)
    })
  })
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
      if (results[i].OfferSummary[0].TotalNew[0] != 0) { // make sure the product is available or will return undefined
        let product = {};
        product.title = results[i].ItemAttributes[0].Title[0];
        product.image_url = results[i].LargeImage[0].URL[0];
        product.subtitle = results[i].OfferSummary[0].LowestNewPrice[0].FormattedPrice[0];
        product.buttonsURL = [{ "title": 'Buy Now', "url": results[i].DetailPageURL[0] ? results[i].DetailPageURL[0] : 'https://www.amazon.com/' }] // do a more precise search query
        productList.push(product);
      }
    }
    let productTemplate = messageTemplate.createGenericTemplate(productList)
    reply(senderId, productTemplate, function () {
      sendNextStepMessage(senderId)
    })
  })
}

function sendCarouselOfActors(senderId, listOfActors, introductionMessage) {
  let elements = [];
  let counter = 0;
  getActorsInfo(listOfActors, function (actorsInfo) {
    for (let i = 0; i < actorsInfo.length; i++) {
      elements.push({
        "title": actorsInfo[i].name,
        "image_url": actorsInfo[i].image,
        "subtitle": 'DESCRIPTION HERE',
        "buttons": [
          {
            "title": 'Choose ✔︎',
            "payload": 'SINGLE_ACTOR,' + actorsInfo[i].name
          },
          {
            "title": 'Bookmark ❤️︎',
            "payload": 'BOOKMARK,' + actorsInfo[i].name // Or unbookmark if already bookmarked
          }
        ]
      });
      counter = counter + 1;
      if (counter === actorsInfo.length) {
        let listOfActorsMessage = messageTemplate.createGenericTemplate(elements);
        reply(senderId, introductionMessage, function () {
          reply(senderId, listOfActorsMessage);
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
      counter = counter + 1;
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
            title: 'TV Channels 📺',
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

