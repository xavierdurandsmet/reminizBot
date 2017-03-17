const request = require('request');
const messageTemplate = require('../utils/messageTemplate');
const errorChecker = require('../utils/errorChecker');
const replier = require('../utils/replier');
const amazon = require('amazon-product-api');
const client = amazon.createClient({
  awsId: process.env.AMAZON_ID,
  awsSecret: process.env.AMAZON_SECRET_KEY
});

module.exports = {
    sendAmazonProducts: sendAmazonProducts
}

function sendAmazonProducts (senderId, actorName) {
  client.itemSearch({ // do the Amazon call here rather than in sendSingleActor because the latter is already overloaded
    searchIndex: 'All',
    keywords: actorName, // we might have to change the query to adapt to Jack's will
    responseGroup: 'ItemAttributes,Offers,Images'
  }, function (err, results) {
    errorChecker.checkForErrors(err);
    if (results) {
      let productList = [];
      for (let i = 0; i < 10; i++) {
        if (results[i] && results[i].OfferSummary && results[i].OfferSummary[0] && results[i].OfferSummary[0].TotalNew[0] != 0) { // make sure the product is available or will return undefined
          let product = {};
          product.title = results[i].ItemAttributes[0].Title[0];
          product.image_url = results[i].LargeImage && results[i].LargeImage[0] ? results[i].LargeImage[0].URL[0] : `${process.env.SERVER_URI}images/image-not-found.png`;
          product.subtitle = results[i].OfferSummary[0].LowestNewPrice[0].FormattedPrice[0];
          product.buttons = [{ 'type': 'web_url', 'title': 'Buy Now', 'url': results[i].DetailPageURL[0] ? results[i].DetailPageURL[0] : 'https://www.amazon.com/' }]; // do a more precise search query
          productList.push(product);
        }
      }
      let productTemplate = messageTemplate.createGenericTemplate(productList);
      replier.reply(senderId, productTemplate, function () {
        replier.sendNextStepMessage(senderId);
      });
    } else {
      replier.replierreply(senderId, `Sorry, no best sellers found for ${actorName}`, function () {
        replier.sendNextStepMessage(senderId);
      });
    }
  });
}