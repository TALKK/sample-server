var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var UserSchema   = new Schema({
    userID: String,
	pass: String,
	token: String,
	name: String,
	posts: [String],
	seen: [String],
	liked: [String],
	commented: [String],
	friends: [String]
});

module.exports = mongoose.model('User', UserSchema);