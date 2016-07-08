var express = require('express'),
	router = express.Router();


var passportYoutube = require('../auth/youtube');

var Ops = require('../operators');


router.get('/youtube', passportYoutube.authenticate('youtube'));

router.get('/youtube/callback',
	passportYoutube.authenticate('youtube', {
		failureRedirect: '/login'
	}),
	function(req, res) {
		// Successful authentication
		Ops.usersOperators.getAllChannelsSubed(req.user)
			.then(function(channels) {
				// console.log("ALL DONE BB")
				console.log(channels);
			}).catch(function(err) {
				// console.log("ERROR");
				console.log(err.message);
			})
		res.json(req.user);
	});

module.exports = router;