var Redis = require('./redis');

var Leaderboard = require('leaderboard');

var GlobalUsersLeaderboard = new Leaderboard('GlobalUsers', {
	pageSize: 10
}, Redis.client);

var WeeklyUsersLeaderboard = new Leaderboard('WeeklyUsers', {
	pageSize: 10
}, Redis.client);

var DailyUsersLeaderboard = new Leaderboard('DailyUsers', {
	pageSize: 10
}, Redis.client);


module.exports = {
	GlobalUsers: GlobalUsersLeaderboard,
	WeeklyUsers: WeeklyUsersLeaderboard,
	DailyUsers: DailyUsersLeaderboard,
}