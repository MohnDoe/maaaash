'use strict';
var bcrypt = require('bcrypt-nodejs'),
    _ = require('lodash');

module.exports = function(sequelize, DataTypes) {
    var User = sequelize.define('user', {
        username: {
            type: DataTypes.STRING(20),
            // unique: true,
            // allowNull: false,
            validate: {
                len: [3, 20]
            }
        },
        display_name: {
            type: DataTypes.STRING
        },
        password: {
            type: DataTypes.STRING,
            // allowNull: false, //because of social login maybe generate one ?
            validate: {
                min: 4
            }
        },
        email: {
            type: DataTypes.STRING,
            unique: true,
            // allowNull: false, // because of fucking Twitter that doesn't give email adresse <- have to ask after login via Twitter
            validate: {
                isEmail: true
            }
        },
        plusgoogle_email: {
            type: DataTypes.STRING
        },
        plusgoogle_id: {
            type: DataTypes.STRING
        },
        password_reset_token: {
            type: DataTypes.STRING
        },
        points: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        youtube_id: {
            type: DataTypes.STRING,
            defaultValue: 0
        },
        access_token_youtube: {
            type: DataTypes.STRING
        },
        refresh_token_youtube: {
            type: DataTypes.STRING
        },
        last_synced: {
            type: DataTypes.DATE,
            default: null
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
            associate: function(models) {
                // associations can be defined herebr

                // a user is subed to many channels
                User.belongsToMany(models.channel, {
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
                        'password'
                    ]
                );
                return values;
            }
        }
    });
    return User;
};