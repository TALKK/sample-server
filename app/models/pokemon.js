var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var PokemonSchema   = new Schema({
    name: String,
	lat: [String],
	longi: [String],
	time: [String],
});

module.exports = mongoose.model('Pokemon', PokemonSchema);