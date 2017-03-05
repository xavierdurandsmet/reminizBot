const mongoose = require('mongoose');

var ActorSchema = new mongoose.Schema({
  id: { type: String, index: true, unique: true },
  full_name: String,
  thumbnail: {type: String, default: 'http://cdn5.thr.com/sites/default/files/2015/05/bts_natalie_portman_clean.jpg'},
  is_actor: { type: Boolean, default: false },
  instagram: { type: String },
  bookmarkedBy: [String],
  bookmarkCounter: { type: Number, default: 0 },
  timesSectionsAreClicked: { // number of the times a section is clicked
    filmography: { type: Number, default: 0 },
    news: { type: Number, default: 0 },
    products: { type: Number, default: 0 }
  }
})

module.exports = mongoose.model("Actor", ActorSchema);
