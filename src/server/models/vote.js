var Hashids = require('hashids'),
	Config = require('../config/config'),
	_ = require('lodash');

var hashids = new Hashids(Config.hashids.hash_secret.vote, Config.hashids.size.vote);
var hashids_channel = new Hashids(Config.hashids.hash_secret.channel, Config.hashids.size.channel);

module.exports = function(sequelize, DataTypes) {
	var Vote = sequelize.define('vote', {
		is_draw: {
			type: DataTypes.BOOLEAN,
			defaultValue: false,
		},
		completed_at: {
			type: DataTypes.DATE,
			defaultValue: null
		},
		channel1_elo_before: {
			type: DataTypes.INTEGER
		},
		channel2_elo_before: {
			type: DataTypes.INTEGER
		},
		channel1_elo_after: {
			type: DataTypes.INTEGER
		},
		channel2_elo_after: {
			type: DataTypes.INTEGER
		},
		is_completed: {
			type: DataTypes.BOOLEAN,
			defaultValue: false
		},
		hash_id: {
			type: DataTypes.STRING(32),
			unique: true
		}
	}, {
		scopes: {
			withChannels: {
				include: [{
					model: sequelize.models.channel,
					as: 'Channel1'
				}, {
					model: sequelize.models.channel,
					as: 'Channel2'
				}]
			}
		},
		paranoid: true,
		underscored: true,
		hooks: {
			afterCreate: function(vote) {
				// vote.hash_id = vote.generateHashID();
				vote.update({
					hash_id: vote.generateHashID()
				}, {
					where: {
						id: vote.id
					}
				});
				// console.log('HASH_id : ' + vote.hash_id);
			}
		},
		classMethods: {
			associate: function(models) {
				Vote.belongsTo(models.user);
				Vote.belongsTo(models.channel, {
					as: 'Channel1',
					foreignKey: 'channel1_id',
					constraints: false
				});
				Vote.belongsTo(models.channel, {
					as: 'Channel2',
					foreignKey: 'channel2_id',
					constraints: false
				});
				Vote.belongsTo(models.channel, {
					as: 'Winner',
					foreignKey: 'winner_id'
				});
				Vote.belongsTo(models.channel, {
					as: 'Looser',
					foreignKey: 'looser_id'
				})
			}
		},
		getterMethods: {
			identifier: function() {
				return this.generateChannelHashID(this.channel_1_id) + '.' +
					this.generateChannelHashID(this.channel_2_id) + '#' +
					this.hash_id
			}
		},
		instanceMethods: {
			toJSON: function() {
				var values = _.omit(
					this.dataValues, [
						'deleted_at',
						'updated_at',
						'channel1_elo_before',
						'channel1_elo_after',
						'channel2_elo_before',
						'channel2_elo_after',
						'winner_id',
						'looser_id',
						'is_draw',
						'id',
						'created_at',
						'user_id',
						'channel1_id',
						'channel2_id'
					]
				);
				if (this.user) {
					values.user = this.user.toJSON();
				}
				if (this.Channel1) {
					values.Channel1 = this.Channel1.toJSON();
				}
				if (this.Channel2) {
					values.Channel2 = this.Channel2.toJSON();
				}
				if (this.winner) {
					values.winner = this.winner.toJSON();
				}
				if (this.looser) {
					values.looser = this.looser.toJSON();
				}
				return values;
			},
			generateHashID: function() {
				return hashids.encode(this.id);
			},
			generateChannelHashID: function(channel_id) {
				return hashids_channel.encode(channel_id);
			},
			// setChannel1: function(channel) {
			// 	this.channel_1_id = channel.id;
			// 	this.channel_1_elo_before = channel.elo_points;
			// },
			// setChannel2: function(channel) {
			// 	this.channel_2_id = channel.id;
			// 	this.channel_2_elo_before = channel.elo_points;
			// },
			// setWinner: function(channel_id) {
			// 	this.winner_id = channel_id;
			// },
			// setLooser: function(channel) {
			// 	this.looser_id = channel_id;
			// },
			// updateChannel1: function(channel) {
			// 	this.channel_1_elo_after = channel.elo_points;
			// },
			// updateChannel2: function(channel) {
			// 	this.channel_2_elo_after = channel.elo_points;
			// },
			complete: function() {
				this.is_completed = true;
				this.completed_at = new Date();
				return this.save();

			}

		}
	});

	return Vote;
};