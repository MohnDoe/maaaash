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
			});
		});
}


function putWinner(req, res) {
	if (req.params.hash_id && req.params.winner) {
		Ops.votesOperators.setWinner(req.params.hash_id, req.params.winner)
			.then(function(vote) {
				if (vote) {
					res.status(200).json({
						status: 'success',
						data: {
							points: {
								total: 5,
								voted: 20,
								voted_fast: 5
							}
						}
					});
				} else {
					res.status(404).json({
						status: 'error',
						message: 'Vote does not exists, sorry.'
					})
				}
			}).catch(function(err) {
				res.status(500).json({
					status: 'error',
					message: 'Internal Error!'
				});
			})
	} else {
		res.status(400).json({
			status: 'error',
			message: 'No Hash ID nor Winner ?! No idea what to do'
		})
	}
}

function getVoteByHashID(req, res) {
	if (req.params.hash_id) {
		Ops.votesOperators.existsByHashID(req.params.hash_id)
			.then(function(vote) {
				res.status(200).json({
					status: 'succes',
					data: {
						vote: vote
					}
				})
			}).catch(function(err) {
				res.status(404).json({
					status: 'error',
					message: 'Not Found!'
				})
			});
	} else {
		res.status(400).json({
			status: 'error',
			message: 'No Hash ID?! Where am I suppose to find something without a clue?!'
		})
	}
}

module.exports = {
	getVote: getVote,
	putWinner: putWinner,
	getVoteByHashID: getVoteByHashID
}