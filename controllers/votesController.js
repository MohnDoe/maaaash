var Models = require("../models");
var Promise = require("bluebird");
var _ = require("lodash");

var Ops = require('../operators');


function getVote(req, res, next) {
	Ops.usersOperators.getVote(req.user)
		.then(function(vote) {
			res.status(200).json({
				status: 'success',
				data: {
					vote: vote
				}
			})
		}).catch(function(err) {
			res.status(500).json({
				status: 'error',
				message: 'Internal Error!'
			})
		});
}


module.exports = {
	getVote: getVote
}