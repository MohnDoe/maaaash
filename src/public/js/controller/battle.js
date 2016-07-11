angular.module('App')
	.controller('BattleCtrl', function($rootScope, $state, Api) {
		var scope = this;
		scope.battle = null;
		Api.call({
			url: 'vote/new',
			callback: function(data) {
				console.log(data);
				scope.battle = data.vote;
			}
		});
	});