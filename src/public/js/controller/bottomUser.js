angular.module('App')
	.controller('bottomUserCtrl', function(Login, $rootScope, $scope, Points) {
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
			$scope.user = Login.getUser();
		}

		$scope.updatePoints = function(points) {
			$scope.progress.points = points.total_points;
			var levels = Points.getLevelsByPoints($scope.progress.points);
			$scope.progress.level.current = levels[0];
			$scope.progress.level.next = levels[1];
			$scope.progress.level.progress = Points.getPercentage($scope.progress.level.current, $scope.progress.level.next, $scope.progress.points);
		}

		$rootScope.$on('pointsChanged', function(event, points) {
			$scope.updatePoints(points);
		})

		$rootScope.$on('statusUpdated', function() {
			$scope.initUser();
		});

		$scope.initUser();
	});