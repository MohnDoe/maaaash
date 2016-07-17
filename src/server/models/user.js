var bcrypt = require('bcrypt-nodejs'),
    _ = require('lodash'),
    Sequelize = require('sequelize'),
    Promise = require('bluebird');

var DB = require('../modules/db').instance;
var Config = require('../modules/config');
var Models = require('../modules/models');

module.exports = DB.define('user', {
    username: {
        type: Sequelize.STRING(20),
        // unique: true,
        // allowNull: false,
        validate: {
            len: [3, 20]
        }
    },
    display_name: {
        type: Sequelize.STRING
    },
    password: {
        type: Sequelize.STRING,
        // allowNull: false, //because of social login maybe generate one ?
        validate: {
            min: 4
        }
    },
    email: {
        type: Sequelize.STRING,
        unique: true,
        // allowNull: false, // because of fucking Twitter that doesn't give email adresse <- have to ask after login via Twitter
        validate: {
            isEmail: true
        }
    },
    plusgoogle_email: {
        type: Sequelize.STRING
    },
    plusgoogle_id: {
        type: Sequelize.STRING
    },
    password_reset_token: {
        type: Sequelize.STRING
    },
    points: {
        type: Sequelize.INTEGER,
        defaultValue: 0
    },
    youtube_id: {
        type: Sequelize.STRING,
        defaultValue: 0
    },
    access_token_youtube: {
        type: Sequelize.STRING
    },
    refresh_token_youtube: {
        type: Sequelize.STRING
    },
    last_synced: {
        type: Sequelize.DATE,
        default: null
    },
    url_image: {
        type: Sequelize.STRING,
        default: null
    },
    status: {
        type: Sequelize.INTEGER,
        defaultValue: 2 // normaluser
    }
}, {
    // TODO : hook bcrypt password
    paranoid: true,
    underscored: true,
    hooks: {
        beforeCreate: function(user) {
            user.password = this.generateHash(user.password);
        },
        beforeUpdate: function(user) {
            // TODO : check if change before
            //user.password = this.generateHash(user.password);
        }
    },
    classMethods: {
        init: function() {
            // associations can be defined herebr

            // a user is subed to many channels
            Models.user.belongsToMany(Models.channel, {
                as: 'subscriptions',
                through: 'is_sub',
                //foreign_key: 'user_id'
            });
        },
        generateHash: function(password) {
            return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
        },
    },
    instanceMethods: {
        validPassword: function(password) {
            return bcrypt.compareSync(password, this.password);
        },
        toJSON: function() {
            var values = _.omit(
                this.dataValues, [
                    'passwordResetToken',
                    'plusgoogle_email',
                    'password_reset_token',
                    'created_at',
                    'updated_at',
                    'deleted_at',
                    'access_token_youtube',
                    'refresh_token_youtube',
                    'plusgoogle_id',
                    'youtube_id',
                    'password',
                    'email',
                    'username',
                    'id'
                ]
            );
            return values;
        }
    }
});