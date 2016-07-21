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
		return Models.channel.findOrCreate({
				where: {
					channel_id: data.id
				},
				defaults: {
					channel_id: data.id,
					name: data.name,
					thumbnail_url: data.thumbnail_url,
					description: data.description,
					view_count: data.view_count,
					subscriber_count: data.subscriber_count,
					video_count: data.video_count,
					thumbnail_url: data.thumbnail_url,
					banner_url: data.banner_url,
					custom_url: data.custom_url,
					lang: data.lang,
					country: data.country,
					hidden_subscriber_count: data.hidden_subscriber_count,
					published_at: data.published_at
				}
			})
			.spread(function(channel, created) {
				if (created) {
					resolve(channel);
				} else {
					channel.update({
							name: data.name,
							thumbnail_url: data.thumbnail_url,
							description: data.description,
							view_count: data.view_count,
							subscriber_count: data.subscriber_count,
							video_count: data.video_count,
							thumbnail_url: data.thumbnail_url,
							banner_url: data.banner_url,
							custom_url: data.custom_url,
							hidden_subscriber_count: data.hidden_subscriber_count,
						})
						.then(function(_channel) {
							resolve(_channel);
						})
						.catch(function(err) {
							reject(err);
						});
				}
			})
			.catch(function(err) {
				console.log("An error during creation of channel! FOC");
				console.log(err.message);

				reject(err);
			})
	})
}

function getTopChannels() {
	return new Promise(function(resolve, reject) {
		return Models.channel.findAll({
				order: 'elo_points DESC',
				limit: 10
			})
			.then(function(channels) {
				resolve(channels);
			})
			.catch(function(err) {
				reject(err);
			})
	})
}


module.exports = {
	findOrCreateChannel: findOrCreateChannel,
	createChannel: createChannel,
	getTopChannels: getTopChannels
}