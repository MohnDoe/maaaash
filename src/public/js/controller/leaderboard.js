angular.module('App')
	.controller('LeaderboardCtrl', function($rootScope, $state, Api, $scope) {

		$scope.leaderboard = null;
		$scope.loading = true;

		$scope.get = function(type) {
			$scope.loading = true;
			Api.call({
				url: 'leaderboard/' + type,
				callback: function(res) {
					$scope.leaderboard = res.data.leaderboard;
					$scope.loading = false;
				}
			});
		}

		$scope.get('global');
	});