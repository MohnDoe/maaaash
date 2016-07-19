angular.module('App')
	.controller('LeaderboardCtrl', function($rootScope, $state, Api, $scope) {

		$scope.leaderboard = null;
		$scope.loading = true;

		$scope.get = function(type) {
			Api.call({
				url: 'leaderboard/' + type,
				callback: function(res) {
					console.log(res);
					$scope.loading = false;
					// console.log($scope.battle);
				}
			});
		}

		$scope.get('global');
	});