angular.module('App')
	.controller('TopCtrl', function($rootScope, $state, Api, $scope) {

		$scope.channels = null;
		$scope.loading = true;

		$scope.get = function() {
			$scope.loading = true;
			Api.call({
				url: 'channel',
				callback: function(res) {
					$scope.channels = res.data.channels;
					$scope.loading = false;
				}
			});
		}

		$scope.get();
	});