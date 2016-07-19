angular.module('App', ['templates', 'ui.router', 'ngAnimate', 'ngRoute', 'angular-storage', 'angular-jwt'])
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
                activetab: 'join',
                data: {
                    ensureAuthenticate: false
                }
            })
            .state('sync', {
                url: '/sync',
                templateUrl: 'sync/index.html',
                controller: 'SyncCtrl as Sync',
                activetab: 'sync',
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
                },
                activetab: 'battle'
            })
            .state('leaderboard', {
                url: '/leaderboard',
                templateUrl: 'leaderboard/index.html',
                controller: 'LeaderboardCtrl as Leaderboard',
                data: {
                    ensureAuthenticate: true
                },
                activetab: 'leaderboard'
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsInNlcnZpY2UvYXBpLmpzIiwic2VydmljZS9ibG9ja2VyLmpzIiwic2VydmljZS9sb2dpbi5qcyIsInNlcnZpY2UvcG9pbnRzLmpzIiwic2VydmljZS9zeW5jLmpzIiwiZmlsdGVyL21lZ2FOdW1iZXIuanMiLCJjb250cm9sbGVyL2JhdHRsZS5qcyIsImNvbnRyb2xsZXIvYm90dG9tVXNlci5qcyIsImNvbnRyb2xsZXIvam9pbi5qcyIsImNvbnRyb2xsZXIvbGVhZGVyYm9hcmQuanMiLCJjb250cm9sbGVyL3N5bmMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJhbmd1bGFyLm1vZHVsZSgnQXBwJywgWyd0ZW1wbGF0ZXMnLCAndWkucm91dGVyJywgJ25nQW5pbWF0ZScsICduZ1JvdXRlJywgJ2FuZ3VsYXItc3RvcmFnZScsICdhbmd1bGFyLWp3dCddKVxyXG4gICAgLmNvbnN0YW50KCdDb25maWcnLCB7XHJcbiAgICAgICAgYXBpQmFzZTogd2luZG93LmxvY2F0aW9uLnByb3RvY29sICsgXCIvL1wiICsgd2luZG93LmxvY2F0aW9uLmhvc3QgKyBcIi9hcGkvXCJcclxuICAgIH0pXHJcbiAgICAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIsICRzY2VQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIsIGp3dEludGVyY2VwdG9yUHJvdmlkZXIsICRodHRwUHJvdmlkZXIpIHtcclxuXHJcbiAgICAgICAgand0SW50ZXJjZXB0b3JQcm92aWRlci50b2tlbkdldHRlciA9IGZ1bmN0aW9uKHN0b3JlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBzdG9yZS5nZXQoJ2p3dCcpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKCdqd3RJbnRlcmNlcHRvcicpO1xyXG5cclxuICAgICAgICAkc2NlUHJvdmlkZXIuZW5hYmxlZChmYWxzZSk7XHJcbiAgICAgICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xyXG5cclxuICAgICAgICAkc3RhdGVQcm92aWRlclxyXG4gICAgICAgICAgICAuc3RhdGUoJ2pvaW4nLCB7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICcvam9pbicsXHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2pvaW4vaW5kZXguaHRtbCcsXHJcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnSm9pbkN0cmwgYXMgSm9pbicsXHJcbiAgICAgICAgICAgICAgICBhY3RpdmV0YWI6ICdqb2luJyxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICBlbnN1cmVBdXRoZW50aWNhdGU6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5zdGF0ZSgnc3luYycsIHtcclxuICAgICAgICAgICAgICAgIHVybDogJy9zeW5jJyxcclxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnc3luYy9pbmRleC5odG1sJyxcclxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdTeW5jQ3RybCBhcyBTeW5jJyxcclxuICAgICAgICAgICAgICAgIGFjdGl2ZXRhYjogJ3N5bmMnLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuc3VyZUF1dGhlbnRpY2F0ZTogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuc3RhdGUoJ2JhdHRsZScsIHtcclxuICAgICAgICAgICAgICAgIHVybDogJy8nLFxyXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdiYXR0bGUvaW5kZXguaHRtbCcsXHJcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQmF0dGxlQ3RybCBhcyBCYXR0bGUnLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuc3VyZUF1dGhlbnRpY2F0ZTogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGFjdGl2ZXRhYjogJ2JhdHRsZSdcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLnN0YXRlKCdsZWFkZXJib2FyZCcsIHtcclxuICAgICAgICAgICAgICAgIHVybDogJy9sZWFkZXJib2FyZCcsXHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2xlYWRlcmJvYXJkL2luZGV4Lmh0bWwnLFxyXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0xlYWRlcmJvYXJkQ3RybCBhcyBMZWFkZXJib2FyZCcsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5zdXJlQXV0aGVudGljYXRlOiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgYWN0aXZldGFiOiAnbGVhZGVyYm9hcmQnXHJcbiAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoZnVuY3Rpb24oJGluamVjdG9yKSB7XHJcbiAgICAgICAgICAgIHZhciAkc3RhdGU7XHJcbiAgICAgICAgICAgICRzdGF0ZSA9ICRpbmplY3Rvci5nZXQoJyRzdGF0ZScpO1xyXG4gICAgICAgICAgICByZXR1cm4gJHN0YXRlLmdvKCc0MDQnLCBudWxsLCB7XHJcbiAgICAgICAgICAgICAgICBsb2NhdGlvbjogZmFsc2VcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfSlcclxuICAgIC5ydW4oZnVuY3Rpb24oJHJvb3RTY29wZSwgJHN0YXRlLCAkdGltZW91dCwgTG9naW4sIEJsb2NrZXIsICRsb2NhdGlvbiwgUG9pbnRzKSB7XHJcbiAgICAgICAgJHJvb3RTY29wZS4kc3RhdGUgPSAkc3RhdGU7XHJcbiAgICAgICAgJHJvb3RTY29wZS5Mb2dpbiA9IExvZ2luO1xyXG4gICAgICAgICRyb290U2NvcGUuQmxvY2tlciA9IEJsb2NrZXI7XHJcbiAgICAgICAgJHJvb3RTY29wZS5Qb2ludHMgPSBQb2ludHM7XHJcbiAgICAgICAgJHJvb3RTY29wZS4kb24oXCIkc3RhdGVDaGFuZ2VTdGFydFwiLCBmdW5jdGlvbihldmVudCwgbmV4dCwgY3VycmVudCkge1xyXG4gICAgICAgICAgICBpZiAobmV4dC5kYXRhLmVuc3VyZUF1dGhlbnRpY2F0ZSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCEkcm9vdFNjb3BlLkxvZ2luLmlzTG9nZ2VkKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnam9pbicpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAobmV4dC51cmwgPT0gJy9qb2luJyAmJiAkcm9vdFNjb3BlLkxvZ2luLmlzTG9nZ2VkKCkpIHtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5wYXRoKCcvJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHJvb3RTY29wZS5zYWZlQXBwbHkgPSBmdW5jdGlvbiBzYWZlQXBwbHkob3BlcmF0aW9uKSB7XHJcbiAgICAgICAgICAgIHZhciBwaGFzZSA9IHRoaXMuJHJvb3QuJCRwaGFzZTtcclxuICAgICAgICAgICAgaWYgKHBoYXNlICE9PSAnJGFwcGx5JyAmJiBwaGFzZSAhPT0gJyRkaWdlc3QnKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRhcHBseShvcGVyYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAob3BlcmF0aW9uICYmIHR5cGVvZiBvcGVyYXRpb24gPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgIG9wZXJhdGlvbigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcblxyXG5cclxuICAgIH0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKS5zZXJ2aWNlKCdBcGknLCBmdW5jdGlvbigkaHR0cCwgJHEsIENvbmZpZywgJHRpbWVvdXQsIC8qTm90aWZpY2F0aW9ucywqLyBCbG9ja2VyLCAkc3RhdGUpIHtcclxuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBQZXJmb3JtIGFuIEFQSSBjYWxsLlxyXG4gICAgICogQHBhcmFtIG9wdGlvbnMge3VybCwgcGFyYW1zLCBkYXRhLCBjYWxsYmFjaywgbWV0aG9kLCBlcnJvckhhbmRsZXIgKHNob3VsZCByZXR1cm4gdHJ1ZSksIHRpbWVvdXQgaW4gTVMsIGJsb2NrVUl9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuY2FsbCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcclxuXHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBhbmd1bGFyLmV4dGVuZCh7XHJcbiAgICAgICAgICAgIHVybDogbnVsbCxcclxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcclxuICAgICAgICAgICAgcGFyYW1zOiBudWxsLFxyXG4gICAgICAgICAgICBkYXRhOiBudWxsLFxyXG4gICAgICAgICAgICBjYWxsYmFjazogbnVsbCxcclxuICAgICAgICAgICAgdGltZW91dDogMzAwMDAsXHJcbiAgICAgICAgICAgIGVycm9ySGFuZGxlcjogbnVsbCxcclxuICAgICAgICAgICAgYmxvY2tVSTogdHJ1ZSxcclxuICAgICAgICB9LCBvcHRpb25zKTtcclxuXHJcbiAgICAgICAgdmFyIGNhbmNlbGVyID0gJHEuZGVmZXIoKTtcclxuICAgICAgICB2YXIgY2FuY2VsVGltZW91dCA9IG9wdGlvbnMudGltZW91dCA/ICR0aW1lb3V0KGNhbmNlbGVyLnJlc29sdmUsIG9wdGlvbnMudGltZW91dCkgOiBudWxsO1xyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5ibG9ja1VJKSB7XHJcbiAgICAgICAgICAgIEJsb2NrZXIuYmxvY2soKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciB1cmwgPSBvcHRpb25zLnVybC5pbmRleE9mKCdodHRwJykgPT0gMCA/IG9wdGlvbnMudXJsIDogQ29uZmlnLmFwaUJhc2UgKyBvcHRpb25zLnVybDtcclxuXHJcbiAgICAgICAgJGh0dHAoe1xyXG4gICAgICAgICAgICB1cmw6IHVybCxcclxuICAgICAgICAgICAgbWV0aG9kOiBvcHRpb25zLm1ldGhvZCxcclxuICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyxcclxuICAgICAgICAgICAgZGF0YTogb3B0aW9ucy5kYXRhLFxyXG4gICAgICAgICAgICB0aW1lb3V0OiBjYW5jZWxlci5wcm9taXNlXHJcbiAgICAgICAgfSkuc3VjY2VzcyhmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChjYW5jZWxUaW1lb3V0KTtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmNhbGxiYWNrID09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgIG9wdGlvbnMuY2FsbGJhY2soZGF0YSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKG9wdGlvbnMuYmxvY2tVSSkge1xyXG4gICAgICAgICAgICAgICAgQmxvY2tlci51bmJsb2NrKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KS5lcnJvcihmdW5jdGlvbihtZXNzYWdlLCBzdGF0dXMpIHtcclxuICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKGNhbmNlbFRpbWVvdXQpO1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuZXJyb3JIYW5kbGVyID09ICdmdW5jdGlvbicgJiYgb3B0aW9ucy5lcnJvckhhbmRsZXIobWVzc2FnZSwgc3RhdHVzKSkge1xyXG4gICAgICAgICAgICAgICAgLy9FcnJvciB3YXMgaGFuZGxlZCBieSB0aGUgY3VzdG9tIGVycm9yIGhhbmRsZXJcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFzdGF0dXMpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3Igd2l0aG91dCBzdGF0dXM7IHJlcXVlc3QgYWJvcnRlZD9cIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHN0YXR1cyA9PSA0MDEpIHtcclxuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnam9pbicpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBOb3RpZmljYXRpb25zLmFkZChcIkVycm9yIFwiICsgc3RhdHVzLCBtZXNzYWdlKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmJsb2NrVUkpIHtcclxuICAgICAgICAgICAgICAgIEJsb2NrZXIudW5ibG9jaygpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBjYW5jZWw6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgY2FuY2VsZXIucmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICB9O1xyXG5cclxufSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpLnNlcnZpY2UoJ0Jsb2NrZXInLCBmdW5jdGlvbigkcm9vdFNjb3BlKSB7XHJcblxyXG4gICAgdGhpcy5ibG9ja1VJID0gZmFsc2U7XHJcbiAgICB0aGlzLmJsb2NrQ291bnQgPSAwO1xyXG4gICAgdGhpcy5uYW1lZEJsb2NrcyA9IFtdO1xyXG4gICAgdGhpcy56SW5kZXggPSAxMDAwMDAwMDtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuXHJcbiAgICBmdW5jdGlvbiBjYWxjWkluZGV4KCkge1xyXG5cclxuICAgICAgICBpZiAoIXRoYXQubmFtZWRCbG9ja3MubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHRoYXQuekluZGV4ID0gMTAwMDAwMDA7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhhdC56SW5kZXggPSAwO1xyXG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2godGhhdC5uYW1lZEJsb2NrcywgZnVuY3Rpb24oYmxvY2ssIGluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICB0aGF0LnpJbmRleCA9IGJsb2NrLnpJbmRleCA+IHRoYXQuekluZGV4ID8gYmxvY2suekluZGV4IDogdGhhdC56SW5kZXg7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmJsb2NrID0gZnVuY3Rpb24obmFtZSwgekluZGV4KSB7XHJcblxyXG4gICAgICAgIGlmIChuYW1lKSB7XHJcbiAgICAgICAgICAgIC8vdG9kbzogbWF5YmUganVzdCBhbiBvYmplY3Qgd2l0aCBuYW1lIGZvciBrZXlzIChidXQgdGhlbiBsZW5ndGggd291bGQgYmUgYW4gaXNzdWUpXHJcbiAgICAgICAgICAgIHRoYXQubmFtZWRCbG9ja3MucHVzaCh7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBuYW1lLFxyXG4gICAgICAgICAgICAgICAgekluZGV4OiB6SW5kZXhcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhhdC5ibG9ja0NvdW50Kys7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjYWxjWkluZGV4KCk7XHJcbiAgICAgICAgdGhhdC5ibG9ja1VJID0gdGhhdC5ibG9ja0NvdW50ID4gMCB8fCB0aGF0Lm5hbWVkQmxvY2tzLmxlbmd0aCA+IDA7XHJcbiAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdibG9ja2VyLnVwZGF0ZUJsb2NrZXInKTtcclxuXHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMudW5ibG9jayA9IGZ1bmN0aW9uKG5hbWUpIHtcclxuXHJcbiAgICAgICAgaWYgKG5hbWUpIHtcclxuICAgICAgICAgICAgdmFyIGRvbmUgPSBmYWxzZTtcclxuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHRoYXQubmFtZWRCbG9ja3MsIGZ1bmN0aW9uKGJsb2NrLCBpbmRleCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGJsb2NrLm5hbWUgPT0gbmFtZSAmJiAhZG9uZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQubmFtZWRCbG9ja3Muc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBkb25lID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhhdC5ibG9ja0NvdW50LS07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGF0LmJsb2NrVUkgPSB0aGF0LmJsb2NrQ291bnQgPiAwIHx8IHRoYXQubmFtZWRCbG9ja3MubGVuZ3RoID4gMDtcclxuICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2Jsb2NrZXIudXBkYXRlQmxvY2tlcicpO1xyXG5cclxuICAgIH07XHJcblxyXG5cclxufSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpLnNlcnZpY2UoJ0xvZ2luJywgZnVuY3Rpb24oJHJvb3RTY29wZSwgJGludGVydmFsLCBBcGksICRsb2NhdGlvbiwgc3RvcmUpIHtcclxuXHJcbiAgICB2YXIgdXNlciA9IG51bGw7XHJcbiAgICB2YXIgc3RhdHVzID0gJ25vdGNvbm5lY3RlZCc7XHJcbiAgICB2YXIgY3JlZGl0cyA9IG51bGw7XHJcbiAgICB2YXIgSldUID0gbnVsbDtcclxuICAgIHZhciBsb2FkZWQgPSBmYWxzZTtcclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGVTdGF0dXMoYWZ0ZXJMb2dpbikge1xyXG4gICAgICAgIHZhciBhZnRlckxvZ2luID0gYWZ0ZXJMb2dpbjtcclxuICAgICAgICBjb25zb2xlLmxvZygnVXBkYXRpbmcgc3RhdHVzIScpO1xyXG4gICAgICAgIEFwaS5jYWxsKHtcclxuICAgICAgICAgICAgdXJsOiAndXNlci9zdGF0dXMnLFxyXG4gICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgICAgICB1c2VyID0gZGF0YS5kYXRhLnVzZXIgfHwgbnVsbDtcclxuICAgICAgICAgICAgICAgIHN0YXR1cyA9IGRhdGEuZGF0YS5zdGF0dXM7XHJcbiAgICAgICAgICAgICAgICBsb2FkZWQgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgICAgIEpXVCA9IGRhdGEuZGF0YS5qd3RfdG9rZW47XHJcbiAgICAgICAgICAgICAgICBzdG9yZS5zZXQoJ2p3dCcsIGRhdGEuZGF0YS5qd3RfdG9rZW4pO1xyXG5cclxuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJ3N0YXR1c1VwZGF0ZWQnKTtcclxuICAgICAgICAgICAgICAgIGlmIChhZnRlckxvZ2luKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXR1cyA9PSAnY29ubmVjdGVkJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodXNlci5sYXN0X3N5bmNlZCA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnc3VjY2Vzc2Z1bGx5U2lnbmVkVXAnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnc3VjY2Vzc2Z1bGx5TG9nZ2VkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCdmYWlsZWRMb2dpbicpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZVN0YXR1cygpO1xyXG5cclxuICAgICRyb290U2NvcGUuJG9uKCdzdWNjZXNzZnVsbHlMb2dnZWQnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnc3VjY2Vzc2Z1bGx5TG9nZ2VkJyk7XHJcbiAgICAgICAgJGxvY2F0aW9uLnBhdGgoJy8nKTtcclxuICAgIH0pO1xyXG5cclxuICAgICRyb290U2NvcGUuJG9uKCdzdWNjZXNzZnVsbHlTaWduZWRVcCcsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdzdWNjZXNzZnVsbHlTaWduZWRVcCcpO1xyXG4gICAgICAgICRsb2NhdGlvbi5wYXRoKCcvc3luYycpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgZnVuY3Rpb24gbG9nV2l0aFlvdXR1YmUoKSB7XHJcbiAgICAgICAgLy8gY29uc29sZS5sb2coXCJMb2dpbiB3aXRoIHlvdXR1YmVcIik7XHJcbiAgICAgICAgdmFyIHBvcHVwID0gd2luZG93Lm9wZW4oXCJhdXRoL3lvdXR1YmVcIiwgJ3NvY2lhbExvZ2luJywgJ3dpZHRoPTQ1MCxoZWlnaHQ9NjAwLGxvY2F0aW9uPTAsbWVudWJhcj0wLHJlc2l6YWJsZT0xLHNjcm9sbGJhcnM9MCxzdGF0dXM9MCx0aXRsZWJhcj0wLHRvb2xiYXI9MCcpO1xyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBwb3B1cC5mb2N1cygpO1xyXG5cclxuICAgICAgICAgICAgdmFyIHBvcHVwSW50ZXJ2YWwgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXBvcHVwIHx8IHBvcHVwLmNsb3NlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZVN0YXR1cyh0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKHBvcHVwSW50ZXJ2YWwpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCAyMDApO1xyXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgYWxlcnQoXCJJdCBsb29rcyBsaWtlIHlvdSBhcmUgdXNpbmcgYSBwb3B1cCBibG9ja2VyLiBQbGVhc2UgYWxsb3cgdGhpcyBvbmUgaW4gb3JkZXIgdG8gbG9naW4uIFRoYW5rcyFcIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGlzTG9nZ2VkOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIGp3dCA9IHN0b3JlLmdldCgnand0Jyk7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGp3dCk7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCEhand0ICYmIGp3dCAhPSAndW5kZWZpbmVkJyAmJiB0eXBlb2Ygand0ICE9ICd1bmRlZmluZWQnKVxyXG4gICAgICAgICAgICByZXR1cm4gKCEhand0ICYmIGp3dCAhPSAndW5kZWZpbmVkJyAmJiB0eXBlb2Ygand0ICE9ICd1bmRlZmluZWQnKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGxvZ091dDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIEFwaS5jYWxsKHtcclxuICAgICAgICAgICAgICAgIHVybDogJ2xvZ2luL2xvZ291dCcsXHJcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdwb3N0JyxcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrOiB1cGRhdGVTdGF0dXNcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9LFxyXG4gICAgICAgIHVwZGF0ZVN0YXR1czogdXBkYXRlU3RhdHVzLFxyXG4gICAgICAgIGxvZ1dpdGhZb3V0dWJlOiBsb2dXaXRoWW91dHViZSxcclxuICAgICAgICBnZXRVc2VyOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHVzZXI7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpc0xvYWRlZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBsb2FkZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbn0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKS5zZXJ2aWNlKCdQb2ludHMnLCBmdW5jdGlvbigkcm9vdFNjb3BlLCBBcGksICRxKSB7XHJcblxyXG5cdHZhciBsZXZlbHMgPSBudWxsO1xyXG5cdHZhciBsb2FkZWQgPSBmYWxzZTtcclxuXHJcblx0ZnVuY3Rpb24gaW5pdCgpIHtcclxuXHJcblx0XHRBcGkuY2FsbCh7XHJcblx0XHRcdHVybDogJ2xldmVsJyxcclxuXHRcdFx0Y2FsbGJhY2s6IGZ1bmN0aW9uKHJlcykge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdsZXZlbHNJbml0RG9uZScpO1xyXG5cdFx0XHRcdGxldmVscyA9IHJlcy5kYXRhLmxldmVscztcclxuXHJcblx0XHRcdFx0bG9hZGVkID0gdHJ1ZTtcclxuXHRcdFx0XHQkcm9vdFNjb3BlLiRlbWl0KCdsZXZlbHNJbml0RG9uZScpO1xyXG5cclxuXHRcdFx0fVxyXG5cdFx0fSlcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGdldExldmVsc0J5UG9pbnRzKHBvaW50cykge1xyXG5cdFx0dmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbGV2ZWxzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGxldmVsID0gbGV2ZWxzW2ldO1xyXG5cdFx0XHRpZiAobGV2ZWwucG9pbnRzID49IHBvaW50cykge1xyXG5cdFx0XHRcdGRlZmVycmVkLnJlc29sdmUoW2xldmVsc1tpIC0gMV0sIGxldmVsc1tpXV0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRkZWZlcnJlZC5yZXNvbHZlKFtsZXZlbHNbMV0sIGxldmVsc1syXV0pO1xyXG5cclxuXHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gZ2V0UGVyY2VudGFnZShjdXJyZW50TGV2ZWwsIG5leHRMZXZlbCwgcG9pbnRzKSB7XHJcblx0XHRyZXR1cm4gKChwb2ludHMgLSBjdXJyZW50TGV2ZWwucG9pbnRzKSAvIChuZXh0TGV2ZWwucG9pbnRzIC0gY3VycmVudExldmVsLnBvaW50cykpICogMTAwO1xyXG5cdH1cclxuXHRpbml0KCk7XHJcblx0cmV0dXJuIHtcclxuXHRcdGdldExldmVsc0J5UG9pbnRzOiBnZXRMZXZlbHNCeVBvaW50cyxcclxuXHRcdGdldFBlcmNlbnRhZ2U6IGdldFBlcmNlbnRhZ2UsXHJcblx0XHRsb2FkZWQ6IGxvYWRlZFxyXG5cdH07XHJcblxyXG59KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJykuc2VydmljZSgnU3luYycsIGZ1bmN0aW9uKCRyb290U2NvcGUsICRpbnRlcnZhbCwgQXBpKSB7XHJcblxyXG4gICAgdmFyIGxvYWRpbmcgPSBmYWxzZTtcclxuXHJcbiAgICBmdW5jdGlvbiBzeW5jKCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdTeW5jaW5nIGNoYW5uZWxzLi4uJyk7XHJcbiAgICAgICAgbG9hZGluZyA9IHRydWU7XHJcbiAgICAgICAgQXBpLmNhbGwoe1xyXG4gICAgICAgICAgICB1cmw6ICd1c2VyL3N5bmMnLFxyXG4gICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJTeW5jaW5nIGRvbmUuLi5cIik7XHJcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCdzeW5jRG9uZScpO1xyXG4gICAgICAgICAgICAgICAgbG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBzeW5jOiBzeW5jXHJcbiAgICB9O1xyXG5cclxufSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpXHJcbiAgICAuZmlsdGVyKFwibWVnYU51bWJlclwiLCAoKSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIChudW1iZXIsIGZyYWN0aW9uU2l6ZSkgPT4ge1xyXG5cclxuICAgICAgICAgICAgaWYgKG51bWJlciA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIGlmIChudW1iZXIgPT09IDApIHJldHVybiBcIjBcIjtcclxuXHJcbiAgICAgICAgICAgIGlmICghZnJhY3Rpb25TaXplIHx8IGZyYWN0aW9uU2l6ZSA8IDApXHJcbiAgICAgICAgICAgICAgICBmcmFjdGlvblNpemUgPSAxO1xyXG5cclxuICAgICAgICAgICAgdmFyIGFicyA9IE1hdGguYWJzKG51bWJlcik7XHJcbiAgICAgICAgICAgIHZhciByb3VuZGVyID0gTWF0aC5wb3coMTAsIGZyYWN0aW9uU2l6ZSk7XHJcbiAgICAgICAgICAgIHZhciBpc05lZ2F0aXZlID0gbnVtYmVyIDwgMDtcclxuICAgICAgICAgICAgdmFyIGtleSA9ICcnO1xyXG4gICAgICAgICAgICB2YXIgcG93ZXJzID0gW3tcclxuICAgICAgICAgICAgICAgIGtleTogXCJRXCIsXHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogTWF0aC5wb3coMTAsIDE1KVxyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICBrZXk6IFwiVFwiLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6IE1hdGgucG93KDEwLCAxMilcclxuICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAga2V5OiBcIkJcIixcclxuICAgICAgICAgICAgICAgIHZhbHVlOiBNYXRoLnBvdygxMCwgOSlcclxuICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAga2V5OiBcIk1cIixcclxuICAgICAgICAgICAgICAgIHZhbHVlOiBNYXRoLnBvdygxMCwgNilcclxuICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAga2V5OiBcIktcIixcclxuICAgICAgICAgICAgICAgIHZhbHVlOiAxMDAwXHJcbiAgICAgICAgICAgIH1dO1xyXG5cclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwb3dlcnMubGVuZ3RoOyBpKyspIHtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgcmVkdWNlZCA9IGFicyAvIHBvd2Vyc1tpXS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICByZWR1Y2VkID0gTWF0aC5yb3VuZChyZWR1Y2VkICogcm91bmRlcikgLyByb3VuZGVyO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChyZWR1Y2VkID49IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICBhYnMgPSByZWR1Y2VkO1xyXG4gICAgICAgICAgICAgICAgICAgIGtleSA9IHBvd2Vyc1tpXS5rZXk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiAoaXNOZWdhdGl2ZSA/ICctJyA6ICcnKSArIGFicyArIGtleTtcclxuICAgICAgICB9O1xyXG4gICAgfSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpXHJcblx0LmNvbnRyb2xsZXIoJ0JhdHRsZUN0cmwnLCBmdW5jdGlvbigkcm9vdFNjb3BlLCAkc3RhdGUsIEFwaSwgTG9naW4sICRzY29wZSkge1xyXG5cclxuXHRcdCRzY29wZS5iYXR0bGUgPSBudWxsO1xyXG5cdFx0JHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xyXG5cclxuXHRcdCRzY29wZS5nZXROZXdCYXR0bGUgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0JHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xyXG5cdFx0XHQkc2NvcGUuYmF0dGxlID0gbnVsbDtcclxuXHRcdFx0QXBpLmNhbGwoe1xyXG5cdFx0XHRcdHVybDogJ3ZvdGUvbmV3JyxcclxuXHRcdFx0XHRjYWxsYmFjazogZnVuY3Rpb24ocmVzKSB7XHJcblx0XHRcdFx0XHQkc2NvcGUuYmF0dGxlID0gcmVzLmRhdGEudm90ZTtcclxuXHRcdFx0XHRcdCRzY29wZS5sb2FkaW5nID0gZmFsc2U7XHJcblx0XHRcdFx0XHQvLyBjb25zb2xlLmxvZygkc2NvcGUuYmF0dGxlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdCRzY29wZS52b3RlID0gZnVuY3Rpb24od2lubmVyKSB7XHJcblx0XHRcdEFwaS5jYWxsKHtcclxuXHRcdFx0XHR1cmw6ICd2b3RlLycgKyAkc2NvcGUuYmF0dGxlLmhhc2hfaWQsXHJcblx0XHRcdFx0bWV0aG9kOiAnUFVUJyxcclxuXHRcdFx0XHRkYXRhOiB7XHJcblx0XHRcdFx0XHR3aW5uZXI6IHdpbm5lclxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0Y2FsbGJhY2s6IGZ1bmN0aW9uKHJlcykge1xyXG5cdFx0XHRcdFx0aWYgKHJlcy5kYXRhLnBvaW50cykge1xyXG5cdFx0XHRcdFx0XHQkcm9vdFNjb3BlLiRlbWl0KCdwb2ludHNDaGFuZ2VkJywgcmVzLmRhdGEucG9pbnRzKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdCRzY29wZS5nZXROZXdCYXR0bGUoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pXHJcblx0XHR9XHJcblxyXG5cdFx0JHNjb3BlLmdldE5ld0JhdHRsZSgpO1xyXG5cdH0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKVxyXG5cdC5jb250cm9sbGVyKCdib3R0b21Vc2VyQ3RybCcsIGZ1bmN0aW9uKExvZ2luLCAkcm9vdFNjb3BlLCAkc2NvcGUsIFBvaW50cykge1xyXG5cdFx0JHNjb3BlLnVzZXIgPSB7fTtcclxuXHJcblx0XHQkc2NvcGUucHJvZ3Jlc3MgPSB7XHJcblx0XHRcdHBvaW50czogMCxcclxuXHRcdFx0bGV2ZWw6IHtcclxuXHRcdFx0XHRjdXJyZW50OiBudWxsLFxyXG5cdFx0XHRcdG5leHQ6IG51bGwsXHJcblx0XHRcdFx0cHJvZ3Jlc3M6IDBcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdCRzY29wZS5pbml0VXNlciA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHQkc2NvcGUudXNlciA9ICRyb290U2NvcGUuTG9naW4uZ2V0VXNlcigpO1xyXG5cclxuXHRcdH1cclxuXHJcblx0XHQkc2NvcGUudXBkYXRlUG9pbnRzID0gZnVuY3Rpb24ocG9pbnRzKSB7XHJcblx0XHRcdGlmICh0eXBlb2YgcG9pbnRzICE9ICdudW1iZXInKSB7XHJcblx0XHRcdFx0cG9pbnRzID0gcG9pbnRzLnRvdGFsX3BvaW50cztcclxuXHRcdFx0fVxyXG5cdFx0XHQkc2NvcGUucHJvZ3Jlc3MucG9pbnRzID0gcG9pbnRzO1xyXG5cdFx0XHQkcm9vdFNjb3BlLlBvaW50cy5nZXRMZXZlbHNCeVBvaW50cygkc2NvcGUucHJvZ3Jlc3MucG9pbnRzKVxyXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uKGxldmVscykge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2cobGV2ZWxzKTtcclxuXHRcdFx0XHRcdCRzY29wZS5wcm9ncmVzcy5sZXZlbC5jdXJyZW50ID0gbGV2ZWxzWzBdO1xyXG5cdFx0XHRcdFx0JHNjb3BlLnByb2dyZXNzLmxldmVsLm5leHQgPSBsZXZlbHNbMV07XHJcblx0XHRcdFx0XHQkc2NvcGUucHJvZ3Jlc3MubGV2ZWwucHJvZ3Jlc3MgPSAkcm9vdFNjb3BlLlBvaW50cy5nZXRQZXJjZW50YWdlKCRzY29wZS5wcm9ncmVzcy5sZXZlbC5jdXJyZW50LCAkc2NvcGUucHJvZ3Jlc3MubGV2ZWwubmV4dCwgJHNjb3BlLnByb2dyZXNzLnBvaW50cyk7XHJcblx0XHRcdFx0fSlcclxuXHRcdH1cclxuXHJcblx0XHQkcm9vdFNjb3BlLiRvbigncG9pbnRzQ2hhbmdlZCcsIGZ1bmN0aW9uKGV2ZW50LCBwb2ludHMpIHtcclxuXHRcdFx0JHNjb3BlLnVwZGF0ZVBvaW50cyhwb2ludHMpO1xyXG5cdFx0fSlcclxuXHJcblx0XHQkcm9vdFNjb3BlLiRvbignc3RhdHVzVXBkYXRlZCcsIGZ1bmN0aW9uKCkge1xyXG5cdFx0XHQkc2NvcGUuaW5pdFVzZXIoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdCRyb290U2NvcGUuJG9uKCdsZXZlbHNJbml0RG9uZScsIGZ1bmN0aW9uKCkge1xyXG5cdFx0XHQkc2NvcGUudXBkYXRlUG9pbnRzKCRzY29wZS51c2VyLnBvaW50cylcclxuXHRcdH0pO1xyXG5cdFx0Ly8gJHNjb3BlLmluaXRVc2VyKCk7XHJcblx0fSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpXHJcblx0LmNvbnRyb2xsZXIoJ0pvaW5DdHJsJywgZnVuY3Rpb24oTG9naW4pIHtcclxuXHRcdHZhciBzY29wZSA9IHRoaXM7XHJcblxyXG5cdFx0c2NvcGUubG9nV2l0aFlvdXR1YmUgPSBMb2dpbi5sb2dXaXRoWW91dHViZTtcclxuXHR9KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJylcclxuXHQuY29udHJvbGxlcignTGVhZGVyYm9hcmRDdHJsJywgZnVuY3Rpb24oJHJvb3RTY29wZSwgJHN0YXRlLCBBcGksICRzY29wZSkge1xyXG5cclxuXHRcdCRzY29wZS5sZWFkZXJib2FyZCA9IG51bGw7XHJcblx0XHQkc2NvcGUubG9hZGluZyA9IHRydWU7XHJcblxyXG5cdFx0JHNjb3BlLmdldCA9IGZ1bmN0aW9uKHR5cGUpIHtcclxuXHRcdFx0JHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xyXG5cdFx0XHRBcGkuY2FsbCh7XHJcblx0XHRcdFx0dXJsOiAnbGVhZGVyYm9hcmQvJyArIHR5cGUsXHJcblx0XHRcdFx0Y2FsbGJhY2s6IGZ1bmN0aW9uKHJlcykge1xyXG5cdFx0XHRcdFx0JHNjb3BlLmxlYWRlcmJvYXJkID0gcmVzLmRhdGEubGVhZGVyYm9hcmQ7XHJcblx0XHRcdFx0XHQkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0JHNjb3BlLmdldCgnZ2xvYmFsJyk7XHJcblx0fSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpXHJcblx0LmNvbnRyb2xsZXIoJ1N5bmNDdHJsJywgZnVuY3Rpb24oJHJvb3RTY29wZSwgJHN0YXRlLCBBcGksIFN5bmMsICRsb2NhdGlvbiwgTG9naW4pIHtcclxuXHJcblx0XHR2YXIgc2NvcGUgPSB0aGlzO1xyXG5cclxuXHJcblx0XHRzY29wZS5zeW5jID0gU3luYy5zeW5jO1xyXG5cclxuXHRcdGlmIChMb2dpbi5pc0xvZ2dlZCgpKSB7XHJcblx0XHRcdHNjb3BlLnN5bmMoKTtcclxuXHRcdH1cclxuXHJcblx0XHQkcm9vdFNjb3BlLiRvbignc3luY0RvbmUnLCBmdW5jdGlvbigpIHtcclxuXHRcdFx0JGxvY2F0aW9uLnBhdGgoJy8nKTtcclxuXHRcdH0pXHJcblx0fSk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
