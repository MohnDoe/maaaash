var Promise = require('bluebird');
var _ = require('lodash');
var Models = require('../modules/models');

var Leaderboard = require('../modules/leaderboard');

function incrementLeaderboard(user, points) {
	return new Promise(function(resolve, reject) {
		Leaderboard.GlobalUsers.incr(user.id, points, function(err) {
			reject(err);
		});
		Leaderboard.WeeklyUsers.incr(user.id, points, function(err) {
			reject(err);
		});
		Leaderboard.DailyUsers.incr(user.id, points, function(err) {
			reject(err);
		});
		resolve();
	});
}

function getLeaderboard(name, page) {
	if (!page) {
		page = 1;
	}
	return new Promise(function(resolve, reject) {
		var l = Leaderboard.GlobalUsers;
		if (name == "GlobalUsers") {
			l = Leaderboard.GlobalUsers;
		} else if (name == "WeeklyUsers") {
			l = Leaderboard.WeeklyUsers;
		} else if (name == "DailyUsers") {
			l = Leaderboard.DailyUsers;
		}
		return l.list(function(err, list) {
			if (err) {
				reject(err);
			}
			associateUsers(list)
				.then(function(listUsers) {
					resolve(listUsers);
				})
				.catch(function(err) {
					reject(err);
				})
		})
	});
}

function associateUsers(list) {

	return new Promise(function(resolve, reject) {
		var listUsers = [];


		_.forEach(list, function(user, key) {
			Models.user.findById(user.member)
				.then(function(_user) {
					if (_user) {
						theUser = {
								user: _user,
								earned_points: user.score
							}
							// _user.earned_points = user.score;
						listUsers.push(theUser);
					}
					done();
				})
				.catch(function(err) {
					reject(err);
				})
		});


		done = _.after(list.length, function() {
			resolve(listUsers);
		})
	})
}

function addToGlobal(user) {
	Leaderboard.GlobalUsers.add(user.id, user.points);
}

module.exports = {
	incrementLeaderboard: incrementLeaderboard,
	getLeaderboard: getLeaderboard,
	addToGlobal: addToGlobal,
}