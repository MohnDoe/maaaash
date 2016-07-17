var Models = require("../modules/models");
var Config = require("../modules/config");
var Promise = require('bluebird');

function createChannel(data) {
	return new Promise(function(resolve, reject) {

		return Models.channel.create({
			name: data.name,
			channel_id: data.id,
			thumbnail_url: data.thumbnail_url,
			description: data.description,
			view_count: data.view_count,
			subscriber_count: data.subscriber_count,
			video_count: data.video_count,
			thumbnail_url: data.thumbnail_url,
			custom_url: data.custom_url,
			lang: data.lang,
			country: data.country,
			hidden_subscriber_count: data.hidden_subscriber_count,
			published_at: data.published_at
		}).then(function(newChannel) {
			resolve(newChannel);
		}).catch(function(err) {
			console.log("An error during creation of channel!");
			console.log(err.message);

			reject(err);
		})
	});
}

function findOrCreateChannel(data) {
	return new Promise(function(resolve, reject) {
		return Models.channel.find({
			where: {
				channel_id: data.id
			}
		}).then(function(channel) {
			if (channel) {
				resolve(channel);
			} else {
				return createChannel(data);
			}
		}).then(function(channel) {
			resolve(channel);
		}).catch(function(err) {
			reject(err);
		})
	})
}


module.exports = {
	findOrCreateChannel: findOrCreateChannel,
	createChannel: createChannel
}