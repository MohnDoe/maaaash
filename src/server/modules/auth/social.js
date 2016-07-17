var Passport = require('passport');
var YoutubeV3Strategy = require('passport-youtube-v3').Strategy;

var App = require("../../server");
var Models = require("../models");
var Config = require("../config");
var Auth = require("./index");

//Callback url (same for all providers - for now, always just closes the window (fail or success))
App.get([Config.auth.successCallbackURL, Config.auth.failureCallbackURL], function(req, res, next) {
    res.send("<html><body><script>window.close()</script></body></html>");
});

function setupYoutube() {

    //Url to start the twitter login flow
    App.get('/auth/youtube', Passport.authenticate('youtube', Config.auth.youtube.options));

    // Use the GoogleStrategy within Passport.
    //   Strategies in passport require a `verify` function, which accept
    //   credentials (in this case, a token, tokenSecret, and Google profile), and
    //   invoke a callback with a user object.
    Passport.use(new YoutubeV3Strategy({
            clientID: Config.auth.youtube.clientID,
            clientSecret: Config.auth.youtube.clientSecret,
            callbackURL: Config.auth.youtube.callbackURL,
            scope: [
                'https://www.googleapis.com/auth/youtube.readonly',
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile'
            ],
            authorizationParams: {
                access_type: 'online',
                approval_prompt: 'auto'
            }
        },
        function(accessToken, refreshToken, profile, done) {

            Auth.handleYoutubeUser(accessToken, refreshToken, profile).then(function(user) {
                return done(null, user);
            }).catch(function(err) {
                return done(err);
            });
        }
    ));

    //Google return url / callback
    App.get(Config.auth.youtube.callbackURL, Passport.authenticate('youtube', {
        successRedirect: Config.auth.successCallbackURL,
        failureRedirect: Config.auth.failureCallbackURL
    }));

}

module.exports = {
    init: function() {
        setupYoutube();
    },
};