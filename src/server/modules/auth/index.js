//Promise = require("bluebird");
var Passport = require('passport');
var App = require("../../server");
var Models = require("../models");
var Config = require("../config");
var Promise = require("bluebird");
var debug = require("debug")('app:auth');
//var JWT      = require("jsonwebtoken");
var Google = require("googleapis");
var mixpanel = require('../tracking');

var userCache = {};

module.exports = {
    init: function() {

        //Auth Middleware
        App.use(Passport.initialize());
        this.middleware = Passport.session();

        //User serialisation
        Passport.serializeUser(function(user, done) {
            return done(null, user.id);
        });

        //And deserialisation
        Passport.deserializeUser(function(id, done) {
            console.log("User check");

            if (userCache[id]) {
                console.log("From cache");
                return done(null, userCache[id][0]);
            }

            return Models.user.findById(id).then(function(user) {
                if (user) {
                    console.log("From DB");
                    userCache[user.id] = [
                        user, setTimeout(function() {
                            console.log("Deleted cache #" + id);
                            delete userCache[user.id];
                        }, Config.auth.userCacheTime)
                    ];
                    done(null, user);
                }
                if (!user) {
                    return done(null, false);
                }
            });
        });

        require("./social").init();
        // require("./local.js").init();
    },

    middleware: null,
    handleYoutubeUser: function(accessToken, refreshToken, profile) {

        var OAuth2 = Google.auth.OAuth2;
        var oauth2Client = new OAuth2(Config.auth.youtube.clientID, Config.auth.youtube.clientSecret, Config.auth.youtube.callbackURL);
        oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken
        });

        Google.options({
            auth: oauth2Client
        });

        var oauth2 = Google.oauth2('v2');

        return new Promise(function(resolve, reject) {
            oauth2.userinfo.get({}, function(err, data) {
                var userinfo = data;
                var email = null;
                if (userinfo.email.split('@')[1] != 'pages.plusgoogle.com') {
                    email = userinfo.email;
                }
                Models.user.findOrCreate({
                    where: {
                        youtube_id: profile.id
                    },
                    defaults: {
                        display_name: profile.displayName,
                        // username: profile.username,
                        url_image: userinfo.picture,
                        email: email,
                        plusgoogle_email: userinfo.email,
                        plusgoogle_id: userinfo.id,
                        youtube_id: profile.id,
                        access_token_youtube: accessToken,
                        refresh_token_youtube: refreshToken
                    }
                }).spread(function(user, created) {
                    if (!created) {
                        user.update({
                            youtube_id: profile.id,
                            email: email,
                            url_image: userinfo.picture,
                            plusgoogle_email: userinfo.email,
                            plusgoogle_id: userinfo.id,
                            access_token_youtube: accessToken,
                            refresh_token_youtube: refreshToken
                        }).then(function(user) {

                            mixpanel.track('Logged In', {
                                distinct_id: user.id,
                                'Provider': 'Youtube'
                            });

                            resolve(user);
                            // return done(null, user);

                        }).catch(function(err) {
                            reject(err);
                            // return done(err);
                        })
                    }

                    mixpanel.track('Signed Up', {
                        distinct_id: user.id,
                        'Provider': 'Youtube'
                    });

                    mixpanel.people.set(user.id, {
                        $created: new Date(),
                        $name: user.display_name,
                        $email: email || user.plusgoogle_email,
                        'Points': 0,
                        '# of Votes': 0,
                        'Groupes': 'Alpha Tester'
                    });


                    resolve(user);

                    // return done(null, user);
                });
            })
        });
    },
    handleSocialUser: function(network, profileID, accessToken, profile, data) {

        //Either create a new user with social link, or return it and update the data

        //todo: grab avatar

        var sociallink;
        var user;

        return new Promise(function(resolve, reject) {


            return Models.sociallink.insertOrUpdate({

                network: network,
                profileID: profileID,
                accessToken: accessToken,

            }).then(function(created) {

                //Sadly, there is no way for insertOrUpdate (upsert) to return the inserted row, so we have to find it again manually
                return Models.sociallink.findOne({
                    where: {
                        network: network,
                        profileID: profileID
                    }
                });

            }).then(function(_sociallink) {

                sociallink = _sociallink;

                //Create or find user

                if (sociallink.user) {
                    return resolve(sociallink.user);
                } else {
                    return Models.user.findOrCreate({
                        where: {
                            $and: [{
                                email: data.email
                            }, {
                                email: {
                                    $ne: null
                                }
                            }, {
                                email: {
                                    $ne: ''
                                }
                            }]
                        },
                        defaults: {
                            username: data.username,
                            email: data.email
                        }
                    })
                }

                //Todo: what do we do if username already taken?

            }).spread(function(_user, created) {

                user = _user;
                return sociallink.setUser(user);

            }).then(function() {

                return resolve(user);

            }).catch(function(err) {

                return reject(err);

            });
        });


    },
};