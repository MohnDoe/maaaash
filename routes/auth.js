var express = require('express'),
	router = express.Router();


var passportYoutube = require('../auth/youtube');


router.get('/youtube', passportYoutube.authenticate('youtube'));

router.get('/youtube/callback',
	passportYoutube.authenticate('youtube', {
		failureRedirect: '/login'
	}),
	function(req, res) {
		// Successful authentication
		res.json(req.user);
	});

module.exports = router;