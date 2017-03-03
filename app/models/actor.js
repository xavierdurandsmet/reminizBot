const mongoose = require('mongoose');

var ActorSchema = new mongoose.Schema({
  id: { type: String, index: true, unique: true },
  thumbnail: {type: String, default: 'http://cdn5.thr.com/sites/default/files/2015/05/bts_natalie_portman_clean.jpg'}, // image for Natalie Portman
  full_name: String, // use full name because this what we are using in the rest of the app
  bookmarkedBy: [String],
  timesBookmarked: { type: Number, default: 0 },
  bookmarkCounter: { type: Number, default: 0 },
  timesSectionsAreClicked: { // number of the times a section is clicked
    filmography: { type: Number, default: 0 },
    news: { type: Number, default: 0 },
    products: { type: Number, default: 0 }
  }
})

module.exports = mongoose.model("Actor", ActorSchema);
