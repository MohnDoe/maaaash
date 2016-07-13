var passport = require('passport');
var YoutubeV3Strategy = require('passport-youtube-v3').Strategy;

var _ = require('lodash');


var Models = require('../models');
var Config = require('../config/config');
var init = require('./init');

var Google = require("googleapis");

var Ops = require('../operators');


passport.use(new YoutubeV3Strategy({
		clientID: Config.auth.youtube.clientID,
		clientSecret: Config.auth.youtube.clientSecret,
		callbackURL: Config.auth.youtube.callbackURL,
		scope: ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
		authorizationParams: {
			access_type: 'online',
			approval_prompt: 'auto'
		}
	},
	function(accessToken, refreshToken, profile, done) {
		// console.log(profile);
		// console.log('END PROFIL-----------');
		// console.log(accessToken);
		// console.log(refreshToken);



		var OAuth2 = Google.auth.OAuth2;
		var oauth2Client = new OAuth2(Config.auth.youtube.clientID, Config.auth.youtube.clientSecret, Config.auth.youtube.callbackURL);
		oauth2Client.setCredentials({
			access_token: accessToken,
			refresh_token: refreshToken
		});

		Google.options({
			auth: oauth2Client
		});

		var Youtube = Google.youtube('v3');

		var oauth2 = Google.oauth2('v2');

		oauth2.userinfo.get({}, function(err, data) {
			var userinfo = data;
			// console.log(userinfo);
			Models.user.findOrCreate({
				where: {
					youtube_id: profile.id
				},
				defaults: {
					display_name: profile.displayName,
					// username: profile.username,
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
						plusgoogle_email: userinfo.email,
						plusgoogle_id: userinfo.id,
						access_token_youtube: accessToken,
						refresh_token_youtube: refreshToken
					}).then(function(user) {

						return done(null, user);

					}).catch(function(err) {
						return done(err);
					})
				}



				return done(null, user);
			});
		})



	}
));

init();

module.exports = passport;