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
				newVote.user_id = user.id;
				newVote.save();
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

function existsByHashID(hash_id) {
	return new Promise(function(resolve, reject) {
		return Models.vote.findOne({
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
	return new Pormis(function(resolve, reject) {
		return existsByHashID(hash_id)
			.then(function(vote) {
				return vote;
			})
			.then(function(_vote) {
				if (!_vote) {
					resolve(false);
				}

				if (side_winner == 1) {
					vote.setWinner(vote.channel1_id);
					vote.setLooser(vote.channel2_id);
					vote.save();
				} else if (side_winner == 2) {
					vote.setWinner(vote.channel2_id);
					vote.setLooser(vote.channel1_id);
					vote.save();
				} else {

				}
				resolve(vote);
			})
			.catch(function(err) {
				reject(err);
			});
	});
}


module.exports = {
	generateVote: generateVote,
	existsByHashID: existsByHashID
}