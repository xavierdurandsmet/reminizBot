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
      if (!JSONResponse[i].image) {
        newsArticle.image_url = "https://www.google.fr/url?sa=i&rct=j&q=&esrc=s&source=images&cd=&cad=rja&uact=8&ved=0ahUKEwiyro22s7HSAhXMwBQKHQEkDvQQjRwIBw&url=http%3A%2F%2Fona15.journalists.org%2Fsponsors%2Fbing-news%2F&psig=AFQjCNHfW_aTfMwiqhTZmWjONp_U1n3nUA&ust=1488323542794389";
      } else if (JSONResponse[i].image.thumbnail.contentUrl) {
        newsArticle.image_url = JSONResponse[i].image.thumbnail.contentUrl; // get better quality images?
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

