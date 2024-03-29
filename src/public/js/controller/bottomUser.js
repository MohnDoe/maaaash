angular.module('App')
	.controller('bottomUserCtrl', function(Login, $rootScope, $scope, Points, $location) {
		$scope.user = {};

		$scope.progress = {
			points: 0,
			level: {
				current: null,
				next: null,
				progress: 0
			}
		}

		$scope.initUser = function() {
			$scope.user = $rootScope.Login.getUser();

		}

		$scope.updatePoints = function(points) {
			if (typeof points != 'number') {
				points = points.total_points;
			}
			$scope.progress.points = points;
			$rootScope.Points.getLevelsByPoints($scope.progress.points)
				.then(function(levels) {
					$scope.progress.level.current = levels[0];
					$scope.progress.level.next = levels[1];
					$scope.progress.level.progress = $rootScope.Points.getPercentage($scope.progress.level.current, $scope.progress.level.next, $scope.progress.points);
				})
		}

		$scope.logOut = function() {
			$rootScope.Login.logOut();
		}

		$rootScope.$on('pointsChanged', function(event, points) {
			$scope.updatePoints(points);
		})

		$rootScope.$on('statusUpdated', function() {
			$scope.initUser();
		});

		$rootScope.$on('levelsInitDone', function() {
			$scope.updatePoints($scope.user.points)
		});
		// $scope.initUser();
	});