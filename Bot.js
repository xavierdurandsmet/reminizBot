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

const Actor = require('./app/models/actor');

const bingNewsImage = `${process.env.SERVER_URI}images/bing.jpg`;

const channels = {
  News: {
    title: 'News',
    uri: 'http://40.68.198.152:5000/live/people/news', // change to specific uri
    subtitle: 'The News Channel', // find a better subtitle
    image_url: `${process.env.SERVER_URI}images/newsChannelLogo.png`,
    payload: 'CHANNEL_News'
  },
  JuniorClub: {
    title: 'The Junior Club',
    uri: 'http://40.68.198.152:5000/live/people/kids', // change to specific uri
    subtitle: 'Children love it',
    image_url: `${process.env.SERVER_URI}images/theJuniorClubLogo.png`,
    payload: 'CHANNEL_JuniorClub'
  },
  HelloCinema: {
    title: 'Hello Cinema',
    uri: 'http://40.68.198.152:5000/live/people/a', // change to specific uri
    subtitle: 'The Movie Channel',
    image_url: `${process.env.SERVER_URI}images/helloCinemaLogo.png`,
    payload: 'CHANNEL_HelloCinema'
  }
}

module.exports = {
  sendCarouselOfActors: sendCarouselOfActors,
  sendChannelsList: sendChannelsList,
  sendSingleActor: sendSingleActor,
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
  sendYoutubeVideos: sendYoutubeVideos,
  getLiveActors: getLiveActors
}

// Send a list of channels for Reminiz API requests
function sendChannelsList(senderId) {
  User.findOrCreate(senderId, function (user) {
    let introductionMessage = `Hi ${user.fb_first_name} 👋 Pick a TV channel to know who's on screen in real time ⚡️` // Greet user by its first name
    let listOfChannelsMessage = messageTemplate.createGenericTemplate(
      [
        {
          "title": channels.News.title,
          "image_url": channels.News.image_url,
          "subtitle": channels.News.subtitle,
          "buttons": [{ "title": 'Choose ✔︎', "payload": channels.News.payload }]
        },
        {
          "title": channels.JuniorClub.title,
          "image_url": channels.JuniorClub.image_url,
          "subtitle": channels.JuniorClub.subtitle,
          "buttons": [{ "title": 'Choose ✔︎', "payload": channels.JuniorClub.payload }]
        },
        {
          "title": channels.HelloCinema.title,
          "image_url": channels.HelloCinema.image_url,
          "subtitle": channels.HelloCinema.subtitle,
          "buttons": [{ "title": 'Choose ✔︎', "payload": channels.HelloCinema.payload }]
        }
      ]
    )

    reply(senderId, introductionMessage, function () {
      setTimeout(function () {
        reply(senderId, listOfChannelsMessage)
      }, 1500);
    });
  });
}

// Request reminiz API and return actors
function getLiveActors(channelName, callback) {
  let uri = channels[channelName].uri;
  request(uri, function (error, response, body) {
    checkForErrors(error);
    if (!body) {
      return callback(null);
    } else if (response && response.statusCode !== 200) {
      return callback(response.statusCode);
    }
    return callback(JSON.parse(body));
  })
}

// Query Bing to get Actor Thumbnail and return actor as an object for Carousels
function getActorsInfo(listOfActors, callback) {
  let actorsInfo = [];
  let counter = 0;
  for (let i = 0; i < listOfActors.length; i++) {
    Bing.images(listOfActors[i].name || listOfActors[i], { top: 5, skip: 3 }, function (error, res, body) {
      checkForErrors(error);
      actorsInfo.push({
        name: listOfActors[i].name || listOfActors[i],
        image: body && body.value && body.value[i] ? body.value[i].contentUrl : `${process.env.SERVER_URI}images/image-not-found.png`
      });
      counter += 1;
      if (counter === listOfActors.length) {
        return callback(actorsInfo);
      }
    });
  }
}

// Send  list template containing the actor profile
function sendSingleActor(senderId, actorName) {
  Actor.findOne({ name: actorName }, function (error, actor) {
    checkForErrors(error);
    if (!actor) {
      reply(senderId, 'Nobody on screen right now...Try again 😊', function () {
        sendNextStepMessage(senderId, actor);
        return;
      })
    }
    let biography = actor.name,
      filmImage = `${process.env.SERVER_URI}images/movie_db.jpg`,
      instagramLogo = `${process.env.SERVER_URI}images/instagram.png`,
      introductionMessage = `${actor.name} is live ❤️`,
      productImage = `${process.env.SERVER_URI}images/best_sellers.png`,
      productName = 'Best sellers',
      youtubeLogo = `${process.env.SERVER_URI}images/youtube.png`;

    Bing.images(actor.name, { top: 15, skip: 3 }, function (error, res, body) {
      checkForErrors(error);
      let options = { query: actor.name, format: 'html', summaryOnly: true, lang: 'en' } // get the Wiki summary
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
            "subtitle": `Click to get ${actor.name}'s biography`, // change to actor.name
            "image_url": actor.image,
            "default_action": { url: 'https://en.wikipedia.org/wiki/' + actor.name, fallback_url: 'https://en.wikipedia.org/wiki/' + actor.name },
            "buttons": [{ "type": "postback", "title": 'Bookmark ❤️', "payload": "BOOKMARK " + actor.name }]
          },
          {
            "title": 'Latest News',
            "image_url": bingNewsImage,
            "default_action": { url: 'https://en.wikipedia.org/wiki/' + actor.name, fallback_url: 'https://en.wikipedia.org/wiki/' + actor.name }, // to change to next line but currently not working
            "buttons": [{ "type": "postback", "title": 'Read News', "payload": "NEWS " + actor.name }]
          }
        ];
        // Send filmography in 1st position if it's an actor
        if (actor.is_actor) {
          elements.splice(
            1,
            0,
            {
              "title": 'Movies and Shows',
              "image_url": filmImage,
              "default_action": { url: `https://www.themoviedb.org/person/${actor.id}`, fallback_url: `https://www.themoviedb.org/person/${actor.id}` },
              "buttons": [{ "type": "postback", "title": 'See Collection', "payload": `FILMOGRAPHY ${actor.name}` }]
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
              "buttons": [{ "type": "postback", "title": 'See Products', "payload": `AMAZON ${actor.name}` }]
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
              "buttons": [{ "type": "postback", "title": 'See Instagram', "payload": `INSTAGRAM ${actor.name}` }]
            }
          );
        } else {
          elements.splice(
            3,
            0,
            {
              "title": 'Best Videos',
              "image_url": youtubeLogo,
              "default_action": { url: `https://www.youtube.com/results?search_query=${actor.name}`, fallback_url: `https://www.youtube.com/` },
              "buttons": [{ "type": "postback", "title": 'Watch Videos', "payload": `YOUTUBE ${actor.name}` }]
            }
          );
        }
        // Only render the first 4 elements
        actor.list = messageTemplate.createListTemplate(elements.slice(0, 4));
        reply(senderId, introductionMessage, function () {
          reply(senderId, actor.list, function () {
            sendNextStepMessage(senderId, actor);
          })
        })
      })
    });
  })
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
      if (currentUser.favorites && currentUser.favorites.indexOf(actorsInfo[i].name) === -1) {
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
    if (res.results[0]) {
      actor.id = res.results[0].id;
      MovieDB.personCombinedCredits({ id: actor.id }, (err, res) => { // get TV shows and movies
        checkForErrors(err);
        // if (res)
        let JSONResponse = res.cast;
        JSONResponse = sortCreditsByYear(JSONResponse);
        let filmList = [];
        // Iterate over each MovieDB object an create a film object
        for (let i = 0; i <= 9; i++) {
          let film = {};
          // Differentate between tv shows and Movies
          if (JSONResponse[i]) {
            if (JSONResponse[i].media_type === 'movie') {
              film.media_type = JSONResponse[i].media_type;
              film.id = JSONResponse[i].id;
              film.title = JSONResponse[i].media_type === 'movie' ? JSONResponse[i].title : JSONResponse[i].name;
              film.image_url = JSONResponse[i].poster_path ? `https://image.tmdb.org/t/p/w500/${JSONResponse[i].poster_path}` : `${process.env.SERVER_URI}images/image-not-found.png`;
              film.buttonsURL = [{ "title": 'See More', "url": `https://www.themoviedb.org/person/${actor.id}` }]; // change to specific movi,
              film.subtitle = JSONResponse[i].release_date ? JSONResponse[i].release_date.substr(0, 4) : "";
            } else if (JSONResponse[i].media_type === 'tv') {
              film.media_type = JSONResponse[i].media_type;
              film.id = JSONResponse[i].id;
              film.title = JSONResponse[i].media_type === 'movie' ? JSONResponse[i].title : JSONResponse[i].name;
              film.image_url = JSONResponse[i].poster_path ? `https://image.tmdb.org/t/p/w500/${JSONResponse[i].poster_path}` : `${process.env.SERVER_URI}images/image-not-found.png`;
              film.subtitle = JSONResponse[i].first_air_date ? JSONResponse[i].first_air_date.substr(0, 4) : "";
              film.buttonsURL = [{ "title": 'See More', "url": `https://www.themoviedb.org/person/${actor.id}` }]; // change to specific movi,
            }
            filmList.push(film);
          }
        }
        // COULD SPLIT HERE IN 2 FUNCTIONS
        // Stop here if no movies were found
        if (filmList.length === 0) {
          reply(senderId, 'No Movies or TV Shows found for this person', function () {
            sendSingleActor(senderId, actorName);
          });
        }
        let filmListToPush = [];
        filmList.forEach(function (film) { // use forEach to create its own scope, for the async call
          if (film && film.media_type === 'tv') {
            MovieDB.tvVideos({ id: film.id }, function (err, res) {
              checkForErrors(err);
              if (res && res.results[0]) {
                if (res.results[0].site === 'YouTube') {
                  film.trailer = `https://www.youtube.com/watch?v=${res.results[0].key}`;
                  film.buttonsURL.push({ "title": 'Watch Trailer', "url": film.trailer })
                }
              }
              filmListToPush.push(film);
              if (filmListToPush.length === filmList.length || filmListToPush.length === 10) { // if statement inside the forEach to not have asynchronous pbs
                let filmTemplate = messageTemplate.createGenericTemplate(filmListToPush)
                reply(senderId, filmTemplate, function () {
                  sendNextStepMessage(senderId)
                })
              }
            })
          } else if (film && film.media_type === 'movie') {
            MovieDB.movieTrailers({ id: film.id }, function (err, res) {
              checkForErrors(err);
              if (res.youtube[0]) {
                film.trailer = `https://www.youtube.com/watch?v=${res.youtube[0].source}`;
                film.buttonsURL.push({ "title": 'Watch Trailer', "url": film.trailer })
              }
              filmListToPush.push(film);
              // Change this, doesn't work if less than 10 films
              if (filmListToPush.length === filmList.length || filmListToPush.length === 10) { // if statement inside the forEach to not have asynchronous pbs
                let filmTemplate = messageTemplate.createGenericTemplate(filmListToPush)
                reply(senderId, filmTemplate, function () {
                  sendNextStepMessage(senderId)
                })
              }
            })
          }
        })
      })
    } else { // if cannot find person in movieDB
      reply(senderId, 'No Movies or TV Shows found for this person', function () {
        sendSingleActor(senderId, actorName);
      });
    }
  })
}

function sendCarouselOfNews(senderId, actorName) {
  let actor = {};
  Bing.news(actorName, { top: 10, skip: 3, safeSearch: "Moderate" }, function (error, res, body) {
    checkForErrors(error);
    let JSONResponse = body.value;
    let newsList = [];
    for (let i = 0; i <= 4; i++) {
      if (JSONResponse[i]) {
        let newsArticle = {};
        if (JSONResponse[i]) {
          newsArticle.title = JSONResponse[i].name;
          if (!JSONResponse[i].image) {
            newsArticle.image_url = bingNewsImage;
          } else if (JSONResponse[i].image.thumbnail.contentUrl) {
            newsArticle.image_url = JSONResponse[i].image.thumbnail.contentUrl; // get better quality images?
          }
          newsArticle.subtitle = JSONResponse[i].description;
          newsArticle.buttonsURL = [{ "title": 'Read More', "url": JSONResponse[i].url }]; // change to specific movie
          newsList.push(newsArticle);
        }
      }
    }
    if (!newsList.length) {
      reply(senderId, 'No TV News were found for this person', function () {
        sendSingleActor(senderId, actorName);
      });
    } else {
      let newsTemplate = messageTemplate.createGenericTemplate(newsList)
      reply(senderId, newsTemplate, function () {
        sendNextStepMessage(senderId)
      })
    }
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
      if (results[i] && results[i].OfferSummary && results[i].OfferSummary[0] && results[i].OfferSummary[0].TotalNew[0] != 0) { // make sure the product is available or will return undefined
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
          card.title = items[i].user.name;
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
  const youtubeBaseUri = 'https://www.googleapis.com/youtube/v3/search';
  const youtubeApiKey = process.env.YOUTUBE_API_KEY;
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
  }, 1000);
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

function sortCreditsByYear(arrayOfCredits) {
  let sortedArrayOfCredits = arrayOfCredits.sort(function (creditA, creditB) {
    if (creditA.media_type === 'movie') {
      yearA = creditA.release_date ? Number(creditA.release_date.substr(0, 4)) : 0; // get the Year for the element
    } else {
      yearA = creditA.first_air_date ? Number(creditA.first_air_date.substr(0, 4)) : 0;
    }
    if (creditB.media_type === 'movie') {
      yearB = creditB.release_date ? Number(creditB.release_date.substr(0, 4)) : 0; // get the Year for the element
    } else {
      yearB = creditB.first_air_date ? Number(creditB.first_air_date.substr(0, 4)) : 0;
    }
    return yearB - yearA;
  })
  return sortedArrayOfCredits;
}
