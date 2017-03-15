const Actor = require('../models/actor');
const Bot = require('../Bot');
const Bing = require('node-bing-api')({ accKey: process.env.BING_ACCESS_KEY }); // put this in .env

module.exports = {
  getActorsInfo: getActorsInfo
};

// Query Bing to get Actor Thumbnail and return actor as an object for Carousels
function getActorsInfo (listOfActors, callback) {
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

function checkForErrors (err) {
  if (err) {
    console.log('An error occurred', err);
    return err;
  }
}


