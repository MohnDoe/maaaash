var Promise = require('bluebird'),
	_ = require('lodash');
var Models = require('../models');

var Config = require('../config/config');

var Google = require('googleapis');
var Youtube = Google.youtube('v3');

var OAuth2 = Google.auth.OAuth2;
var oauth2Client = new OAuth2(Config.auth.youtube.clientID, Config.auth.youtube.clientSecret, Config.auth.youtube.callbackURL);


function saveAllChannels(data) {

}

function getChannelsSubedBulk(user, nextPageToken) {

	return new Promise(function(resolve, reject) {
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
						var channelInfos = {
							snippet: value['snippet'],
							statistics: value['statistics']
						};
						var channelSnippet = value['snippet'];
						var channel = {
							id: data.id,
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
			console.log("allChannels is empty")
			allChannels = [];
		}
		return getChannelsSubedBulk(user, nextPageToken)
			.then(function(channels) {
				var _channels = channels;
				allChannels = allChannels.concat(_channels.items);

				if (_channels.nextPageToken) {
					console.log('# channels so far : ' + allChannels.length);
					return getAllChannelsSubed(user, allChannels, _channels.nextPageToken).then(resolve);
				} else {
					console.log('# channels total : ' + allChannels.length);
					resolve(allChannels);
				}

			}).catch(function(err) {
				return reject(err);
			});
	});
}

function saveChannels(user, channels) {
	_.forEach(channels, function(channel, key) {
		Ops.channelsOperators.findOrCreateChannel(channel)
			.then(function(_channel) {
				_channel.addUser(user);
			});
	})
}

module.exports = {
	getChannelsSubedBulk: getChannelsSubedBulk,
	getAllChannelsSubed: getAllChannelsSubed,
}