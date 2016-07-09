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
			Ops.usersOperators.getVote(user)
				.then(function(vote) {
					console.log(vote.dataValues);
				})
				.catch(function(err) {
					console.log(err.message);
				})
		}).catch(function(err) {
			console.log("Error!");
			console.log(err.message);
		})
	});

module.exports = router;