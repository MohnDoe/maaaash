var Hashids = require('hashids'),
	Config = require('../config/config'),
	_ = require('lodash');

var hashids = new Hashids(Config.hashids.hash_secret.vote, 32);

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
			allowNull: false
		}
	}, {
		paranoid: true,
		underscored: true,
		hooks: {
			beforeCreate: function(vote) {
				vote.hash_id = vote.generateHashID();
				this.update({
					hash_id: vote.hash_id
				}, {
					where: {
						id: vote.id
					}
				});
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
			},
		},
		instanceMethods: {
			toJSON: function() {
				var values = this.dataValues;
				return values;
			},
			generateHashID: function() {
				return hashids.encode(this.id);
			},
			setChannel1: function(channel) {
				this.channel_1_id = channel.id;
				this.channel_1_elo_before = channel.elo_points;
				this.save();
			},
			setChannel2: function(channel) {
				this.channel_2_id = channel.id;
				this.channel_2_elo_before = channel.elo_points;
				this.save();
			},
			setWinner: function(channel) {
				this.winner_id = channel.id;
				this.save();
			},
			setLooser: function(channel) {
				this.looser_id = channel.id;
				this.save();
			},
			updateChannel1: function(channel) {
				this.channel_1_elo_after = channel.elo_points;
				this.save();
			},
			updateChannel2: function(channel) {
				this.channel_2_elo_after = channel.elo_points;
				this.save();
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

				this.save();
			}

		}
	});

	return Vote;
};