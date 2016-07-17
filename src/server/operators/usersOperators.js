var Promise = require('bluebird'),
	_ = require('lodash'),
	Sequelize = require('sequelize'),
	jwt = require('jsonwebtoken');
var Models = require("../modules/models");
var Config = require("../modules/config");
var pointsOperators = require('./pointsOperators');
var mixpanel = require('../modules/tracking');


var Google = require('googleapis');
var Youtube = Google.youtube('v3');

var OAuth2 = Google.auth.OAuth2;
var oauth2Client = new OAuth2(Config.auth.youtube.clientID, Config.auth.youtube.clientSecret, Config.auth.youtube.callbackURL);

function getChannelsSubedBulk(user, nextPageToken) {

	return new Promise(function(resolve, reject) {
		// TODO PROMISIFY THIS
		// TODO save by bulk
		oauth2Client.setCredentials({
			access_token: user.access_token_youtube,
			refresh_token: user.refresh_token_youtube
		});

		Google.options({
			auth: oauth2Client
		});

		return Youtube.subscriptions.list({
				part: "snippet", // cost 2 units
				mine: true,
				maxResults: 50,
				pageToken: nextPageToken
			},
			function(err, data) {
				if (err) {
					reject(err);
				}
				var ids = '';
				var channels = {
					items: []
				};

				channels.count = data.pageInfo.totalResults;;
				channels.count_results = data.pageInfo.resultsPerPage;
				if (data.nextPageToken === undefined || data.nextPageToken == 'undefined' || typeof data.nextPageToken == 'undefined') {
					channels.nextPageToken = null;
				} else {
					channels.nextPageToken = data.nextPageToken;
				}

				_.forEach(data.items, function(value, key) {
					var id = value['snippet'].resourceId.channelId
					if (ids == '') {
						ids = id;
					} else {
						ids += ',' + id;
					}

				});

				Youtube.channels.list({
					part: 'statistics, snippet', // 2 + 2
					id: ids
				}, function(err, data) {
					if (err) {
						reject(err);
					}
					_.forEach(data.items, function(value, key) {
						var channel_id = value.id;
						// console.log(channel_id);
						var channelInfos = {
							snippet: value['snippet'],
							statistics: value['statistics']
						};
						var channelSnippet = value['snippet'];
						var channel = {
							id: channel_id,
							name: channelInfos.snippet.title,
							description: channelInfos.snippet.description,
							thumbnail_url: channelInfos.snippet.thumbnails.high.url,
							custom_url: channelInfos.snippet.customUrl,
							published_at: channelInfos.snippet.publishedAt,
							lang: channelInfos.snippet.defaultlLanguage,
							country: channelInfos.snippet.country,
							view_count: channelInfos.statistics.viewCount,
							subscriber_count: channelInfos.statistics.subscriberCount,
							hidden_subscriber_count: channelInfos.statistics.hiddenSubscriberCount,
							video_count: channelInfos.statistics.videoCount,
						}

						channels.items.push(channel);

					});
					resolve(channels);
				});
			})
	});
}

function getAllChannelsSubed(user, allChannels, nextPageToken) {
	return new Promise(function(resolve, reject) {
		if (!allChannels) {
			// console.log("allChannels is empty")
			allChannels = [];
		}
		return getChannelsSubedBulk(user, nextPageToken)
			.then(function(channels) {
				var _channels = channels;
				allChannels = allChannels.concat(_channels.items);

				if (_channels.nextPageToken) { // todo get this false outta here dude
					console.log('# channels so far : ' + allChannels.length);
					return getAllChannelsSubed(user, allChannels, _channels.nextPageToken).then(resolve);
				} else {
					console.log('# channels total : ' + allChannels.length);
					mixpanel.people.set(user.id, '# of Channels', allChannels.length);
					resolve(allChannels);
				}

			}).catch(function(err) {
				return reject(err);
			});
	});
}

function saveChannels(user) {
	console.log("SAVING CHANNELS FOR USER : " + user.id);
	return new Promise(function(resolve, reject) {
		return getAllChannelsSubed(user).then(function(channels) {
			var pendingChannels = channels.length;
			_.forEach(channels, function(channel, key) {

					var channelsOperators = require('./channelsOperators');
					channelsOperators.findOrCreateChannel(channel)
						.then(function(_channel) {
							// _channel.addSubscriber(user);
							_user = user;
							return _user.addSubscription(_channel)

						}).then(function() {
							if (--pendingChannels === 0) {
								console.log("END SAVING CHANNELS FOR USER : " + _user.id);
								_user.last_synced = new Date();

								_user.save()
									.then(function(_user) {
										resolve(_user);
									})
									.catch(function(err) {
										reject(err);
									})
							}
						});
				})
				// resolve(user);
		}).catch(function(err) {
			reject(err);
		})
	});
}

function getTwoRandomSubscriptions(user) {
	console.log("GETTING RANDOM CHANNELS FOR USER : " + user.id);
	// return Models.channel.findAll({
	// 	order: [
	// 		[Models.Sequelize.fn('RANDOM')]
	// 	],
	// 	limit: 2,
	// 	include: [{
	// 		model: Models.user,
	// 		as: 'subscribers',
	// 		through: {
	// 			where: {
	// 				user_id: user.id
	// 			}
	// 		}
	// 	}]
	return new Promise(function(resolve, reject) {
		return getUser(user)
			.then(function(_user) {
				return _user.getSubscriptions({
					order: [
						[Sequelize.fn('RANDOM')]
					],
					limit: 2
				})
			})
			.then(function(channels) {
				console.log("CHANNELS FOUNDED : " + channels.length);
				console.log("END GETTING RANDOM CHANNELS");
				resolve(channels);
			}).catch(function(err) {
				reject(err);
			})
	});
}

function getVote(user) {
	var votesOperators = require('./votesOperators');
	console.log("GETTING A VOTE FOR USER #" + user.id);
	return new Promise(function(resolve, reject) {
		return getNotCompletedVote(user)
			.then(function(vote) {
				if (vote) {
					console.log('USING A NOT COMPLETED VOTE!');
					return votesOperators.getVote(vote);
				} else {
					console.log('USING A BRAND NEW VOTE!');
					return votesOperators.generateVote(user);
				}
			}).then(function(_vote) {
				resolve(_vote);
			}).catch(function(err) {
				reject(err);
			})
	});
}

function getNotCompletedVote(user) {
	console.log("GETTING NOT COMPLETED VOTE FOR USER #" + user.id);
	return new Promise(function(resolve, reject) {
		return Models.vote.findOne({
			where: {
				is_completed: false,
				channel1_id: {
					$ne: null
				},
				channel2_id: {
					$ne: null
				},
			},
			include: [{
				model: Models.user,
				where: {
					id: user.id
				}
			}]
		}).then(function(vote) {
			resolve(vote);
		}).catch(function(err) {
			reject(err);
		})
	});
}

function createToken(user) {
	return jwt.sign(user, Config.server.jwt_secret, {
		expiresIn: '30d'
	});
}

function getUser(user) {
	return new Promise(function(resolve, reject) {
		return Models.user
			.findOne({
				where: {
					id: user.id
				}
			})
			.then(function(_user) {
				resolve(_user);
			})
			.catch(function(err) {
				reject(err);
			})
	});
}

function vote(hash_id, winner) {
	var votesOperators = require('./votesOperators');
	return new Promise(function(resolve, reject) {
		return votesOperators.setWinner(hash_id, winner)
			.then(function(vote) {
				_winner = winner;
				_vote = vote;
				var actions = [];
				if (vote) {
					actions = ['NORMAL_VOTE'];
				}
				return pointsOperators.addPointsByActions(vote.user, actions)
			})
			.then(function(points) {
				mixpanel.track('Voted', {
					distinct_id: _vote.user.id,
					'Channel #1 | Name': _vote.Channel1.name,
					'Channel #2 | Name': _vote.Channel2.name,
					'Channel #1 | ID': _vote.Channel1.id,
					'Channel #2 | ID': _vote.Channel2.id,
					'Channel #1 | # of Subs': _vote.Channel1.subscriber_count,
					'Channel #2 | # of Subs': _vote.Channel2.subscriber_count,
					'Channel #1 | # of Views': _vote.Channel1.view_count,
					'Channel #2 | # of Views': _vote.Channel2.view_count,
					'Channel #1 | ID': _vote.Channel1.id,
					'Channel #2 | ID': _vote.Channel2.id,
					'Winner Side': _winner,
					'Points Earned': points.earned_points,
					'Time to vote': (new Date() - _vote.created_at),
					'Date vote created': _vote.created_at
				});
				mixpanel.people.increment(_vote.user.id, '# of Votes');
				mixpanel.people.increment(_vote.user.id, 'Points', points.earned_points);
				mixpanel.people.set(_vote.user.id, {
					'Points': points.total_points
				});
				resolve(points);
			})
			.catch(function(err) {
				reject(err);
			});
	});
}

module.exports = {
	getChannelsSubedBulk: getChannelsSubedBulk,
	getAllChannelsSubed: getAllChannelsSubed,
	saveChannels: saveChannels,
	getTwoRandomSubscriptions: getTwoRandomSubscriptions,
	getVote: getVote,
	createToken: createToken,
	vote: vote
}