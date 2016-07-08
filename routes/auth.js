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
		res.json(req.user);
		Ops.usersOperators.saveChannels(req.user).then(function(user) {
			console.log("All channels saved bro!");
		}).catch(function(err) {
			console.log("Error!");
			console.log(err.message);
		})
	});

module.exports = router;