var Hashids = require('hashids'),
	_ = require('lodash'),
	Sequelize = require('sequelize'),
	Promise = require('bluebird');

var DB = require('../modules/db').instance;
var Config = require('../modules/config');
var Models = require('../modules/models');

var hashids = new Hashids(Config.hashids.hash_secret.vote, Config.hashids.size.vote);
var hashids_channel = new Hashids(Config.hashids.hash_secret.channel, Config.hashids.size.channel);

module.exports = DB.define('vote', {
	is_draw: {
		type: Sequelize.BOOLEAN,
		defaultValue: false,
	},
	completed_at: {
		type: Sequelize.DATE,
		defaultValue: null
	},
	channel1_elo_before: {
		type: Sequelize.INTEGER
	},
	channel2_elo_before: {
		type: Sequelize.INTEGER
	},
	channel1_elo_after: {
		type: Sequelize.INTEGER
	},
	channel2_elo_after: {
		type: Sequelize.INTEGER
	},
	channel1_elo_odds: {
		type: Sequelize.DECIMAL(6, 5),
		defaultValue: 0
	},
	channel2_elo_odds: {
		type: Sequelize.DECIMAL(6, 5),
		defaultValue: 0
	},
	is_completed: {
		type: Sequelize.BOOLEAN,
		defaultValue: false
	},
	hash_id: {
		type: Sequelize.STRING(32),
		unique: true
	}
}, {
	scopes: {
		withChannels: {
			include: [{
				model: Models.channel,
				as: 'Channel1'
			}, {
				model: Models.channel,
				as: 'Channel2'
			}, {
				model: Models.user
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
		init: function() {
			Models.vote.belongsTo(Models.user);
			Models.vote.belongsTo(Models.channel, {
				as: 'Channel1',
				foreignKey: 'channel1_id',
				constraints: false
			});
			Models.vote.belongsTo(Models.channel, {
				as: 'Channel2',
				foreignKey: 'channel2_id',
				constraints: false
			});
			Models.vote.belongsTo(Models.channel, {
				as: 'Winner',
				foreignKey: 'winner_id'
			});
			Models.vote.belongsTo(Models.channel, {
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
					'channel2_id',
					'Channel1',
					'Channel2',
					'channel2_elo_odds',
					'channel1_elo_odds'
				]
			);
			values.channels = [];
			if (this.user) {
				values.user = this.user.toJSON();
			}
			if (this.Channel1) {
				values.channels[0] = this.Channel1.toJSON();
			}
			if (this.Channel2) {
				values.channels[1] = this.Channel2.toJSON();
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
		complete: function() {
			this.is_completed = true;
			this.completed_at = new Date();
			return this.save();

		}

	}
});