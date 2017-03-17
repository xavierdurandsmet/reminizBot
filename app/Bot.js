const youtubeComponent = require('./components/youtube');
const instagramComponent = require('./components/instagram');
const amazonComponent = require('./components/amazon');
const movieDbComponent = require('./components/movieDb');
const bingNewsComponent = require('./components/bingNews');
const channelsComponent = require('./components/channels');
const actorsComponent = require('./components/actors');
const handler = require('./utils/handler');
const errorChecker = require('./utils/errorChecker');

module.exports = {
  sendCarouselOfActors: actorsComponent.sendCarouselOfActors,
  sendSingleActor: actorsComponent.sendSingleActor,
  sendFavoriteActors: actorsComponent.sendFavoriteActors,
  sendActorIsBookmarked: actorsComponent.sendActorIsBookmarked,
  sendActorIsUnbookmarked: actorsComponent.sendActorIsUnbookmarked,
  sendAmazonProducts: amazonComponent.sendAmazonProducts,
  reply: handler.reply,
  sendNextStepMessage: handler.sendNextStepMessage,
  sendCarouselOfFilms: movieDbComponent.sendCarouselOfFilms,
  sendCarouselOfNews: bingNewsComponent.sendCarouselOfNews,
  sendInstagramFeed: instagramComponent.sendInstagramFeed,
  sendYoutubeVideos: youtubeComponent.sendYoutubeVideos,
  getLiveActors: channelsComponent.getLiveActors,
  sendChannelsList: channelsComponent.sendChannelsList,
  checkForErrors: errorChecker.checkForErrors
};
