var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var PostSchema   = new Schema({
    userIdx: String,
	url: String,
	liked: [String],
	comments: [String],
	dateSubmitted: Date
});

module.exports = mongoose.model('Post', PostSchema);