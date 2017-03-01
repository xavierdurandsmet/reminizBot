const mongoose = require('mongoose');

var ActorSchema = new mongoose.Schema({
  id: { type: String, index: true, unique: true },
  defaultImage: String,
  full_name: String, // use full name because this what we are using in the rest of the app
  bookmarkedBy: [String], // array of all the userIDs who bookmarked this actor
  timesSectionsAreClicked: { // number of the times a section is clicked
    filmography: { type: Number, default: 0 },
    news: { type: Number, default: 0 },
    products: { type: Number, default: 0 }
  }
})

module.exports = mongoose.model("Actor", ActorSchema);

// db.actors.insert({
//   id: 'id',
//   defaultImage: 'http://cdn5.thr.com/sites/default/files/2015/05/bts_natalie_portman_clean.jpg',
//   full_name: "Natalie Portman",
//   bookmarkedBy: [],
//   timesSectionsAreClicked: {
//     filmography: 0,
//     news: 0,
//     products: 0
//   }
// })