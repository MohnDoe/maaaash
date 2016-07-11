angular.module('App')
	.controller('JoinCtrl', function(Login) {
		var scope = this;

		scope.logWithYoutube = Login.logWithYoutube;
	});