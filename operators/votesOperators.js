var Models = require('../models');
var Promise = require('bluebird');



function generateVote(user) {
	var usersOperators = require('./usersOperators');
	console.log('GENERATING A VOTE FOR USER #' + user.id);
	return new Promise(function(resolve, reject) {
		return usersOperators.getTwoRandomSubscriptions(user)
			.then(function(channels) {
				return channels;
			}).then(function(_channels) {
				return createVote(user, _channels[0], _channels[1]);
			}).then(function(_newVote) {
				resolve(_newVote);
			})
			.catch(function(err) {
				console.log('error here');
				console.log(err);
				reject(err);
			})
	});
}

function createVote(user, channel1, channel2) {
	return new Promise(function(resolve, reject) {
		return Models.vote.create({})
			.then(function(newVote) {
				newVote.setChannel1(channel1);
				newVote.setChannel2(channel2);
				newVote.setUser(user);
				return newVote;
			})
			.then(function(_newVote) {
				resolve(_newVote);
			})
			.catch(function(err) {
				reject(err);
			})

	});
}


module.exports = {
	generateVote: generateVote
}