var Ops = require('../operators');


function getVote(req, res) {
	Ops.usersOperators.getVote(req.user)
		.then(function(vote) {
			res.status(200).json({
				status: 'success',
				data: {
					vote: vote
				}
			});
		}).catch(function(err) {
			res.status(500).json({
				status: 'error',
				message: 'Internal Error!'
			})
		});
}


function putWinner(res, res) {

}

function putDraw(req, res) {

}

module.exports = {
	getVote: getVote,
	putWinner: putWinner,
	putDraw: putDraw
}