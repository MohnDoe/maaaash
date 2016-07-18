var Models = require("../modules/models");
var Config = require("../modules/config");
var Promise = require('bluebird'),
	_ = require('lodash');

var Leaderboard = require('../modules/leaderboard');
var mixpanel = require('../modules/tracking');

var POINTS = {
	ACTIONS: {
		'NORMAL_VOTE': 10,
		'NEUTRAL_VOTE': 5,
	},
	BONUS: {
		'HARD_VOTE': 10,
		'MEDIUM_VOTE': 5,
		'NORMAL_VOTE': 0
	},
	STARTER: 200
}
var LEVELS_NAMES = [
	'New comer',
	'Beginner',
	'Voter',
];

// var NUMBER_LEVELS = LEVELS_NAMES.length;
var NUMBER_LEVELS = 50;

var LEVELS = [];


function init() {
	var DELTA = 0.75;
	var step = POINTS.ACTIONS['NORMAL_VOTE'] * 10;
	var levels = [];
	for (var i = 0; i < NUMBER_LEVELS; i++) {
		var name = null;
		if (i % 5 == 0 && i != 0) {
			// console.log("step increase");
			step += POINTS.ACTIONS['NORMAL_VOTE'] * 10;
		}

		if (i == 0) {
			pointsNeeded = POINTS.ACTIONS['NORMAL_VOTE'];
		} else if (i == 1) {
			pointsNeeded = POINTS.ACTIONS['NORMAL_VOTE'] * 5;
		} else {
			// pointsNeeded = levels[i - 1].points + (levels[i - 2].points * DELTA);
			pointsNeeded = levels[i - 1].points + step;
			pointsNeeded = Math.round(pointsNeeded);
		}
		if (LEVELS_NAMES[i]) {
			name = LEVELS_NAMES[i];
		}
		levels[i] = {
			number: i + 1,
			name: name,
			points: pointsNeeded
		};
	}

	LEVELS = levels;
}

function getLevelByPoints(points) {
	for (var i = 0; i < LEVELS.length; i++) {
		level = LEVELS[i];
		if (level.points >= points) {
			return level;
		}
	}
	return LEVELS[1];
}

function getLevels() {
	return LEVELS;
}

function getPointsEarned(actions, bonus) {
	return new Promise(function(resolve, reject) {
		var pointsEarned = 0;
		for (var i = 0; i < actions.length; i++) {
			if (_.has(POINTS.ACTIONS, actions[i])) {
				pointsEarned += POINTS.ACTIONS[actions[i]];
			}
		}
		if (bonus) {
			for (var i = 0; i < bonus.length; i++) {
				if (_.has(POINTS.BONUS, bonus[i])) {
					pointsEarned += POINTS.BONUS[bonus[i]];
				}
			}
		}
		resolve(pointsEarned);
	});
}

function addPoints(user, points) {
	var leaderboardsOperators = require('./leaderboardsOperators');
	return new Promise(function(resolve, reject) {
		return user.increment({
				points: points
			})
			.then(function(user) {
				// TRACKING
				_points = points;
				_user = user;

				mixpanel.people.increment(user.id, '# of Votes');
				mixpanel.people.increment(user.id, 'Points', points);
				mixpanel.people.set(user.id, {
					'Points': user.points
				});

				return user.points;
			})
			.then(function(userPoints) {
				_userPoints = userPoints;
				return leaderboardsOperators.incrementLeaderboard(_user, _points);
			})
			.then(function() {
				resolve(_userPoints);
			})
			.catch(function(err) {
				reject(err);
			})
	});

}

function addPointsByActions(user, actions, bonus) {
	return new Promise(function(resolve, reject) {
		return getPointsEarned(actions, bonus)
			.then(function(pointsEarned) {
				_pointsEarned = pointsEarned;
				return addPoints(user, _pointsEarned);
			})
			.then(function(totalPoints) {
				resolve({
					total_points: totalPoints,
					earned_points: _pointsEarned
				})
			})
			.catch(function(err) {
				reject(err);
			})

	})
}



init();

module.exports = {
	getLevelByPoints: getLevelByPoints,
	getLevels: getLevels,
	addPoints: addPoints,
	getPointsEarned: getPointsEarned,
	addPointsByActions: addPointsByActions
}