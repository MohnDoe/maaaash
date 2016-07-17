angular.module('App').service('Points', function($rootScope, Api, $q) {

	var levels = null;
	var loaded = false;

	function init() {

		Api.call({
			url: 'level',
			callback: function(res) {
				console.log('levelsInitDone');
				levels = res.data.levels;

				loaded = true;
				$rootScope.$emit('levelsInitDone');

			}
		})
	}

	function getLevelsByPoints(points) {
		var deferred = $q.defer();
		for (var i = 0; i < levels.length; i++) {
			level = levels[i];
			if (level.points >= points) {
				deferred.resolve([levels[i - 1], levels[i]]);
			}
		}
		deferred.resolve([levels[1], levels[2]]);

		return deferred.promise;
	}

	function getPercentage(currentLevel, nextLevel, points) {
		return ((points - currentLevel.points) / (nextLevel.points - currentLevel.points)) * 100;
	}
	init();
	return {
		getLevelsByPoints: getLevelsByPoints,
		getPercentage: getPercentage,
		loaded: loaded
	};

});