const request = require('request');
const messageTemplate = require('../utils/messageTemplate');
const errorChecker = require('../utils/errorChecker');
const handler = require('../utils/handler');
const MovieDB = require('moviedb')(process.env.MOVIE_DB_ACCESS_KEY);

module.exports = {
    sendCarouselOfFilms: sendCarouselOfFilms
}

function sendCarouselOfFilms (senderId, actorName) {
  let actor = {};
  MovieDB.searchPerson({ query: actorName }, (err, res) => {
    errorChecker.checkForErrors(err);
    if (res.results[0]) {
      actor.id = res.results[0].id;
      MovieDB.personCombinedCredits({ id: actor.id }, (err, res) => { // get TV shows and movies
        errorChecker.checkForErrors(err);
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
              film.buttons = [{ 'type': 'web_url', 'title': 'See More', 'url': `https://www.themoviedb.org/person/${actor.id}` }]; // change to specific movi,
              film.subtitle = JSONResponse[i].release_date ? JSONResponse[i].release_date.substr(0, 4) : '';
            } else if (JSONResponse[i].media_type === 'tv') {
              film.media_type = JSONResponse[i].media_type;
              film.id = JSONResponse[i].id;
              film.title = JSONResponse[i].media_type === 'movie' ? JSONResponse[i].title : JSONResponse[i].name;
              film.image_url = JSONResponse[i].poster_path ? `https://image.tmdb.org/t/p/w500/${JSONResponse[i].poster_path}` : `${process.env.SERVER_URI}images/image-not-found.png`;
              film.subtitle = JSONResponse[i].first_air_date ? JSONResponse[i].first_air_date.substr(0, 4) : '';
              film.buttons = [{ 'type': 'web_url', 'title': 'See More', 'url': `https://www.themoviedb.org/person/${actor.id}` }]; // change to specific movi,
            }
            filmList.push(film);
          }
        }
        if (filmList.length === 0) { // Stop here if no movies were found
          handler.reply(senderId, 'No Movies or TV Shows found for this person', function () {
            sendSingleActor(senderId, actorName);
          });
        }
        let filmListToPush = [];
        filmList.forEach(function (film) { // use forEach to create its own scope, for the async call
          if (film && film.media_type === 'tv') {
            MovieDB.tvVideos({ id: film.id }, function (err, res) {
              errorChecker.checkForErrors(err);
              if (res && res.results[0]) {
                if (res.results[0].site === 'YouTube') {
                  film.trailer = `https://www.youtube.com/watch?v=${res.results[0].key}`;
                  film.buttons.push({ 'type': 'web_url', 'title': 'Watch Trailer', 'url': film.trailer });
                }
              }
              filmListToPush.push(film);
              if (filmListToPush.length === filmList.length || filmListToPush.length === 10) { // if statement inside the forEach to not have asynchronous pbs
                let filmTemplate = messageTemplate.createGenericTemplate(filmListToPush);
                handler.reply(senderId, filmTemplate, function () {
                  handler.sendNextStepMessage(senderId);
                });
              }
            });
          } else if (film && film.media_type === 'movie') {
            MovieDB.movieTrailers({ id: film.id }, function (err, res) {
              errorChecker.checkForErrors(err);
              if (res.youtube[0]) {
                film.trailer = `https://www.youtube.com/watch?v=${res.youtube[0].source}`;
                film.buttons.push({ 'type': 'web_url', 'title': 'Watch Trailer', 'url': film.trailer });
              }
              filmListToPush.push(film);
              // Change this, doesn't work if less than 10 films
              if (filmListToPush.length === filmList.length || filmListToPush.length === 10) { // if statement inside the forEach to not have asynchronous pbs
                let filmTemplate = messageTemplate.createGenericTemplate(filmListToPush);
                handler.reply(senderId, filmTemplate, function () {
                  handler.sendNextStepMessage(senderId);
                });
              }
            });
          }
        });
      });
    } else { // if cannot find person in movieDB
      handler.reply(senderId, 'No Movies or TV Shows found for this person', function () {
        sendSingleActor(senderId, actorName);
      });
    }
  });
}

function sortCreditsByYear (arrayOfCredits) {
  let yearA;
  let yearB;
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
  });
  return sortedArrayOfCredits;
}