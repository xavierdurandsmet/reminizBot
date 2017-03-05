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
const youtubeBaseUri = 'https://www.googleapis.com/youtube/v3/search';
const youtubeApiKey = process.env.YOUTUBE_API_KEY;

const Actor = require('./app/models/actor');

module.exports = {
  sendChannelsList: sendChannelsList,
  sendSingleActor: sendSingleActor,
  sendManyActors: sendManyActors,
  sendFavoriteActors: sendFavoriteActors,
  sendActorIsBookmarked: sendActorIsBookmarked,
  sendActorIsUnbookmarked: sendActorIsUnbookmarked,
  sendAmazonProducts: sendAmazonProducts,
  reply: reply,
  sendNextStepMessage: sendNextStepMessage,
  sendCarouselOfFilms: sendCarouselOfFilms,
  sendCarouselOfNews: sendCarouselOfNews,
  checkForErrors: checkForErrors,
  sendInstagramFeed: sendInstagramFeed,
  sendYoutubeVideos: sendYoutubeVideos
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
      setTimeout(function () {
        reply(senderId, listOfChannelsMessage)
      }, 2000);
    });
  });
}
// Send a list template containing the actor profile
function sendSingleActor(senderId, actorName) {
  Actor.findOne({ full_name: actorName}, function(error, actor) {
    checkForErrors(error);
    if (!actor) {
      console.log('Actor is empty or undefined');
      return;
    }
    let bingNewsImage = 'http://news.thewindowsclubco.netdna-cdn.com/wp-content/uploads/2015/01/Bing-News.jpg',
      biography = actor.full_name,
      filmImage = 'https://pbs.twimg.com/profile_images/789117657714831361/zGfknUu8.jpg',
      instagramLogo = 'https://images.seeklogo.net/2016/06/Instagram-logo.png',
      introductionMessage = `${actor.full_name} is live ❤️`,
      productImage = 'https://image.flaticon.com/icons/png/512/2/2772.png',
      productName = 'Best sellers',
      youtubeLogo = 'https://www.youtube.com/yt/brand/media/image/YouTube-icon-full_color.png'

  Bing.images(actor.full_name, { top: 15, skip: 3 },
    function (error, res, body) {
      checkForErrors(error);
      let options = { query: actor.full_name, format: 'html', summaryOnly: true, lang: 'en' } // get the Wiki summary
      wikipedia.searchArticle(options, function (err, htmlWikiText) {
        checkForErrors(err);
        if (htmlWikiText) {
          actor.descriptionSummary = htmlWikiText.replace(/<[^>]*>?/gm, '') // to improve: to remove imperfections in parsing
        }
        actor.image = body.value[0].contentUrl; // put a default image if JSON is incorrect
           // >If it's an actor then send filmography

        let elements = [
          {
            "title": biography,
            "subtitle": '#actor #35 #American', // To make dynamic
            "image_url": actor.image,
            "default_action": { url: 'https://en.wikipedia.org/wiki/' + actor.full_name, fallback_url: 'https://en.wikipedia.org/wiki/' + actor.full_name },
            "buttons": [{ "type": "postback", "title": 'Bookmark ❤️', "payload": "BOOKMARK " + actor.full_name }]
          },
          {
            "title": 'Latest News',
            "image_url": bingNewsImage,
            "default_action": { url: 'https://en.wikipedia.org/wiki/' + actor, fallback_url: 'https://en.wikipedia.org/wiki/' + actor }, // to change to next line but currently not working
            "buttons": [{ "type": "postback", "title": 'Read News', "payload": "NEWS " + actor.full_name }]
          }
        ];
        // Send filmography in 1st position if it's an actor
        if (actor.is_actor) {
          elements.splice(
            1,
            0,
            {
              "title": 'Famous Movies',
              "image_url": filmImage,
              "default_action": { url: `https://www.themoviedb.org/person/${actor.id}`, fallback_url: `https://www.themoviedb.org/person/${actor.id}` },
              "buttons": [{ "type": "postback", "title": 'See Films', "payload": `FILMOGRAPHY ${actor.full_name}` }]
            }
          );
        } else {
          elements.splice(
            1,
            0,
            {
              "title": productName,
              "image_url": productImage,
              "default_action": { url: 'https://www.amazon.com', fallback_url: 'https://www.amazon.com' },
              "buttons": [{ "type": "postback", "title": 'See Products', "payload": `AMAZON ${actor.full_name}` }]
            }
          );

        }
        // Include social accounts in 3rd position if they exist
        if (actor.instagram) {
          elements.splice(
            3,
            0,
            {
              "title": 'Social',
              "image_url": instagramLogo,
              "default_action": { url: `https://www.instagram.com/${actor.instagram}`, fallback_url: `https://www.instagram.com/` },
              "buttons": [{ "type": "postback", "title": 'See Instagram', "payload": `INSTAGRAM ${actor.full_name}` }]
            }
          );
        } else {
          elements.splice(
            3,
            0,
            {
              "title": 'Videos',
              "image_url": youtubeLogo,
              "default_action": { url: `https://www.youtube.com/results?search_query=${actor.full_name}`, fallback_url: `https://www.youtube.com/` },
              "buttons": [{ "type": "postback", "title": 'More', "payload": `YOUTUBE ${actor.full_name}` }]
            }
          );
        }
        // Only render the first 4 elements
        actor.description = messageTemplate.createListTemplate(elements.slice(0, 4));
        reply(senderId, introductionMessage, function () {
          reply(senderId, actor.description)
          sendNextStepMessage(senderId, actor)
        })
      })
    })
  });
}

function sendManyActors(user, listOfActors) {
  let introductionMessage = 'There are many actors on screen right now 😎 Which one are you interested in?'
  sendCarouselOfActors(user, listOfActors, introductionMessage)
}

function sendFavoriteActors(user) {
  if (user.favorites.length === 0) {
    reply(user.fb_id, "You don't have any favorites yet 😞", function () {
      reply(user.fb_id, "But don't be sad 😄", function () {
        setTimeout(function () {
          reply(user.fb_id, "Click on 'Bookmark ❤️' to add an actor to your favorites, like a pro 😎", function () {
          }, 2000);
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
    for (let i = 0; i < 10; i++) {
      if (results[i] && results[i].OfferSummary[0].TotalNew[0] != 0) { // make sure the product is available or will return undefined
        let product = {};
        product.title = results[i].ItemAttributes[0].Title[0];
        product.image_url = results[i].LargeImage[0].URL[0];
        product.subtitle = results[i].OfferSummary[0].LowestNewPrice[0].FormattedPrice[0];
        product.buttonsURL = [{ "title": 'Buy Now', "url": results[i].DetailPageURL[0] ? results[i].DetailPageURL[0] : 'https://www.amazon.com/' }] // do a more precise search query
        productList.push(product);
      }
    }
    let productTemplate = messageTemplate.createGenericTemplate(productList);
    reply(senderId, productTemplate, function () {
      sendNextStepMessage(senderId)
    })
  })
}

function sendInstagramFeed(senderId, instagramHandle) {
  let elements = [];
  request(`http://www.instagram.com/${instagramHandle}/media/`, function (error, response, body) {
    checkForErrors(error);
    const items = JSON.parse(body).items;
    if (response && response.statusCode === 200) {
      for (let i = 0; i < 10; i++) {
        let card = {};
          if (items[i].caption === null) {
            card.title = items[i].user.full_name;
          } else {
            card.title = items[i].caption.text;
          }
          card.item_url = items[i].link;
          card.image_url = items[i].images.standard_resolution.url;
          card.subtitle = `❤️ ${items[i].likes.count}`;
        elements.push(card);
      }
      let instagramTemplate = messageTemplate.createGenericTemplate(elements);
      reply(senderId, `Here's ${instagramHandle} on Instagram:`, function () {
        reply(senderId, instagramTemplate, function () {
          sendNextStepMessage(senderId);
        });
      });
    } else {
      reply(senderId, 'Sorry, there was an error with the Instagram feed...', function () {
        sendNextStepMessage(senderId);
      });
    }
  });
}
function sendYoutubeVideos(senderId, actorName) {
  let elements = [];
  request(`${youtubeBaseUri}?part=snippet&type=video&q=${actorName}&key=${youtubeApiKey}`, function (error, response, body) {
    checkForErrors(error);
    const items = JSON.parse(body).items;
    if (response && response.statusCode === 200) {
      for (let i = 0; i < 6; i++) {
        let card = {};
        if (items[i]) {
          card.title = items[i].snippet.title;
          card.item_url = `https://www.youtube.com/watch?v=${items[i].id.videoId}`;
          card.image_url = items[i].snippet.thumbnails.medium.url;
          card.subtitle = items[i].snippet.description;
        elements.push(card);
        }
      }
      let youtubeTemplate = messageTemplate.createGenericTemplate(elements);
      reply(senderId, `Here's ${actorName} on Youtube:`, function () {
        reply(senderId, youtubeTemplate, function () {
          sendNextStepMessage(senderId);
        });
      });
    } else {
      reply(senderId, 'Sorry, there was an error with the Youtube feed...', function () {
        sendNextStepMessage(senderId);
      });
    }
  });
}
function sendCarouselOfActors(currentUser, listOfActors, introductionMessage) {
  let elements = [];
  let counter = 0;
  getActorsInfo(listOfActors, function (actorsInfo) {
    for (let i = 0; i < actorsInfo.length; i++) {
      let element = {
        title: actorsInfo[i].name,
        image_url: actorsInfo[i].image,
        subtitle: 'Click on "Choose" to know more about ' + actorsInfo[i].name,
      }
      if (currentUser.favorites.indexOf(actorsInfo[i].name) === -1) {
        element.buttons = [
          {
            "title": "Choose ✔︎",
            "payload": "SINGLE_ACTOR," + actorsInfo[i].name
          },
          {
            "title": "Bookmark ❤️",
            "payload": "BOOKMARK " + actorsInfo[i].name
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
            "payload": "UNBOOKMARK " + actorsInfo[i].name
          }
        ]
      }
      elements.push(element);
      counter += 1;
      if (counter === actorsInfo.length) {
        let listOfActorsMessage = messageTemplate.createGenericTemplate(elements);
        reply(currentUser.fb_id, introductionMessage, function () {
          setTimeout(function () {
            reply(currentUser.fb_id, listOfActorsMessage);
          }, 2000);
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
    text: "What should we do now?",
    quick_replies: [
      {
        "content_type": "text",
        "title": "TV Channels 📺",
        "payload": "TV_CHANNELS"
      },
      {
        "content_type": "text",
        "title": "My Favorites ❤️",
        "payload": "FAVORITES"
      }
    ]
  }
  setTimeout(function () {
    reply(senderId, nextStepMessage)
  }, 2000);
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
      message: messageData
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

