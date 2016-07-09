var Models = require('../models');
var Promise = require('bluebird');

var usersOperators = require('./usersOperators');

function generateVote(user) {
	console.log('GENERATING A VOTE ');
	return new Promise(function(resolve, reject) {
		usersOperators.getTwoRandomSubscriptions(user)
			.then(function(channels) {
				return channels;
			}).then(function(_channels) {
				var newVote = Models.vote.build({});

				newVote.setChannel1(_channels[0]);
				newVote.setChannel2(_channels[1]);

				return newVote.save();
			}).then(function(_newVote) {
				_newVote.setUser(user);
				resolve(_newVote);
			})
			.catch(function(err) {
				console.log(err);
			})
	});
}


module.exports = {
	generateVote: generateVote
}