var Models = require("../models");
var Promise = require("bluebird");
var _ = require("lodash");

var Ops = require('../operators');


function getList(req, res, next) {
	Models.quote.findAndCountAll({
		//TODO : add limit and pagination
		include: [{
			model: Models.user,
			as: "user"
		}, {
			model: Models.song,
			as: 'song'
		}]
	}).then(function(data) {
		res.status(200).json({
			status: 'success',
			data: {
				quote: data.rows
			},
			count: data.count
		});
	}).catch(function(err) {
		console.log(err);
	});
}

function getQuote(req, res, next) {
	Models.quote.find({
		where: {
			id: req.params.id
		},
		include: [{
			model: Models.user,
			as: 'user'
		}, {
			model: Models.song,
			as: 'song'
		}]
	}).then(function(_quote) {
		quote = _quote;
		if (!quote) {
			res.status(404).json({
				status: 'error',
				message: 'Quote not found!'
			})
		} else {
			res.status(200).json({
				status: 'success',
				data: {
					quote: quote
				}
			})
		}
	});
}

function getLikesAndDislikes(req, res, next) {
	// TODO : make this automated for every types of elements (comments, songs, artists, quotes, etc)
	Models.quote.find({
		where: {
			id: req.params.id
		}
	}).then(function(quote) {
		if (quote) {
			return quote;
		} else {
			res.status(404).json({
				status: 'error',
				message: 'Quote not found!'
			})
		}
	}).then(function(quote) {
		quote.getLikes().then(function(likesAndDislikes) {
			items = {
				likes: 0,
				dislikes: 0
			}
			_.forEach(likesAndDislikes, function(likeOrDislike) {
				likeOrDislike = likeOrDislike.dataValues;
				if (likeOrDislike.type == 'like') {
					items.likes++;
				} else if (likeOrDislike.type == 'dislike') {
					items.dislikes++;
				}
			})
			res.status(200).json({
				status: 'success',
				items: items
			})
		});
	});
}

/* PUT */
function putIncrementPopularity(req, res, next) {
	Models.quote.find({
		where: {
			id: req.body.quote_id
		}
	}).then(function(quote) {
		if (quote) {
			quote.increment('popularity').then(function() {
				res.status(200).json({
					status: 'success',
					message: 'Popularity incremented w/ success'
				})
			})
		} else {
			res.status(404).json({
				status: 'error',
				message: 'Quote not found!'
			})
		}
	});
}

function putIncrementViews(req, res, next) {
	Models.quote.find({
		where: {
			id: req.body.quote_id
		}
	}).then(function(quote) {
		if (quote) {
			quote.increment('views').then(function() {
				res.status(200).json({
					status: 'success',
					message: 'Views incremented w/ success'
				})
			})
		} else {
			res.status(404).json({
				status: 'error',
				message: 'Quote not found!'
			})
		}
	});
}

/* POST */
function postCreateQuote(req, res, next) {
	if (req.body.quote && req.body.quote.content && req.body.quote.start_time && req.body.quote.duration) {
		Ops.quotesOperators.createQuote(req.body.quote).then(function(quote) {
			res.status(200).json({
				status: "success",
				quote: quote,
				message: "Quote created with success"
			})

		}).catch(function(err) {
			console.log(err.message);
			res.status(500).json({
				status: 'error',
				message: 'An error as occured, sorry!'
			});
		});

	} else {

		res.status(400).json({
			status: 'error',
			message: 'Something is missing'
		})

	}
}

function postAddSongQuote(req, res, next) {

}

function postAddArtistQuote(req, res, next) {

}

/* DELETE */
function deleteQuote(req, res, next) {

}


module.exports = {
	getList: getList,
	getQuote: getQuote,
	getLikesAndDislikes: getLikesAndDislikes,
	putIncrementViews: putIncrementViews,
	putIncrementPopularity: putIncrementPopularity,
	postCreateQuote: postCreateQuote,
	postAddArtistQuote: postAddArtistQuote,
	postAddSongQuote: postAddSongQuote,
	deleteQuote: deleteQuote
}