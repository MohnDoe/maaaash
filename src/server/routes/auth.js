var express = require('express'),
	router = express.Router(),
	_ = require('lodash');


var passportYoutube = require('../auth/youtube');

var Ops = require('../operators');

router.get(['/success', '/failure'], function(req, res, next) {
	res.send("<html><body><script>window.close()</script></body></html>");
});

router.get('/youtube', passportYoutube.authenticate('youtube'));
router.get('/youtube/callback',
	passportYoutube.authenticate('youtube', {
		successRedirect: '/auth/success',
		failureRedirect: '/auth/failure'
	}),
	function(req, res) {
		res.json(req.user);
	});

module.exports = router;