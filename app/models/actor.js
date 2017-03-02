const mongoose = require('mongoose');

var ActorSchema = new mongoose.Schema({
  id: { type: String, index: true, unique: true },
  defaultImage: String,
  full_name: String, // use full name because this what we are using in the rest of the app
  bookmarkedBy: [String], // array of all the user's full names who bookmarked this actor
  timesSectionsAreClicked: { // number of the times a section is clicked
    filmography: { type: Number, default: 0 },
    news: { type: Number, default: 0 },
    products: { type: Number, default: 0 }
  }
})

module.exports = mongoose.model("Actor", ActorSchema);
