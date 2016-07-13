var Promise = require("bluebird");
var _ = require("lodash");

var Ops = require('../operators');

function getStatus(req, res) {
	if (req.user) {
		res.status(200).json({
			status: 'success',
			data: {
				status: 'connected',
				user: req.user
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

module.exports = {
	getStatus: getStatus
}