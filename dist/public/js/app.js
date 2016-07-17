angular.module('App', ['templates', 'ui.router', 'ngAnimate', 'ngRoute', 'angularMoment', 'angular-storage', 'angular-jwt'])
    .constant('Config', {
        apiBase: window.location.protocol + "//" + window.location.host + "/api/"
    })
    .config(function($stateProvider, $urlRouterProvider, $sceProvider, $locationProvider, jwtInterceptorProvider, $httpProvider) {

        jwtInterceptorProvider.tokenGetter = function(store) {
            return store.get('jwt');
        }
        $httpProvider.interceptors.push('jwtInterceptor');

        $sceProvider.enabled(false);
        $locationProvider.html5Mode(true);

        $stateProvider
            .state('join', {
                url: '/join',
                templateUrl: 'join/index.html',
                controller: 'JoinCtrl as Join',
                data: {
                    ensureAuthenticate: false
                }
            })
            .state('sync', {
                url: '/sync',
                templateUrl: 'sync/index.html',
                controller: 'SyncCtrl as Sync',
                data: {
                    ensureAuthenticate: true
                }
            })
            .state('battle', {
                url: '/',
                templateUrl: 'battle/index.html',
                controller: 'BattleCtrl as Battle',
                data: {
                    ensureAuthenticate: true
                }
            })

        $urlRouterProvider.otherwise(function($injector) {
            var $state;
            $state = $injector.get('$state');
            return $state.go('404', null, {
                location: false
            });
        });

    })
    .run(function($rootScope, $state, $timeout, Login, Blocker, $location, Points) {
        $rootScope.$state = $state;
        $rootScope.Login = Login;
        $rootScope.Blocker = Blocker;
        $rootScope.Points = Points;

        $rootScope.$on("$stateChangeStart", function(event, next, current) {
            if (next.data.ensureAuthenticate) {
                if (!$rootScope.Login.isLogged()) {
                    event.preventDefault();
                    $state.go('join');
                }
            }

            if (next.url == '/join' && $rootScope.Login.isLogged()) {
                $location.path('/');
            }
        });

        $rootScope.safeApply = function safeApply(operation) {
            var phase = this.$root.$$phase;
            if (phase !== '$apply' && phase !== '$digest') {
                this.$apply(operation);
                return;
            }

            if (operation && typeof operation === 'function') {
                operation();
            }
        };



    });
angular.module('App')
	.controller('BattleCtrl', function($rootScope, $state, Api, Login, $scope) {

		$scope.battle = null;
		$scope.loading = true;

		$scope.getNewBattle = function() {
			$scope.loading = true;
			$scope.battle = null;
			Api.call({
				url: 'vote/new',
				callback: function(res) {
					$scope.battle = res.data.vote;
					$scope.loading = false;
					// console.log($scope.battle);
				}
			});
		}

		$scope.vote = function(winner) {
			Api.call({
				url: 'vote/' + $scope.battle.hash_id,
				method: 'PUT',
				data: {
					winner: winner
				},
				callback: function(res) {
					if (res.data.points) {
						$rootScope.$emit('pointsChanged', res.data.points);
					}
					$scope.getNewBattle();
				}
			})
		}

		$scope.getNewBattle();
	});
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
			$scope.user = $rootScope.Login.getUser();

		}

		$scope.updatePoints = function(points) {
			if (typeof points != 'number') {
				points = points.total_points;
			}
			$scope.progress.points = points;
			$rootScope.Points.getLevelsByPoints($scope.progress.points)
				.then(function(levels) {
					console.log(levels);
					$scope.progress.level.current = levels[0];
					$scope.progress.level.next = levels[1];
					$scope.progress.level.progress = $rootScope.Points.getPercentage($scope.progress.level.current, $scope.progress.level.next, $scope.progress.points);
				})
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
angular.module('App')
	.controller('JoinCtrl', function(Login) {
		var scope = this;

		scope.logWithYoutube = Login.logWithYoutube;
	});
angular.module('App')
	.controller('SyncCtrl', function($rootScope, $state, Api, Sync, $location, Login) {

		var scope = this;


		scope.sync = Sync.sync;

		if (Login.isLogged()) {
			scope.sync();
		}

		$rootScope.$on('syncDone', function() {
			$location.path('/');
		})
	});
angular.module('App')
    .filter("megaNumber", () => {
        return (number, fractionSize) => {

            if (number === null) return null;
            if (number === 0) return "0";

            if (!fractionSize || fractionSize < 0)
                fractionSize = 1;

            var abs = Math.abs(number);
            var rounder = Math.pow(10, fractionSize);
            var isNegative = number < 0;
            var key = '';
            var powers = [{
                key: "Q",
                value: Math.pow(10, 15)
            }, {
                key: "T",
                value: Math.pow(10, 12)
            }, {
                key: "B",
                value: Math.pow(10, 9)
            }, {
                key: "M",
                value: Math.pow(10, 6)
            }, {
                key: "K",
                value: 1000
            }];

            for (var i = 0; i < powers.length; i++) {

                var reduced = abs / powers[i].value;

                reduced = Math.round(reduced * rounder) / rounder;

                if (reduced >= 1) {
                    abs = reduced;
                    key = powers[i].key;
                    break;
                }
            }

            return (isNegative ? '-' : '') + abs + key;
        };
    });
angular.module('App').service('Api', function($http, $q, Config, $timeout, /*Notifications,*/ Blocker, $state) {


    /**
     * Perform an API call.
     * @param options {url, params, data, callback, method, errorHandler (should return true), timeout in MS, blockUI}
     */
    this.call = function(options) {

        var options = angular.extend({
            url: null,
            method: 'GET',
            params: null,
            data: null,
            callback: null,
            timeout: 30000,
            errorHandler: null,
            blockUI: true,
        }, options);

        var canceler = $q.defer();
        var cancelTimeout = options.timeout ? $timeout(canceler.resolve, options.timeout) : null;

        if (options.blockUI) {
            Blocker.block();
        }

        var url = options.url.indexOf('http') == 0 ? options.url : Config.apiBase + options.url;

        $http({
            url: url,
            method: options.method,
            params: options.params,
            data: options.data,
            timeout: canceler.promise
        }).success(function(data) {
            $timeout.cancel(cancelTimeout);
            if (typeof options.callback == 'function') {
                options.callback(data);
            }
            if (options.blockUI) {
                Blocker.unblock();
            }
        }).error(function(message, status) {
            $timeout.cancel(cancelTimeout);
            if (typeof options.errorHandler == 'function' && options.errorHandler(message, status)) {
                //Error was handled by the custom error handler
                return;
            }

            if (!status) {
                console.log("Error without status; request aborted?");
                return;
            }
            if (status == 401) {
                $state.go('join');
            }

            // Notifications.add("Error " + status, message);

            if (options.blockUI) {
                Blocker.unblock();
            }

        });

        return {
            cancel: function() {
                canceler.resolve();
            }
        };

    };

});
angular.module('App').service('Blocker', function($rootScope) {

    this.blockUI = false;
    this.blockCount = 0;
    this.namedBlocks = [];
    this.zIndex = 10000000;
    var that = this;

    function calcZIndex() {

        if (!that.namedBlocks.length) {
            that.zIndex = 10000000;
        } else {
            that.zIndex = 0;
            angular.forEach(that.namedBlocks, function(block, index) {
                that.zIndex = block.zIndex > that.zIndex ? block.zIndex : that.zIndex;
            });
        }
    }

    this.block = function(name, zIndex) {

        if (name) {
            //todo: maybe just an object with name for keys (but then length would be an issue)
            that.namedBlocks.push({
                name: name,
                zIndex: zIndex
            });
        } else {
            that.blockCount++;
        }

        calcZIndex();
        that.blockUI = that.blockCount > 0 || that.namedBlocks.length > 0;
        $rootScope.$broadcast('blocker.updateBlocker');

    };

    this.unblock = function(name) {

        if (name) {
            var done = false;
            angular.forEach(that.namedBlocks, function(block, index) {
                if (block.name == name && !done) {
                    that.namedBlocks.splice(index, 1);
                    done = true;
                }
            });
        } else {
            that.blockCount--;
        }

        that.blockUI = that.blockCount > 0 || that.namedBlocks.length > 0;
        $rootScope.$broadcast('blocker.updateBlocker');

    };


});
angular.module('App').service('Login', function($rootScope, $interval, Api, $location, store) {

    var user = null;
    var status = 'notconnected';
    var credits = null;
    var JWT = null;
    var loaded = false;

    function updateStatus(afterLogin) {
        var afterLogin = afterLogin;
        console.log('Updating status!');
        Api.call({
            url: 'user/status',
            callback: function(data) {
                // console.log(data);
                user = data.data.user || null;
                status = data.data.status;
                loaded = true;

                JWT = data.data.jwt_token;
                store.set('jwt', data.data.jwt_token);

                $rootScope.$emit('statusUpdated');
                if (afterLogin) {
                    if (status == 'connected') {
                        if (user.last_synced === null) {
                            $rootScope.$emit('successfullySignedUp')
                        } else {
                            $rootScope.$emit('successfullyLogged');
                        }
                    } else {
                        $rootScope.$emit('failedLogin');
                    }
                }
            }
        });
    }

    updateStatus();

    $rootScope.$on('successfullyLogged', function() {
        console.log('successfullyLogged');
        $location.path('/');
    });

    $rootScope.$on('successfullySignedUp', function() {
        console.log('successfullySignedUp');
        $location.path('/sync');
    });

    function logWithYoutube() {
        // console.log("Login with youtube");
        var popup = window.open("auth/youtube", 'socialLogin', 'width=450,height=600,location=0,menubar=0,resizable=1,scrollbars=0,status=0,titlebar=0,toolbar=0');

        try {
            popup.focus();

            var popupInterval = $interval(function() {
                if (!popup || popup.closed) {
                    updateStatus(true);
                    $interval.cancel(popupInterval);
                }
            }, 200);
        } catch (e) {
            alert("It looks like you are using a popup blocker. Please allow this one in order to login. Thanks!");
        }

    }

    return {
        isLogged: function() {
            var jwt = store.get('jwt');
            // console.log(jwt);
            // console.log(!!jwt && jwt != 'undefined' && typeof jwt != 'undefined')
            return (!!jwt && jwt != 'undefined' && typeof jwt != 'undefined');
        },
        logOut: function() {
            Api.call({
                url: 'login/logout',
                method: 'post',
                callback: updateStatus
            })
        },
        updateStatus: updateStatus,
        logWithYoutube: logWithYoutube,
        getUser: function() {
            return user;
        },
        isLoaded: function() {
            return loaded;
        }
    };

});
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
angular.module('App').service('Sync', function($rootScope, $interval, Api) {

    var loading = false;

    function sync() {
        console.log('Syncing channels...');
        loading = true;
        Api.call({
            url: 'user/sync',
            callback: function(data) {
                console.log("Syncing done...");
                $rootScope.$emit('syncDone');
                loading = false;
            }
        });
    }

    return {
        sync: sync
    };

});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbnRyb2xsZXIvYmF0dGxlLmpzIiwiY29udHJvbGxlci9ib3R0b21Vc2VyLmpzIiwiY29udHJvbGxlci9qb2luLmpzIiwiY29udHJvbGxlci9zeW5jLmpzIiwiZmlsdGVyL21lZ2FOdW1iZXIuanMiLCJzZXJ2aWNlL2FwaS5qcyIsInNlcnZpY2UvYmxvY2tlci5qcyIsInNlcnZpY2UvbG9naW4uanMiLCJzZXJ2aWNlL3BvaW50cy5qcyIsInNlcnZpY2Uvc3luYy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJhbmd1bGFyLm1vZHVsZSgnQXBwJywgWyd0ZW1wbGF0ZXMnLCAndWkucm91dGVyJywgJ25nQW5pbWF0ZScsICduZ1JvdXRlJywgJ2FuZ3VsYXJNb21lbnQnLCAnYW5ndWxhci1zdG9yYWdlJywgJ2FuZ3VsYXItand0J10pXHJcbiAgICAuY29uc3RhbnQoJ0NvbmZpZycsIHtcclxuICAgICAgICBhcGlCYXNlOiB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyB3aW5kb3cubG9jYXRpb24uaG9zdCArIFwiL2FwaS9cIlxyXG4gICAgfSlcclxuICAgIC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIsICR1cmxSb3V0ZXJQcm92aWRlciwgJHNjZVByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlciwgand0SW50ZXJjZXB0b3JQcm92aWRlciwgJGh0dHBQcm92aWRlcikge1xyXG5cclxuICAgICAgICBqd3RJbnRlcmNlcHRvclByb3ZpZGVyLnRva2VuR2V0dGVyID0gZnVuY3Rpb24oc3RvcmUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHN0b3JlLmdldCgnand0Jyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goJ2p3dEludGVyY2VwdG9yJyk7XHJcblxyXG4gICAgICAgICRzY2VQcm92aWRlci5lbmFibGVkKGZhbHNlKTtcclxuICAgICAgICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XHJcblxyXG4gICAgICAgICRzdGF0ZVByb3ZpZGVyXHJcbiAgICAgICAgICAgIC5zdGF0ZSgnam9pbicsIHtcclxuICAgICAgICAgICAgICAgIHVybDogJy9qb2luJyxcclxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnam9pbi9pbmRleC5odG1sJyxcclxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdKb2luQ3RybCBhcyBKb2luJyxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICBlbnN1cmVBdXRoZW50aWNhdGU6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5zdGF0ZSgnc3luYycsIHtcclxuICAgICAgICAgICAgICAgIHVybDogJy9zeW5jJyxcclxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnc3luYy9pbmRleC5odG1sJyxcclxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdTeW5jQ3RybCBhcyBTeW5jJyxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICBlbnN1cmVBdXRoZW50aWNhdGU6IHRydWVcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLnN0YXRlKCdiYXR0bGUnLCB7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICcvJyxcclxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnYmF0dGxlL2luZGV4Lmh0bWwnLFxyXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0JhdHRsZUN0cmwgYXMgQmF0dGxlJyxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICBlbnN1cmVBdXRoZW50aWNhdGU6IHRydWVcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZShmdW5jdGlvbigkaW5qZWN0b3IpIHtcclxuICAgICAgICAgICAgdmFyICRzdGF0ZTtcclxuICAgICAgICAgICAgJHN0YXRlID0gJGluamVjdG9yLmdldCgnJHN0YXRlJyk7XHJcbiAgICAgICAgICAgIHJldHVybiAkc3RhdGUuZ28oJzQwNCcsIG51bGwsIHtcclxuICAgICAgICAgICAgICAgIGxvY2F0aW9uOiBmYWxzZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9KVxyXG4gICAgLnJ1bihmdW5jdGlvbigkcm9vdFNjb3BlLCAkc3RhdGUsICR0aW1lb3V0LCBMb2dpbiwgQmxvY2tlciwgJGxvY2F0aW9uLCBQb2ludHMpIHtcclxuICAgICAgICAkcm9vdFNjb3BlLiRzdGF0ZSA9ICRzdGF0ZTtcclxuICAgICAgICAkcm9vdFNjb3BlLkxvZ2luID0gTG9naW47XHJcbiAgICAgICAgJHJvb3RTY29wZS5CbG9ja2VyID0gQmxvY2tlcjtcclxuICAgICAgICAkcm9vdFNjb3BlLlBvaW50cyA9IFBvaW50cztcclxuXHJcbiAgICAgICAgJHJvb3RTY29wZS4kb24oXCIkc3RhdGVDaGFuZ2VTdGFydFwiLCBmdW5jdGlvbihldmVudCwgbmV4dCwgY3VycmVudCkge1xyXG4gICAgICAgICAgICBpZiAobmV4dC5kYXRhLmVuc3VyZUF1dGhlbnRpY2F0ZSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCEkcm9vdFNjb3BlLkxvZ2luLmlzTG9nZ2VkKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnam9pbicpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAobmV4dC51cmwgPT0gJy9qb2luJyAmJiAkcm9vdFNjb3BlLkxvZ2luLmlzTG9nZ2VkKCkpIHtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5wYXRoKCcvJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHJvb3RTY29wZS5zYWZlQXBwbHkgPSBmdW5jdGlvbiBzYWZlQXBwbHkob3BlcmF0aW9uKSB7XHJcbiAgICAgICAgICAgIHZhciBwaGFzZSA9IHRoaXMuJHJvb3QuJCRwaGFzZTtcclxuICAgICAgICAgICAgaWYgKHBoYXNlICE9PSAnJGFwcGx5JyAmJiBwaGFzZSAhPT0gJyRkaWdlc3QnKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRhcHBseShvcGVyYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAob3BlcmF0aW9uICYmIHR5cGVvZiBvcGVyYXRpb24gPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgIG9wZXJhdGlvbigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcblxyXG5cclxuICAgIH0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKVxyXG5cdC5jb250cm9sbGVyKCdCYXR0bGVDdHJsJywgZnVuY3Rpb24oJHJvb3RTY29wZSwgJHN0YXRlLCBBcGksIExvZ2luLCAkc2NvcGUpIHtcclxuXHJcblx0XHQkc2NvcGUuYmF0dGxlID0gbnVsbDtcclxuXHRcdCRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcclxuXHJcblx0XHQkc2NvcGUuZ2V0TmV3QmF0dGxlID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdCRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcclxuXHRcdFx0JHNjb3BlLmJhdHRsZSA9IG51bGw7XHJcblx0XHRcdEFwaS5jYWxsKHtcclxuXHRcdFx0XHR1cmw6ICd2b3RlL25ldycsXHJcblx0XHRcdFx0Y2FsbGJhY2s6IGZ1bmN0aW9uKHJlcykge1xyXG5cdFx0XHRcdFx0JHNjb3BlLmJhdHRsZSA9IHJlcy5kYXRhLnZvdGU7XHJcblx0XHRcdFx0XHQkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0Ly8gY29uc29sZS5sb2coJHNjb3BlLmJhdHRsZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQkc2NvcGUudm90ZSA9IGZ1bmN0aW9uKHdpbm5lcikge1xyXG5cdFx0XHRBcGkuY2FsbCh7XHJcblx0XHRcdFx0dXJsOiAndm90ZS8nICsgJHNjb3BlLmJhdHRsZS5oYXNoX2lkLFxyXG5cdFx0XHRcdG1ldGhvZDogJ1BVVCcsXHJcblx0XHRcdFx0ZGF0YToge1xyXG5cdFx0XHRcdFx0d2lubmVyOiB3aW5uZXJcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGNhbGxiYWNrOiBmdW5jdGlvbihyZXMpIHtcclxuXHRcdFx0XHRcdGlmIChyZXMuZGF0YS5wb2ludHMpIHtcclxuXHRcdFx0XHRcdFx0JHJvb3RTY29wZS4kZW1pdCgncG9pbnRzQ2hhbmdlZCcsIHJlcy5kYXRhLnBvaW50cyk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHQkc2NvcGUuZ2V0TmV3QmF0dGxlKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KVxyXG5cdFx0fVxyXG5cclxuXHRcdCRzY29wZS5nZXROZXdCYXR0bGUoKTtcclxuXHR9KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJylcclxuXHQuY29udHJvbGxlcignYm90dG9tVXNlckN0cmwnLCBmdW5jdGlvbihMb2dpbiwgJHJvb3RTY29wZSwgJHNjb3BlLCBQb2ludHMpIHtcclxuXHRcdCRzY29wZS51c2VyID0ge307XHJcblxyXG5cdFx0JHNjb3BlLnByb2dyZXNzID0ge1xyXG5cdFx0XHRwb2ludHM6IDAsXHJcblx0XHRcdGxldmVsOiB7XHJcblx0XHRcdFx0Y3VycmVudDogbnVsbCxcclxuXHRcdFx0XHRuZXh0OiBudWxsLFxyXG5cdFx0XHRcdHByb2dyZXNzOiAwXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQkc2NvcGUuaW5pdFVzZXIgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0JHNjb3BlLnVzZXIgPSAkcm9vdFNjb3BlLkxvZ2luLmdldFVzZXIoKTtcclxuXHJcblx0XHR9XHJcblxyXG5cdFx0JHNjb3BlLnVwZGF0ZVBvaW50cyA9IGZ1bmN0aW9uKHBvaW50cykge1xyXG5cdFx0XHRpZiAodHlwZW9mIHBvaW50cyAhPSAnbnVtYmVyJykge1xyXG5cdFx0XHRcdHBvaW50cyA9IHBvaW50cy50b3RhbF9wb2ludHM7XHJcblx0XHRcdH1cclxuXHRcdFx0JHNjb3BlLnByb2dyZXNzLnBvaW50cyA9IHBvaW50cztcclxuXHRcdFx0JHJvb3RTY29wZS5Qb2ludHMuZ2V0TGV2ZWxzQnlQb2ludHMoJHNjb3BlLnByb2dyZXNzLnBvaW50cylcclxuXHRcdFx0XHQudGhlbihmdW5jdGlvbihsZXZlbHMpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKGxldmVscyk7XHJcblx0XHRcdFx0XHQkc2NvcGUucHJvZ3Jlc3MubGV2ZWwuY3VycmVudCA9IGxldmVsc1swXTtcclxuXHRcdFx0XHRcdCRzY29wZS5wcm9ncmVzcy5sZXZlbC5uZXh0ID0gbGV2ZWxzWzFdO1xyXG5cdFx0XHRcdFx0JHNjb3BlLnByb2dyZXNzLmxldmVsLnByb2dyZXNzID0gJHJvb3RTY29wZS5Qb2ludHMuZ2V0UGVyY2VudGFnZSgkc2NvcGUucHJvZ3Jlc3MubGV2ZWwuY3VycmVudCwgJHNjb3BlLnByb2dyZXNzLmxldmVsLm5leHQsICRzY29wZS5wcm9ncmVzcy5wb2ludHMpO1xyXG5cdFx0XHRcdH0pXHJcblx0XHR9XHJcblxyXG5cdFx0JHJvb3RTY29wZS4kb24oJ3BvaW50c0NoYW5nZWQnLCBmdW5jdGlvbihldmVudCwgcG9pbnRzKSB7XHJcblx0XHRcdCRzY29wZS51cGRhdGVQb2ludHMocG9pbnRzKTtcclxuXHRcdH0pXHJcblxyXG5cdFx0JHJvb3RTY29wZS4kb24oJ3N0YXR1c1VwZGF0ZWQnLCBmdW5jdGlvbigpIHtcclxuXHRcdFx0JHNjb3BlLmluaXRVc2VyKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQkcm9vdFNjb3BlLiRvbignbGV2ZWxzSW5pdERvbmUnLCBmdW5jdGlvbigpIHtcclxuXHRcdFx0JHNjb3BlLnVwZGF0ZVBvaW50cygkc2NvcGUudXNlci5wb2ludHMpXHJcblx0XHR9KTtcclxuXHRcdC8vICRzY29wZS5pbml0VXNlcigpO1xyXG5cdH0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKVxyXG5cdC5jb250cm9sbGVyKCdKb2luQ3RybCcsIGZ1bmN0aW9uKExvZ2luKSB7XHJcblx0XHR2YXIgc2NvcGUgPSB0aGlzO1xyXG5cclxuXHRcdHNjb3BlLmxvZ1dpdGhZb3V0dWJlID0gTG9naW4ubG9nV2l0aFlvdXR1YmU7XHJcblx0fSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpXHJcblx0LmNvbnRyb2xsZXIoJ1N5bmNDdHJsJywgZnVuY3Rpb24oJHJvb3RTY29wZSwgJHN0YXRlLCBBcGksIFN5bmMsICRsb2NhdGlvbiwgTG9naW4pIHtcclxuXHJcblx0XHR2YXIgc2NvcGUgPSB0aGlzO1xyXG5cclxuXHJcblx0XHRzY29wZS5zeW5jID0gU3luYy5zeW5jO1xyXG5cclxuXHRcdGlmIChMb2dpbi5pc0xvZ2dlZCgpKSB7XHJcblx0XHRcdHNjb3BlLnN5bmMoKTtcclxuXHRcdH1cclxuXHJcblx0XHQkcm9vdFNjb3BlLiRvbignc3luY0RvbmUnLCBmdW5jdGlvbigpIHtcclxuXHRcdFx0JGxvY2F0aW9uLnBhdGgoJy8nKTtcclxuXHRcdH0pXHJcblx0fSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpXHJcbiAgICAuZmlsdGVyKFwibWVnYU51bWJlclwiLCAoKSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIChudW1iZXIsIGZyYWN0aW9uU2l6ZSkgPT4ge1xyXG5cclxuICAgICAgICAgICAgaWYgKG51bWJlciA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIGlmIChudW1iZXIgPT09IDApIHJldHVybiBcIjBcIjtcclxuXHJcbiAgICAgICAgICAgIGlmICghZnJhY3Rpb25TaXplIHx8IGZyYWN0aW9uU2l6ZSA8IDApXHJcbiAgICAgICAgICAgICAgICBmcmFjdGlvblNpemUgPSAxO1xyXG5cclxuICAgICAgICAgICAgdmFyIGFicyA9IE1hdGguYWJzKG51bWJlcik7XHJcbiAgICAgICAgICAgIHZhciByb3VuZGVyID0gTWF0aC5wb3coMTAsIGZyYWN0aW9uU2l6ZSk7XHJcbiAgICAgICAgICAgIHZhciBpc05lZ2F0aXZlID0gbnVtYmVyIDwgMDtcclxuICAgICAgICAgICAgdmFyIGtleSA9ICcnO1xyXG4gICAgICAgICAgICB2YXIgcG93ZXJzID0gW3tcclxuICAgICAgICAgICAgICAgIGtleTogXCJRXCIsXHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogTWF0aC5wb3coMTAsIDE1KVxyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICBrZXk6IFwiVFwiLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6IE1hdGgucG93KDEwLCAxMilcclxuICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAga2V5OiBcIkJcIixcclxuICAgICAgICAgICAgICAgIHZhbHVlOiBNYXRoLnBvdygxMCwgOSlcclxuICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAga2V5OiBcIk1cIixcclxuICAgICAgICAgICAgICAgIHZhbHVlOiBNYXRoLnBvdygxMCwgNilcclxuICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAga2V5OiBcIktcIixcclxuICAgICAgICAgICAgICAgIHZhbHVlOiAxMDAwXHJcbiAgICAgICAgICAgIH1dO1xyXG5cclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwb3dlcnMubGVuZ3RoOyBpKyspIHtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgcmVkdWNlZCA9IGFicyAvIHBvd2Vyc1tpXS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICByZWR1Y2VkID0gTWF0aC5yb3VuZChyZWR1Y2VkICogcm91bmRlcikgLyByb3VuZGVyO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChyZWR1Y2VkID49IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICBhYnMgPSByZWR1Y2VkO1xyXG4gICAgICAgICAgICAgICAgICAgIGtleSA9IHBvd2Vyc1tpXS5rZXk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiAoaXNOZWdhdGl2ZSA/ICctJyA6ICcnKSArIGFicyArIGtleTtcclxuICAgICAgICB9O1xyXG4gICAgfSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpLnNlcnZpY2UoJ0FwaScsIGZ1bmN0aW9uKCRodHRwLCAkcSwgQ29uZmlnLCAkdGltZW91dCwgLypOb3RpZmljYXRpb25zLCovIEJsb2NrZXIsICRzdGF0ZSkge1xyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIFBlcmZvcm0gYW4gQVBJIGNhbGwuXHJcbiAgICAgKiBAcGFyYW0gb3B0aW9ucyB7dXJsLCBwYXJhbXMsIGRhdGEsIGNhbGxiYWNrLCBtZXRob2QsIGVycm9ySGFuZGxlciAoc2hvdWxkIHJldHVybiB0cnVlKSwgdGltZW91dCBpbiBNUywgYmxvY2tVSX1cclxuICAgICAqL1xyXG4gICAgdGhpcy5jYWxsID0gZnVuY3Rpb24ob3B0aW9ucykge1xyXG5cclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGFuZ3VsYXIuZXh0ZW5kKHtcclxuICAgICAgICAgICAgdXJsOiBudWxsLFxyXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgICAgICBwYXJhbXM6IG51bGwsXHJcbiAgICAgICAgICAgIGRhdGE6IG51bGwsXHJcbiAgICAgICAgICAgIGNhbGxiYWNrOiBudWxsLFxyXG4gICAgICAgICAgICB0aW1lb3V0OiAzMDAwMCxcclxuICAgICAgICAgICAgZXJyb3JIYW5kbGVyOiBudWxsLFxyXG4gICAgICAgICAgICBibG9ja1VJOiB0cnVlLFxyXG4gICAgICAgIH0sIG9wdGlvbnMpO1xyXG5cclxuICAgICAgICB2YXIgY2FuY2VsZXIgPSAkcS5kZWZlcigpO1xyXG4gICAgICAgIHZhciBjYW5jZWxUaW1lb3V0ID0gb3B0aW9ucy50aW1lb3V0ID8gJHRpbWVvdXQoY2FuY2VsZXIucmVzb2x2ZSwgb3B0aW9ucy50aW1lb3V0KSA6IG51bGw7XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmJsb2NrVUkpIHtcclxuICAgICAgICAgICAgQmxvY2tlci5ibG9jaygpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIHVybCA9IG9wdGlvbnMudXJsLmluZGV4T2YoJ2h0dHAnKSA9PSAwID8gb3B0aW9ucy51cmwgOiBDb25maWcuYXBpQmFzZSArIG9wdGlvbnMudXJsO1xyXG5cclxuICAgICAgICAkaHR0cCh7XHJcbiAgICAgICAgICAgIHVybDogdXJsLFxyXG4gICAgICAgICAgICBtZXRob2Q6IG9wdGlvbnMubWV0aG9kLFxyXG4gICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zLFxyXG4gICAgICAgICAgICBkYXRhOiBvcHRpb25zLmRhdGEsXHJcbiAgICAgICAgICAgIHRpbWVvdXQ6IGNhbmNlbGVyLnByb21pc2VcclxuICAgICAgICB9KS5zdWNjZXNzKGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKGNhbmNlbFRpbWVvdXQpO1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuY2FsbGJhY2sgPT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgb3B0aW9ucy5jYWxsYmFjayhkYXRhKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAob3B0aW9ucy5ibG9ja1VJKSB7XHJcbiAgICAgICAgICAgICAgICBCbG9ja2VyLnVuYmxvY2soKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pLmVycm9yKGZ1bmN0aW9uKG1lc3NhZ2UsIHN0YXR1cykge1xyXG4gICAgICAgICAgICAkdGltZW91dC5jYW5jZWwoY2FuY2VsVGltZW91dCk7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5lcnJvckhhbmRsZXIgPT0gJ2Z1bmN0aW9uJyAmJiBvcHRpb25zLmVycm9ySGFuZGxlcihtZXNzYWdlLCBzdGF0dXMpKSB7XHJcbiAgICAgICAgICAgICAgICAvL0Vycm9yIHdhcyBoYW5kbGVkIGJ5IHRoZSBjdXN0b20gZXJyb3IgaGFuZGxlclxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIXN0YXR1cykge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFcnJvciB3aXRob3V0IHN0YXR1czsgcmVxdWVzdCBhYm9ydGVkP1wiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoc3RhdHVzID09IDQwMSkge1xyXG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdqb2luJyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIE5vdGlmaWNhdGlvbnMuYWRkKFwiRXJyb3IgXCIgKyBzdGF0dXMsIG1lc3NhZ2UpO1xyXG5cclxuICAgICAgICAgICAgaWYgKG9wdGlvbnMuYmxvY2tVSSkge1xyXG4gICAgICAgICAgICAgICAgQmxvY2tlci51bmJsb2NrKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGNhbmNlbDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBjYW5jZWxlci5yZXNvbHZlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgIH07XHJcblxyXG59KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJykuc2VydmljZSgnQmxvY2tlcicsIGZ1bmN0aW9uKCRyb290U2NvcGUpIHtcclxuXHJcbiAgICB0aGlzLmJsb2NrVUkgPSBmYWxzZTtcclxuICAgIHRoaXMuYmxvY2tDb3VudCA9IDA7XHJcbiAgICB0aGlzLm5hbWVkQmxvY2tzID0gW107XHJcbiAgICB0aGlzLnpJbmRleCA9IDEwMDAwMDAwO1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG5cclxuICAgIGZ1bmN0aW9uIGNhbGNaSW5kZXgoKSB7XHJcblxyXG4gICAgICAgIGlmICghdGhhdC5uYW1lZEJsb2Nrcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgdGhhdC56SW5kZXggPSAxMDAwMDAwMDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGF0LnpJbmRleCA9IDA7XHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCh0aGF0Lm5hbWVkQmxvY2tzLCBmdW5jdGlvbihibG9jaywgaW5kZXgpIHtcclxuICAgICAgICAgICAgICAgIHRoYXQuekluZGV4ID0gYmxvY2suekluZGV4ID4gdGhhdC56SW5kZXggPyBibG9jay56SW5kZXggOiB0aGF0LnpJbmRleDtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuYmxvY2sgPSBmdW5jdGlvbihuYW1lLCB6SW5kZXgpIHtcclxuXHJcbiAgICAgICAgaWYgKG5hbWUpIHtcclxuICAgICAgICAgICAgLy90b2RvOiBtYXliZSBqdXN0IGFuIG9iamVjdCB3aXRoIG5hbWUgZm9yIGtleXMgKGJ1dCB0aGVuIGxlbmd0aCB3b3VsZCBiZSBhbiBpc3N1ZSlcclxuICAgICAgICAgICAgdGhhdC5uYW1lZEJsb2Nrcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IG5hbWUsXHJcbiAgICAgICAgICAgICAgICB6SW5kZXg6IHpJbmRleFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGF0LmJsb2NrQ291bnQrKztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNhbGNaSW5kZXgoKTtcclxuICAgICAgICB0aGF0LmJsb2NrVUkgPSB0aGF0LmJsb2NrQ291bnQgPiAwIHx8IHRoYXQubmFtZWRCbG9ja3MubGVuZ3RoID4gMDtcclxuICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2Jsb2NrZXIudXBkYXRlQmxvY2tlcicpO1xyXG5cclxuICAgIH07XHJcblxyXG4gICAgdGhpcy51bmJsb2NrID0gZnVuY3Rpb24obmFtZSkge1xyXG5cclxuICAgICAgICBpZiAobmFtZSkge1xyXG4gICAgICAgICAgICB2YXIgZG9uZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2godGhhdC5uYW1lZEJsb2NrcywgZnVuY3Rpb24oYmxvY2ssIGluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoYmxvY2submFtZSA9PSBuYW1lICYmICFkb25lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5uYW1lZEJsb2Nrcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGRvbmUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGF0LmJsb2NrQ291bnQtLTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoYXQuYmxvY2tVSSA9IHRoYXQuYmxvY2tDb3VudCA+IDAgfHwgdGhhdC5uYW1lZEJsb2Nrcy5sZW5ndGggPiAwO1xyXG4gICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnYmxvY2tlci51cGRhdGVCbG9ja2VyJyk7XHJcblxyXG4gICAgfTtcclxuXHJcblxyXG59KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJykuc2VydmljZSgnTG9naW4nLCBmdW5jdGlvbigkcm9vdFNjb3BlLCAkaW50ZXJ2YWwsIEFwaSwgJGxvY2F0aW9uLCBzdG9yZSkge1xyXG5cclxuICAgIHZhciB1c2VyID0gbnVsbDtcclxuICAgIHZhciBzdGF0dXMgPSAnbm90Y29ubmVjdGVkJztcclxuICAgIHZhciBjcmVkaXRzID0gbnVsbDtcclxuICAgIHZhciBKV1QgPSBudWxsO1xyXG4gICAgdmFyIGxvYWRlZCA9IGZhbHNlO1xyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZVN0YXR1cyhhZnRlckxvZ2luKSB7XHJcbiAgICAgICAgdmFyIGFmdGVyTG9naW4gPSBhZnRlckxvZ2luO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdVcGRhdGluZyBzdGF0dXMhJyk7XHJcbiAgICAgICAgQXBpLmNhbGwoe1xyXG4gICAgICAgICAgICB1cmw6ICd1c2VyL3N0YXR1cycsXHJcbiAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgICAgIHVzZXIgPSBkYXRhLmRhdGEudXNlciB8fCBudWxsO1xyXG4gICAgICAgICAgICAgICAgc3RhdHVzID0gZGF0YS5kYXRhLnN0YXR1cztcclxuICAgICAgICAgICAgICAgIGxvYWRlZCA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICAgICAgSldUID0gZGF0YS5kYXRhLmp3dF90b2tlbjtcclxuICAgICAgICAgICAgICAgIHN0b3JlLnNldCgnand0JywgZGF0YS5kYXRhLmp3dF90b2tlbik7XHJcblxyXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnc3RhdHVzVXBkYXRlZCcpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGFmdGVyTG9naW4pIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdHVzID09ICdjb25uZWN0ZWQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh1c2VyLmxhc3Rfc3luY2VkID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCdzdWNjZXNzZnVsbHlTaWduZWRVcCcpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCdzdWNjZXNzZnVsbHlMb2dnZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJ2ZhaWxlZExvZ2luJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlU3RhdHVzKCk7XHJcblxyXG4gICAgJHJvb3RTY29wZS4kb24oJ3N1Y2Nlc3NmdWxseUxvZ2dlZCcsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdzdWNjZXNzZnVsbHlMb2dnZWQnKTtcclxuICAgICAgICAkbG9jYXRpb24ucGF0aCgnLycpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgJHJvb3RTY29wZS4kb24oJ3N1Y2Nlc3NmdWxseVNpZ25lZFVwJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ3N1Y2Nlc3NmdWxseVNpZ25lZFVwJyk7XHJcbiAgICAgICAgJGxvY2F0aW9uLnBhdGgoJy9zeW5jJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBmdW5jdGlvbiBsb2dXaXRoWW91dHViZSgpIHtcclxuICAgICAgICAvLyBjb25zb2xlLmxvZyhcIkxvZ2luIHdpdGggeW91dHViZVwiKTtcclxuICAgICAgICB2YXIgcG9wdXAgPSB3aW5kb3cub3BlbihcImF1dGgveW91dHViZVwiLCAnc29jaWFsTG9naW4nLCAnd2lkdGg9NDUwLGhlaWdodD02MDAsbG9jYXRpb249MCxtZW51YmFyPTAscmVzaXphYmxlPTEsc2Nyb2xsYmFycz0wLHN0YXR1cz0wLHRpdGxlYmFyPTAsdG9vbGJhcj0wJyk7XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHBvcHVwLmZvY3VzKCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgcG9wdXBJbnRlcnZhbCA9ICRpbnRlcnZhbChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIGlmICghcG9wdXAgfHwgcG9wdXAuY2xvc2VkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlU3RhdHVzKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwocG9wdXBJbnRlcnZhbCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sIDIwMCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICBhbGVydChcIkl0IGxvb2tzIGxpa2UgeW91IGFyZSB1c2luZyBhIHBvcHVwIGJsb2NrZXIuIFBsZWFzZSBhbGxvdyB0aGlzIG9uZSBpbiBvcmRlciB0byBsb2dpbi4gVGhhbmtzIVwiKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgaXNMb2dnZWQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgand0ID0gc3RvcmUuZ2V0KCdqd3QnKTtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coand0KTtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coISFqd3QgJiYgand0ICE9ICd1bmRlZmluZWQnICYmIHR5cGVvZiBqd3QgIT0gJ3VuZGVmaW5lZCcpXHJcbiAgICAgICAgICAgIHJldHVybiAoISFqd3QgJiYgand0ICE9ICd1bmRlZmluZWQnICYmIHR5cGVvZiBqd3QgIT0gJ3VuZGVmaW5lZCcpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgbG9nT3V0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgQXBpLmNhbGwoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnbG9naW4vbG9nb3V0JyxcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ3Bvc3QnLFxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6IHVwZGF0ZVN0YXR1c1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdXBkYXRlU3RhdHVzOiB1cGRhdGVTdGF0dXMsXHJcbiAgICAgICAgbG9nV2l0aFlvdXR1YmU6IGxvZ1dpdGhZb3V0dWJlLFxyXG4gICAgICAgIGdldFVzZXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdXNlcjtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGlzTG9hZGVkOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGxvYWRlZDtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxufSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpLnNlcnZpY2UoJ1BvaW50cycsIGZ1bmN0aW9uKCRyb290U2NvcGUsIEFwaSwgJHEpIHtcclxuXHJcblx0dmFyIGxldmVscyA9IG51bGw7XHJcblx0dmFyIGxvYWRlZCA9IGZhbHNlO1xyXG5cclxuXHRmdW5jdGlvbiBpbml0KCkge1xyXG5cclxuXHRcdEFwaS5jYWxsKHtcclxuXHRcdFx0dXJsOiAnbGV2ZWwnLFxyXG5cdFx0XHRjYWxsYmFjazogZnVuY3Rpb24ocmVzKSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coJ2xldmVsc0luaXREb25lJyk7XHJcblx0XHRcdFx0bGV2ZWxzID0gcmVzLmRhdGEubGV2ZWxzO1xyXG5cclxuXHRcdFx0XHRsb2FkZWQgPSB0cnVlO1xyXG5cdFx0XHRcdCRyb290U2NvcGUuJGVtaXQoJ2xldmVsc0luaXREb25lJyk7XHJcblxyXG5cdFx0XHR9XHJcblx0XHR9KVxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gZ2V0TGV2ZWxzQnlQb2ludHMocG9pbnRzKSB7XHJcblx0XHR2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xyXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsZXZlbHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0bGV2ZWwgPSBsZXZlbHNbaV07XHJcblx0XHRcdGlmIChsZXZlbC5wb2ludHMgPj0gcG9pbnRzKSB7XHJcblx0XHRcdFx0ZGVmZXJyZWQucmVzb2x2ZShbbGV2ZWxzW2kgLSAxXSwgbGV2ZWxzW2ldXSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGRlZmVycmVkLnJlc29sdmUoW2xldmVsc1sxXSwgbGV2ZWxzWzJdXSk7XHJcblxyXG5cdFx0cmV0dXJuIGRlZmVycmVkLnByb21pc2U7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBnZXRQZXJjZW50YWdlKGN1cnJlbnRMZXZlbCwgbmV4dExldmVsLCBwb2ludHMpIHtcclxuXHRcdHJldHVybiAoKHBvaW50cyAtIGN1cnJlbnRMZXZlbC5wb2ludHMpIC8gKG5leHRMZXZlbC5wb2ludHMgLSBjdXJyZW50TGV2ZWwucG9pbnRzKSkgKiAxMDA7XHJcblx0fVxyXG5cdGluaXQoKTtcclxuXHRyZXR1cm4ge1xyXG5cdFx0Z2V0TGV2ZWxzQnlQb2ludHM6IGdldExldmVsc0J5UG9pbnRzLFxyXG5cdFx0Z2V0UGVyY2VudGFnZTogZ2V0UGVyY2VudGFnZSxcclxuXHRcdGxvYWRlZDogbG9hZGVkXHJcblx0fTtcclxuXHJcbn0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKS5zZXJ2aWNlKCdTeW5jJywgZnVuY3Rpb24oJHJvb3RTY29wZSwgJGludGVydmFsLCBBcGkpIHtcclxuXHJcbiAgICB2YXIgbG9hZGluZyA9IGZhbHNlO1xyXG5cclxuICAgIGZ1bmN0aW9uIHN5bmMoKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1N5bmNpbmcgY2hhbm5lbHMuLi4nKTtcclxuICAgICAgICBsb2FkaW5nID0gdHJ1ZTtcclxuICAgICAgICBBcGkuY2FsbCh7XHJcbiAgICAgICAgICAgIHVybDogJ3VzZXIvc3luYycsXHJcbiAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlN5bmNpbmcgZG9uZS4uLlwiKTtcclxuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJ3N5bmNEb25lJyk7XHJcbiAgICAgICAgICAgICAgICBsb2FkaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHN5bmM6IHN5bmNcclxuICAgIH07XHJcblxyXG59KTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
