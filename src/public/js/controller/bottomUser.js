angular.module('App')
	.controller('bottomUserCtrl', function(Login, $rootScope, $scope) {
		$scope.user = null;

		$scope.initUser = function() {
			$scope.user = Login.getUser();
		}

		$rootScope.$on('pointsChanged', function(event, points) {
			$scope.user.points = points.total_points;
			console.log($scope.user.points);
		})



		$rootScope.$on('statusUpdated', function() {
			$scope.initUser();
		});
	});