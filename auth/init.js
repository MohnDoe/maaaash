var passport = require('passport');
var Models = require('../models');


module.exports = function() {

	passport.serializeUser(function(user, done) {
		done(null, user.id);
	});

	passport.deserializeUser(function(id, done) {
		Models.user.find({
			where: {
				id: id
			}
		}).then(function(user) {
			done(null, user)
		}).catch(function(err) {
			done(err, null);
		})
	});

};