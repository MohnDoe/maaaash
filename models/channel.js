module.exports = function(sequelize, DataTypes) {
	var Channel = sequelize.define('channel', {
		name: {
			type: DataTypes.STRING,
			allowNull: false
		},
		channel_id: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true
		},
		view_count: {
			type: DataTypes.INTEGER,
			defaultValue: 0
		},
		subscriber_count: {
			type: DataTypes.INTEGER,
			defaultValue: 0
		},
		elo_points: {
			type: DataTypes.INTEGER,
			defaultValue: 1400
		},
		is_verified_youtube: {
			type: DataTypes.BOOLEAN,
			defaultValue: false
		},
		video_count: {
			type: DataTypes.INTEGER,
			defaultValue: 0
		},
		thumbnail_url: {
			type: DataTypes.STRING
		},
		description: {
			type: DataTypes.TEXT,
			defaultValue: 'A Youtube channel.'
		},
		custom_url: {
			type: DataTypes.STRING,
			defaultValue: null
		},
		lang: {
			type: DataTypes.STRING
		},
		country: {
			type: DataTypes.STRING
		},
		hidden_subscriber_count: {
			type: DataTypes.BOOLEAN,
			defaultValue: false
		},
		published_at: {
			type: DataTypes.DATE
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
			associate: function(models) {
				Channel.belongsToMany(models.user, {
					as: 'subcribers',
					through: "is_sub",
					foreign_key: 'channel_id'
				})
			},
		},
		instanceMethods: {
			toJSON: function() {
				var values = this.dataValues;
				return values;
			}
		}
	});

	return Channel;
};