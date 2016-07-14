var Models = require('../models');
var Promise = require('bluebird');

var POINTS = {
	NORMAL_VOTE: 10,
	NEUTRAL_VOTE: 5,
	BONUS_VOTE: {
		HARD: 10,
		MEDIUM: 5,
		NORMAL: 0
	},
	STARTER: 200
}

var NUMBER_LEVELS = 50;

var LEVELS = [];

function init() {
	var DELTA = 0.6;
	var step = POINTS.NORMAL_VOTE * 10;
	var levels = [];
	for (var i = 0; i < NUMBER_LEVELS; i++) {
		if (i % 5 == 0 && i != 0) {
			// console.log("step increase");
			step += POINTS.NORMAL_VOTE * 9.5;
		}

		if (i == 0) {
			pointsNeeded = POINTS.NORMAL_VOTE;
		} else if (i == 1) {
			pointsNeeded = POINTS.NORMAL_VOTE * 5;
		} else {
			// pointsNeeded = levels[i - 1] + (levels[i - 2] * DELTA);
			pointsNeeded = levels[i - 1] + step;
			pointsNeeded = Math.round(pointsNeeded);
		}
		levels[i] = pointsNeeded;
	}

	LEVELS = levels;
}

module.exports = {
	POINTS: POINTS,
	init: init
}