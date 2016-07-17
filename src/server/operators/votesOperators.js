var Models = require("../modules/models");
var Config = require("../modules/config");
var Promise = require('bluebird');
var Elo = require('arpad');

var elo = new Elo({ // ufscf K factors
		default: 32,
		2100: 24,
		2400: 16
	},
	100
)



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

function setWinner(hash_id, winner) {
	return new Promise(function(resolve, reject) {
		return existsByHashID(hash_id)
			.then(function(vote) {
				if (!vote || vote.is_completed) {
					resolve(false);
				}
				if (winner == 1) {
					vote.setWinner(vote.Channel1);
					vote.setLooser(vote.Channel2);
					// return vote.save();
				} else if (winner == 2) {
					vote.setWinner(vote.Channel2);
					vote.setLooser(vote.Channel1);
					// return vote.save();
				} else {
					resolve(false);
				}
				// updateElo !
				return updateElo(vote, winner);
			})
			.then(function(_vote) {
				return _vote.complete();
			})
			.then(function(__vote) {
				resolve(__vote);
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

function updateElo(vote, winner) {
	return new Promise(function(resolve, reject) {
		return getVote(vote)
			.then(function(vote) {
				//get odds, old ratings and new ratings

				// old ratings
				var elo_points_channel_1 = vote.Channel1.elo_points;
				var elo_points_channel_2 = vote.Channel2.elo_points;
				// ods
				var odds_channel_1_wins = elo.expectedScore(elo_points_channel_1, elo_points_channel_2);
				var odds_channel_2_wins = elo.expectedScore(elo_points_channel_2, elo_points_channel_1);
				// new ratings
				if (winner == 1) {
					var new_elo_points_channel_1 = elo.newRating(odds_channel_1_wins, 1, elo_points_channel_1);
					var new_elo_points_channel_2 = elo.newRating(odds_channel_2_wins, 0, elo_points_channel_2);
				} else if (winner == 2) {
					var new_elo_points_channel_1 = elo.newRating(odds_channel_1_wins, 0, elo_points_channel_1);
					var new_elo_points_channel_2 = elo.newRating(odds_channel_2_wins, 1, elo_points_channel_2);
				}

				//update channels with their new ratings
				vote.Channel1
					.update({
						elo_points: new_elo_points_channel_1
					});
				vote.Channel2
					.update({
						elo_points: new_elo_points_channel_2
					});

				return {
					vote: vote,
					elo_points_channel_1: elo_points_channel_1,
					odds_channel_1_wins: odds_channel_1_wins,
					new_elo_points_channel_1: new_elo_points_channel_1,
					elo_points_channel_2: elo_points_channel_2,
					odds_channel_2_wins: odds_channel_2_wins,
					new_elo_points_channel_2: new_elo_points_channel_2,
				};

			})
			.then(function(data) {
				//update vote with winner and odds + new ratings after the vote
				return data.vote.update({
					channel1_elo_before: data.elo_points_channel_1,
					channel1_elo_odds: data.odds_channel_1_wins,
					channel1_elo_after: data.new_elo_points_channel_1,
					channel2_elo_before: data.elo_points_channel_2,
					channel2_elo_odds: data.odds_channel_2_wins,
					channel2_elo_after: data.new_elo_points_channel_2,
					is_completed: true,
					completed_at: new Date()

				});
			})
			.then(function(_vote) {
				resolve(_vote);
			})
			.catch(function(err) {
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