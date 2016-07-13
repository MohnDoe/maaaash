var Models = require('../models');
var Promise = require('bluebird');



function generateVote(user) {
	var usersOperators = require('./usersOperators');
	console.log('GENERATING A VOTE FOR USER #' + user.id);
	return new Promise(function(resolve, reject) {
		return usersOperators.getTwoRandomSubscriptions(user)
			.then(function(_channels) {
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
				return newVote.update({
					user_id: user.id
				})
			})
			.then(function(_newVote) {
				return getVote(_newVote);
			})
			.then(function(__newVote) {
				resolve(__newVote);
			})
			.catch(function(err) {
				reject(err);
			})

	});
}

function existsByHashID(hash_id) {
	return new Promise(function(resolve, reject) {
		return Models.vote
			.scope('withChannels')
			.findOne({
				where: {
					hash_id: hash_id
				}
			}).then(function(vote) {
				resolve(vote);
			}).catch(function(err) {
				reject(err);
			})
	})
}

function setWinner(hash_id, side_winner) {
	return new Promise(function(resolve, reject) {
		return existsByHashID(hash_id)
			.then(function(vote) {
				if (!vote) {
					resolve(false);
				}
				if (side_winner == 1) {
					vote.setWinner(vote.Channel1);
					vote.setLooser(vote.Channel2);
					// return vote.save();
				} else if (side_winner == 2) {
					vote.setWinner(vote.Channel2);
					vote.setLooser(vote.Channel1);
					// return vote.save();
				} else {
					resolve(false);
				}
				return vote.complete();
			})
			.then(function(_vote) {
				resolve(_vote);
			})
			.catch(function(err) {
				reject(err);
			});
	});
}

function getVote(vote) {
	return new Promise(function(resolve, reject) {
		return Models.vote
			.scope('withChannels')
			.findOne({
				where: {
					id: vote.id
				}
			})
			.then(function(_vote) {
				resolve(_vote);
			})
			.catch(function(err) {
				console.log('error here');
				console.log(err);
				reject(err);
			})
	})
}

module.exports = {
	generateVote: generateVote,
	existsByHashID: existsByHashID,
	getVote: getVote,
	setWinner: setWinner
}