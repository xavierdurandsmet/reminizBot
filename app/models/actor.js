const mongoose = require('mongoose');

var ActorSchema = new mongoose.Schema({
  id: { type: String, index: true, unique: true },
  defaultImage: String,
  first_name: String,
  last_name: String,
  bookmarked: [String], // array of all the userIDs who bookmarked this actor
  sectionsClicked: { // number of the times a section is clicked
    filmography: {type: Number, default: 0},
    news: {type: Number, default: 0},
    products: {type: Number, default: 0}
  }
})

module.exports = mongoose.model("Actor", ActorSchema);

