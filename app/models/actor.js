const mongoose = require('mongoose');

var ActorSchema = new mongoose.Schema({
  name: String,
  thumbnail: { type: String, default: null },
  is_actor: { type: Boolean, default: false },
  instagram: { type: String },
  bookmarkedBy: [String],
  bookmarkCounter: { type: Number, default: 0 },
  timesSectionsAreClicked: { // number of the times a section is clicked
    filmography: { type: Number, default: 0 },
    news: { type: Number, default: 0 },
    products: { type: Number, default: 0 }
  }
});

module.exports = mongoose.model('Actor', ActorSchema);
