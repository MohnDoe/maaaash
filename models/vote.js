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
		channel_1_elo_before: {
			type: DataTypes.INTEGER
		},
		channel_2_elo_before: {
			type: DataTypes.INTEGER
		},
		channel_1_elo_after: {
			type: DataTypes.INTEGER
		},
		channel_2_elo_after: {
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
					as: 'Channel_1',
					foreignKey: 'channel_1_id'
				});
				Vote.belongsTo(models.channel, {
					as: 'Channel_2',
					foreignKey: 'channel_2_id'
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
					this.dataValues, ['deleted_at', 'updated_at', 'user_id', ]
				);
				if (this.user) {
					values.user = this.user.toJSON();
				}
				return values;
			},
			generateHashID: function() {
				return hashids.encode(this.id);
			},
			generateChannelHashID: function(channel_id) {
				return hashids_channel.encode(channel_id);
			},
			setChannel1: function(channel) {
				this.channel_1_id = channel.id;
				this.channel_1_elo_before = channel.elo_points;
			},
			setChannel2: function(channel) {
				this.channel_2_id = channel.id;
				this.channel_2_elo_before = channel.elo_points;
			},
			setWinner: function(channel) {
				this.winner_id = channel.id;
			},
			setLooser: function(channel) {
				this.looser_id = channel.id;
			},
			updateChannel1: function(channel) {
				this.channel_1_elo_after = channel.elo_points;
			},
			updateChannel2: function(channel) {
				this.channel_2_elo_after = channel.elo_points;
			},
			complete: function(is_draw, channel_1, channel_2, channel_winner, channel_looser) {
				this.is_completed = true;
				this.completed_at = new Date();
				this.is_draw = is_draw;

				this.updateChannel1(channel_1);
				this.updateChannel2(channel_2);
				if (!is_draw) {
					this.setWinner(channel_winner);
					this.setLooser(channel_looser);
				}

			}

		}
	});

	return Vote;
};