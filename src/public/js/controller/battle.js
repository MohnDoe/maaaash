angular.module('App')
	.controller('BattleCtrl', function($rootScope, $state, Api, Login) {
		var scope = this;
		scope.battle = null;

		scope.getNewBattle = function() {
			Api.call({
				url: 'vote/new',
				callback: function(data) {
					console.log(data);
					scope.battle = data.vote;
				}
			});
		}
	});