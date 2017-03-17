const request = require('request');
const errorChecker = require('../utils/errorChecker');

module.exports = {
    getLiveActors: getLiveActors
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