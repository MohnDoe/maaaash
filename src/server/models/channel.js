var _ = require('lodash'),
	Sequelize = require('sequelize'),
	Promise = require('bluebird');

var DB = require('../modules/db').instance;
var Config = require('../modules/config');
var Models = require('../modules/models');

module.exports = DB.define('channel', {
	name: {
		type: Sequelize.STRING,
		allowNull: false
	},
	channel_id: {
		type: Sequelize.STRING,
		allowNull: false,
		unique: true
	},
	view_count: {
		type: Sequelize.BIGINT,
		defaultValue: 0
	},
	subscriber_count: {
		type: Sequelize.BIGINT,
		defaultValue: 0
	},
	elo_points: {
		type: Sequelize.INTEGER,
		defaultValue: 1400
	},
	is_verified_youtube: {
		type: Sequelize.BOOLEAN,
		defaultValue: false
	},
	video_count: {
		type: Sequelize.BIGINT,
		defaultValue: 0
	},
	thumbnail_url: {
		type: Sequelize.STRING
	},
	banner_url: {
		type: Sequelize.STRING
	},
	description: {
		type: Sequelize.TEXT,
		defaultValue: 'A Youtube channel.'
	},
	custom_url: {
		type: Sequelize.STRING,
		defaultValue: null
	},
	lang: {
		type: Sequelize.STRING
	},
	country: {
		type: Sequelize.STRING
	},
	hidden_subscriber_count: {
		type: Sequelize.BOOLEAN,
		defaultValue: false
	},
	published_at: {
		type: Sequelize.DATE
	}
}, {
	paranoid: true,
	underscored: true,
	hooks: {
		// beforeCreate: function(channel){
		// 	channel.hash_id = this.generateHash(channel.id)
		// }
	},
	classMethods: {
		init: function() {
			Models.channel.belongsToMany(Models.user, {
				as: 'subscribers',
				through: "is_sub",
				// foreign_key: 'channel_id'
			})
		},
	},
	instanceMethods: {
		toJSON: function() {
			var values = _.omit(
				this.dataValues, [
					'deleted_at',
					'updated_at',
					'created_at',
					'elo_points',
					'is_verified_youtube',
					'published_at',
					'lang',
					'id',
					'hidden_subscriber_count',
					'custom_url',
					'country',
					'channel_id',
				]
			);
			return values;
		}
	}
});