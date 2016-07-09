var express = require('express'),
	router = express.Router(),
	_ = require('lodash');


var passportYoutube = require('../auth/youtube');

var Ops = require('../operators');


router.get('/youtube', passportYoutube.authenticate('youtube'));

router.get('/youtube/callback',
	passportYoutube.authenticate('youtube', {
		failureRedirect: '/login'
	}),
	function(req, res) {
		// Successful authentication
		res.json(req.user);
		Ops.usersOperators.saveChannels(req.user).then(function(user) {
			Ops.usersOperators.getTwoRandomSubscriptions(user).then(function(channels) {
				console.log('RANDOM CHANNELS ARE HERE :');
				// console.log('size :' + channels);
				console.log(channels.dataValues);
			// _.forEach(channels, function(value, key) {
			// 		console.log(value.id);
			// 	})
					// console.log(channels);
					// exit();
			}).catch(function(err) {
				console.log(err.message);
				// exit();
			})
		}).catch(function(err) {
			console.log("Error!");
			console.log(err.message);
		})
	});

module.exports = router;