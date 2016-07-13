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
		// Successful authentication
		res.json(req.user);
		// Ops.usersOperators.saveChannels(req.user).then(function(user) {
		// 	// Ops.usersOperators.getVote(user)
		// 	// 	.then(function(vote) {
		// 	// 		console.log(vote.dataValues);
		// 	// 	})
		// 	// 	.catch(function(err) {
		// 	// 		console.log(err.message);
		// 	// 	})
		// 	console.log('all done');
		// }).catch(function(err) {
		// 	console.log("Error!");
		// 	console.log(err.message);
		// })
	});

module.exports = router;