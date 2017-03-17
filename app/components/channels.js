const messageTemplate = require('../utils/messageTemplate');
const replier = require('../utils/replier');
const User = require('../models/user');
const request = require('request');
const errorChecker = require('../utils/errorChecker');

module.exports = {
    getLiveActors: getLiveActors,
    sendChannelsList: sendChannelsList
}

const channels = {
  News: {
    title: 'News',
    uri: 'http://sxsw.reminiz.com/news/people',
    live_uri: 'http://sxsw.reminiz.com/news',
    subtitle: 'The News Channel',
    image_url: `${process.env.SERVER_URI}images/newsChannelLogo.png`,
    payload: 'CHANNEL_News'
  },
  JuniorClub: {
    title: 'The Junior Club',
    uri: 'http://sxsw.reminiz.com/kids/people',
    live_uri: 'http://sxsw.reminiz.com/kids',
    subtitle: 'Children love it',
    image_url: `${process.env.SERVER_URI}images/theJuniorClubLogo.png`,
    payload: 'CHANNEL_JuniorClub'
  },
  HelloCinema: {
    title: 'Hello Cinema',
    uri: 'http://sxsw.reminiz.com/movies/people',
    live_uri: 'http://sxsw.reminiz.com/movies',
    subtitle: 'The Movie Channel',
    image_url: `${process.env.SERVER_URI}images/helloCinemaLogo.png`,
    payload: 'CHANNEL_HelloCinema'
  }
};

function sendChannelsList (senderId) { // Send a list of channels for Reminiz API requests
  User.findOrCreate(senderId, function (user) {
    let introductionMessage = `Hi ${user.fb_first_name} 👋 Pick a TV channel to know who's on screen in real time ⚡️`; // Greet user by its first name
    let listOfChannelsMessage = messageTemplate.createGenericTemplate(
      [
        {
          'title': channels.News.title,
          'image_url': channels.News.image_url,
          'subtitle': channels.News.subtitle,
          'buttons': [{ 'type': 'postback', 'title': 'Choose ✔︎', 'payload': channels.News.payload },
          {'type': 'postback', 'title': 'Watch Live ⚡️', 'payload': `LIVE_${channels.News.live_uri}`}]
        },
        {
          'title': channels.JuniorClub.title,
          'image_url': channels.JuniorClub.image_url,
          'subtitle': channels.JuniorClub.subtitle,
          'buttons': [{ 'type': 'postback', 'title': 'Choose ✔︎', 'payload': channels.JuniorClub.payload },
          {'type': 'postback', 'title': 'Watch Live ⚡️', 'payload': `LIVE_${channels.JuniorClub.live_uri}`}]
        },
        {
          'title': channels.HelloCinema.title,
          'image_url': channels.HelloCinema.image_url,
          'subtitle': channels.HelloCinema.subtitle,
          'buttons': [{ 'type': 'postback', 'title': 'Choose ✔︎', 'payload': channels.HelloCinema.payload },
          {'type': 'postback', 'title': 'Watch Live ⚡️', 'payload': `LIVE_${channels.HelloCinema.live_uri}`}]
        }
      ]
    );

    replier.reply(senderId, introductionMessage, function () {
      setTimeout(function () {
        replier.reply(senderId, listOfChannelsMessage);
      }, 1500);
    });
  });
}

function getLiveActors (channelName, callback) { // Request reminiz API and return actors
  let uri = channels[channelName].uri;
  request(uri, function (error, response, body) {
    errorChecker.checkForErrors(error);
    if (!body) {
      return callback(null);
    } else if (response && response.statusCode !== 200) {
      return callback(response.statusCode);
    }
    return callback(JSON.parse(body));
  });
}