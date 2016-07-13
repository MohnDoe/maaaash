var Promise = require("bluebird");
var _ = require("lodash");

var Ops = require('../operators');

function getStatus(req, res) {
	if (req.user) {
		res.status(200).json({
			status: 'success',
			data: {
				status: 'connected',
				user: req.user,
				jwt_token: Ops.usersOperators.createToken({
					id: req.user.id
				})
			}
		});
	} else {
		res.status(200).json({
			status: 'success',
			data: {
				status: 'notconnected'
			}
		})
	}
}

function syncChannels(req, res) {
	if (req.user) {
		Ops.usersOperators.saveChannels(req.user)
			.then(function(user) {
				res.status(200).json({
					status: 'success',
					message: 'Channels successfully synced'
				});
			})
			.catch(function(err) {
				res.status(500).json({
					status: 'error',
					message: 'Internal Error!'
				})
			})
	} else {
		res.status(401).json({
			status: 'error',
			message: 'You must be logged in to do that'
		});
	}
}

module.exports = {
	getStatus: getStatus,
	syncChannels: syncChannels
}