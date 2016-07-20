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
            .state('top', {
                url: '/top',
                templateUrl: 'top/index.html',
                controller: 'TopCtrl as Top',
                data: {
                    ensureAuthenticate: true
                },
                activetab: 'top'
            });

        $urlRouterProvider.otherwise(function($injector) {
            var $state;
            $state = $injector.get('$state');
            return $state.go('404', null, {
                location: false
            });
        });

    })
    .run(function($rootScope, $state, $timeout, Login, Blocker, $location, Points, $window) {
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
                $window.location.href = '/';
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
angular.module('App').service('Login', function($rootScope, $interval, Api, $window, store) {

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
        $window.location.href = '/';
    });

    $rootScope.$on('successfullySignedUp', function() {
        console.log('successfullySignedUp');
        $window.location.href = '/sync';
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
                url: 'user/logout',
                method: 'post',
                callback: updateStatus
            });
            $window.location.href = '/';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbnRyb2xsZXIvYmF0dGxlLmpzIiwiY29udHJvbGxlci9ib3R0b21Vc2VyLmpzIiwiY29udHJvbGxlci9qb2luLmpzIiwiY29udHJvbGxlci9sZWFkZXJib2FyZC5qcyIsImNvbnRyb2xsZXIvc3luYy5qcyIsImNvbnRyb2xsZXIvdG9wLmpzIiwiZmlsdGVyL21lZ2FOdW1iZXIuanMiLCJzZXJ2aWNlL2FwaS5qcyIsInNlcnZpY2UvYmxvY2tlci5qcyIsInNlcnZpY2UvbG9naW4uanMiLCJzZXJ2aWNlL3BvaW50cy5qcyIsInNlcnZpY2Uvc3luYy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJhbmd1bGFyLm1vZHVsZSgnQXBwJywgWyd0ZW1wbGF0ZXMnLCAndWkucm91dGVyJywgJ25nQW5pbWF0ZScsICduZ1JvdXRlJywgJ2FuZ3VsYXItc3RvcmFnZScsICdhbmd1bGFyLWp3dCddKVxyXG4gICAgLmNvbnN0YW50KCdDb25maWcnLCB7XHJcbiAgICAgICAgYXBpQmFzZTogd2luZG93LmxvY2F0aW9uLnByb3RvY29sICsgXCIvL1wiICsgd2luZG93LmxvY2F0aW9uLmhvc3QgKyBcIi9hcGkvXCJcclxuICAgIH0pXHJcbiAgICAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIsICRzY2VQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIsIGp3dEludGVyY2VwdG9yUHJvdmlkZXIsICRodHRwUHJvdmlkZXIpIHtcclxuXHJcbiAgICAgICAgand0SW50ZXJjZXB0b3JQcm92aWRlci50b2tlbkdldHRlciA9IGZ1bmN0aW9uKHN0b3JlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBzdG9yZS5nZXQoJ2p3dCcpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKCdqd3RJbnRlcmNlcHRvcicpO1xyXG5cclxuICAgICAgICAkc2NlUHJvdmlkZXIuZW5hYmxlZChmYWxzZSk7XHJcbiAgICAgICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xyXG5cclxuICAgICAgICAkc3RhdGVQcm92aWRlclxyXG4gICAgICAgICAgICAuc3RhdGUoJ2pvaW4nLCB7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICcvam9pbicsXHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2pvaW4vaW5kZXguaHRtbCcsXHJcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnSm9pbkN0cmwgYXMgSm9pbicsXHJcbiAgICAgICAgICAgICAgICBhY3RpdmV0YWI6ICdqb2luJyxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICBlbnN1cmVBdXRoZW50aWNhdGU6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5zdGF0ZSgnc3luYycsIHtcclxuICAgICAgICAgICAgICAgIHVybDogJy9zeW5jJyxcclxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnc3luYy9pbmRleC5odG1sJyxcclxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdTeW5jQ3RybCBhcyBTeW5jJyxcclxuICAgICAgICAgICAgICAgIGFjdGl2ZXRhYjogJ3N5bmMnLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuc3VyZUF1dGhlbnRpY2F0ZTogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuc3RhdGUoJ2JhdHRsZScsIHtcclxuICAgICAgICAgICAgICAgIHVybDogJy8nLFxyXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdiYXR0bGUvaW5kZXguaHRtbCcsXHJcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQmF0dGxlQ3RybCBhcyBCYXR0bGUnLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuc3VyZUF1dGhlbnRpY2F0ZTogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIGFjdGl2ZXRhYjogJ2JhdHRsZSdcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLnN0YXRlKCdsZWFkZXJib2FyZCcsIHtcclxuICAgICAgICAgICAgICAgIHVybDogJy9sZWFkZXJib2FyZCcsXHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2xlYWRlcmJvYXJkL2luZGV4Lmh0bWwnLFxyXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0xlYWRlcmJvYXJkQ3RybCBhcyBMZWFkZXJib2FyZCcsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5zdXJlQXV0aGVudGljYXRlOiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgYWN0aXZldGFiOiAnbGVhZGVyYm9hcmQnXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5zdGF0ZSgndG9wJywge1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnL3RvcCcsXHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ3RvcC9pbmRleC5odG1sJyxcclxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdUb3BDdHJsIGFzIFRvcCcsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5zdXJlQXV0aGVudGljYXRlOiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgYWN0aXZldGFiOiAndG9wJ1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZShmdW5jdGlvbigkaW5qZWN0b3IpIHtcclxuICAgICAgICAgICAgdmFyICRzdGF0ZTtcclxuICAgICAgICAgICAgJHN0YXRlID0gJGluamVjdG9yLmdldCgnJHN0YXRlJyk7XHJcbiAgICAgICAgICAgIHJldHVybiAkc3RhdGUuZ28oJzQwNCcsIG51bGwsIHtcclxuICAgICAgICAgICAgICAgIGxvY2F0aW9uOiBmYWxzZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9KVxyXG4gICAgLnJ1bihmdW5jdGlvbigkcm9vdFNjb3BlLCAkc3RhdGUsICR0aW1lb3V0LCBMb2dpbiwgQmxvY2tlciwgJGxvY2F0aW9uLCBQb2ludHMsICR3aW5kb3cpIHtcclxuICAgICAgICAkcm9vdFNjb3BlLiRzdGF0ZSA9ICRzdGF0ZTtcclxuICAgICAgICAkcm9vdFNjb3BlLkxvZ2luID0gTG9naW47XHJcbiAgICAgICAgJHJvb3RTY29wZS5CbG9ja2VyID0gQmxvY2tlcjtcclxuICAgICAgICAkcm9vdFNjb3BlLlBvaW50cyA9IFBvaW50cztcclxuICAgICAgICAkcm9vdFNjb3BlLiRvbihcIiRzdGF0ZUNoYW5nZVN0YXJ0XCIsIGZ1bmN0aW9uKGV2ZW50LCBuZXh0LCBjdXJyZW50KSB7XHJcbiAgICAgICAgICAgIGlmIChuZXh0LmRhdGEuZW5zdXJlQXV0aGVudGljYXRlKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoISRyb290U2NvcGUuTG9naW4uaXNMb2dnZWQoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdqb2luJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChuZXh0LnVybCA9PSAnL2pvaW4nICYmICRyb290U2NvcGUuTG9naW4uaXNMb2dnZWQoKSkge1xyXG4gICAgICAgICAgICAgICAgJHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gJy8nO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRyb290U2NvcGUuc2FmZUFwcGx5ID0gZnVuY3Rpb24gc2FmZUFwcGx5KG9wZXJhdGlvbikge1xyXG4gICAgICAgICAgICB2YXIgcGhhc2UgPSB0aGlzLiRyb290LiQkcGhhc2U7XHJcbiAgICAgICAgICAgIGlmIChwaGFzZSAhPT0gJyRhcHBseScgJiYgcGhhc2UgIT09ICckZGlnZXN0Jykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kYXBwbHkob3BlcmF0aW9uKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG9wZXJhdGlvbiAmJiB0eXBlb2Ygb3BlcmF0aW9uID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICBvcGVyYXRpb24oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG5cclxuXHJcbiAgICB9KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJylcclxuXHQuY29udHJvbGxlcignQmF0dGxlQ3RybCcsIGZ1bmN0aW9uKCRyb290U2NvcGUsICRzdGF0ZSwgQXBpLCBMb2dpbiwgJHNjb3BlKSB7XHJcblxyXG5cdFx0JHNjb3BlLmJhdHRsZSA9IG51bGw7XHJcblx0XHQkc2NvcGUubG9hZGluZyA9IHRydWU7XHJcblxyXG5cdFx0JHNjb3BlLmdldE5ld0JhdHRsZSA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHQkc2NvcGUubG9hZGluZyA9IHRydWU7XHJcblx0XHRcdCRzY29wZS5iYXR0bGUgPSBudWxsO1xyXG5cdFx0XHRBcGkuY2FsbCh7XHJcblx0XHRcdFx0dXJsOiAndm90ZS9uZXcnLFxyXG5cdFx0XHRcdGNhbGxiYWNrOiBmdW5jdGlvbihyZXMpIHtcclxuXHRcdFx0XHRcdCRzY29wZS5iYXR0bGUgPSByZXMuZGF0YS52b3RlO1xyXG5cdFx0XHRcdFx0JHNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHRcdC8vIGNvbnNvbGUubG9nKCRzY29wZS5iYXR0bGUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0JHNjb3BlLnZvdGUgPSBmdW5jdGlvbih3aW5uZXIpIHtcclxuXHRcdFx0QXBpLmNhbGwoe1xyXG5cdFx0XHRcdHVybDogJ3ZvdGUvJyArICRzY29wZS5iYXR0bGUuaGFzaF9pZCxcclxuXHRcdFx0XHRtZXRob2Q6ICdQVVQnLFxyXG5cdFx0XHRcdGRhdGE6IHtcclxuXHRcdFx0XHRcdHdpbm5lcjogd2lubmVyXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRjYWxsYmFjazogZnVuY3Rpb24ocmVzKSB7XHJcblx0XHRcdFx0XHRpZiAocmVzLmRhdGEucG9pbnRzKSB7XHJcblx0XHRcdFx0XHRcdCRyb290U2NvcGUuJGVtaXQoJ3BvaW50c0NoYW5nZWQnLCByZXMuZGF0YS5wb2ludHMpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0JHNjb3BlLmdldE5ld0JhdHRsZSgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSlcclxuXHRcdH1cclxuXHJcblx0XHQkc2NvcGUuZ2V0TmV3QmF0dGxlKCk7XHJcblx0fSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpXHJcblx0LmNvbnRyb2xsZXIoJ2JvdHRvbVVzZXJDdHJsJywgZnVuY3Rpb24oTG9naW4sICRyb290U2NvcGUsICRzY29wZSwgUG9pbnRzLCAkbG9jYXRpb24pIHtcclxuXHRcdCRzY29wZS51c2VyID0ge307XHJcblxyXG5cdFx0JHNjb3BlLnByb2dyZXNzID0ge1xyXG5cdFx0XHRwb2ludHM6IDAsXHJcblx0XHRcdGxldmVsOiB7XHJcblx0XHRcdFx0Y3VycmVudDogbnVsbCxcclxuXHRcdFx0XHRuZXh0OiBudWxsLFxyXG5cdFx0XHRcdHByb2dyZXNzOiAwXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQkc2NvcGUuaW5pdFVzZXIgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0JHNjb3BlLnVzZXIgPSAkcm9vdFNjb3BlLkxvZ2luLmdldFVzZXIoKTtcclxuXHJcblx0XHR9XHJcblxyXG5cdFx0JHNjb3BlLnVwZGF0ZVBvaW50cyA9IGZ1bmN0aW9uKHBvaW50cykge1xyXG5cdFx0XHRpZiAodHlwZW9mIHBvaW50cyAhPSAnbnVtYmVyJykge1xyXG5cdFx0XHRcdHBvaW50cyA9IHBvaW50cy50b3RhbF9wb2ludHM7XHJcblx0XHRcdH1cclxuXHRcdFx0JHNjb3BlLnByb2dyZXNzLnBvaW50cyA9IHBvaW50cztcclxuXHRcdFx0JHJvb3RTY29wZS5Qb2ludHMuZ2V0TGV2ZWxzQnlQb2ludHMoJHNjb3BlLnByb2dyZXNzLnBvaW50cylcclxuXHRcdFx0XHQudGhlbihmdW5jdGlvbihsZXZlbHMpIHtcclxuXHRcdFx0XHRcdCRzY29wZS5wcm9ncmVzcy5sZXZlbC5jdXJyZW50ID0gbGV2ZWxzWzBdO1xyXG5cdFx0XHRcdFx0JHNjb3BlLnByb2dyZXNzLmxldmVsLm5leHQgPSBsZXZlbHNbMV07XHJcblx0XHRcdFx0XHQkc2NvcGUucHJvZ3Jlc3MubGV2ZWwucHJvZ3Jlc3MgPSAkcm9vdFNjb3BlLlBvaW50cy5nZXRQZXJjZW50YWdlKCRzY29wZS5wcm9ncmVzcy5sZXZlbC5jdXJyZW50LCAkc2NvcGUucHJvZ3Jlc3MubGV2ZWwubmV4dCwgJHNjb3BlLnByb2dyZXNzLnBvaW50cyk7XHJcblx0XHRcdFx0fSlcclxuXHRcdH1cclxuXHJcblx0XHQkc2NvcGUubG9nT3V0ID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdCRyb290U2NvcGUuTG9naW4ubG9nT3V0KCk7XHJcblx0XHR9XHJcblxyXG5cdFx0JHJvb3RTY29wZS4kb24oJ3BvaW50c0NoYW5nZWQnLCBmdW5jdGlvbihldmVudCwgcG9pbnRzKSB7XHJcblx0XHRcdCRzY29wZS51cGRhdGVQb2ludHMocG9pbnRzKTtcclxuXHRcdH0pXHJcblxyXG5cdFx0JHJvb3RTY29wZS4kb24oJ3N0YXR1c1VwZGF0ZWQnLCBmdW5jdGlvbigpIHtcclxuXHRcdFx0JHNjb3BlLmluaXRVc2VyKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQkcm9vdFNjb3BlLiRvbignbGV2ZWxzSW5pdERvbmUnLCBmdW5jdGlvbigpIHtcclxuXHRcdFx0JHNjb3BlLnVwZGF0ZVBvaW50cygkc2NvcGUudXNlci5wb2ludHMpXHJcblx0XHR9KTtcclxuXHRcdC8vICRzY29wZS5pbml0VXNlcigpO1xyXG5cdH0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKVxyXG5cdC5jb250cm9sbGVyKCdKb2luQ3RybCcsIGZ1bmN0aW9uKExvZ2luKSB7XHJcblx0XHR2YXIgc2NvcGUgPSB0aGlzO1xyXG5cclxuXHRcdHNjb3BlLmxvZ1dpdGhZb3V0dWJlID0gTG9naW4ubG9nV2l0aFlvdXR1YmU7XHJcblx0fSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpXHJcblx0LmNvbnRyb2xsZXIoJ0xlYWRlcmJvYXJkQ3RybCcsIGZ1bmN0aW9uKCRyb290U2NvcGUsICRzdGF0ZSwgQXBpLCAkc2NvcGUpIHtcclxuXHJcblx0XHQkc2NvcGUubGVhZGVyYm9hcmQgPSBudWxsO1xyXG5cdFx0JHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xyXG5cclxuXHRcdCRzY29wZS5nZXQgPSBmdW5jdGlvbih0eXBlKSB7XHJcblx0XHRcdCRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcclxuXHRcdFx0QXBpLmNhbGwoe1xyXG5cdFx0XHRcdHVybDogJ2xlYWRlcmJvYXJkLycgKyB0eXBlLFxyXG5cdFx0XHRcdGNhbGxiYWNrOiBmdW5jdGlvbihyZXMpIHtcclxuXHRcdFx0XHRcdCRzY29wZS5sZWFkZXJib2FyZCA9IHJlcy5kYXRhLmxlYWRlcmJvYXJkO1xyXG5cdFx0XHRcdFx0JHNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdCRzY29wZS5nZXQoJ2dsb2JhbCcpO1xyXG5cdH0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKVxyXG5cdC5jb250cm9sbGVyKCdTeW5jQ3RybCcsIGZ1bmN0aW9uKCRyb290U2NvcGUsICRzdGF0ZSwgQXBpLCBTeW5jLCAkbG9jYXRpb24sIExvZ2luKSB7XHJcblxyXG5cdFx0dmFyIHNjb3BlID0gdGhpcztcclxuXHJcblxyXG5cdFx0c2NvcGUuc3luYyA9IFN5bmMuc3luYztcclxuXHJcblx0XHRpZiAoTG9naW4uaXNMb2dnZWQoKSkge1xyXG5cdFx0XHRzY29wZS5zeW5jKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0JHJvb3RTY29wZS4kb24oJ3N5bmNEb25lJywgZnVuY3Rpb24oKSB7XHJcblx0XHRcdCRsb2NhdGlvbi5wYXRoKCcvJyk7XHJcblx0XHR9KVxyXG5cdH0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKVxyXG5cdC5jb250cm9sbGVyKCdUb3BDdHJsJywgZnVuY3Rpb24oJHJvb3RTY29wZSwgJHN0YXRlLCBBcGksICRzY29wZSkge1xyXG5cclxuXHRcdCRzY29wZS5jaGFubmVscyA9IG51bGw7XHJcblx0XHQkc2NvcGUubG9hZGluZyA9IHRydWU7XHJcblxyXG5cdFx0JHNjb3BlLmdldCA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHQkc2NvcGUubG9hZGluZyA9IHRydWU7XHJcblx0XHRcdEFwaS5jYWxsKHtcclxuXHRcdFx0XHR1cmw6ICdjaGFubmVsJyxcclxuXHRcdFx0XHRjYWxsYmFjazogZnVuY3Rpb24ocmVzKSB7XHJcblx0XHRcdFx0XHQkc2NvcGUuY2hhbm5lbHMgPSByZXMuZGF0YS5jaGFubmVscztcclxuXHRcdFx0XHRcdCRzY29wZS5sb2FkaW5nID0gZmFsc2U7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQkc2NvcGUuZ2V0KCk7XHJcblx0fSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpXHJcbiAgICAuZmlsdGVyKFwibWVnYU51bWJlclwiLCAoKSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIChudW1iZXIsIGZyYWN0aW9uU2l6ZSkgPT4ge1xyXG5cclxuICAgICAgICAgICAgaWYgKG51bWJlciA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIGlmIChudW1iZXIgPT09IDApIHJldHVybiBcIjBcIjtcclxuXHJcbiAgICAgICAgICAgIGlmICghZnJhY3Rpb25TaXplIHx8IGZyYWN0aW9uU2l6ZSA8IDApXHJcbiAgICAgICAgICAgICAgICBmcmFjdGlvblNpemUgPSAxO1xyXG5cclxuICAgICAgICAgICAgdmFyIGFicyA9IE1hdGguYWJzKG51bWJlcik7XHJcbiAgICAgICAgICAgIHZhciByb3VuZGVyID0gTWF0aC5wb3coMTAsIGZyYWN0aW9uU2l6ZSk7XHJcbiAgICAgICAgICAgIHZhciBpc05lZ2F0aXZlID0gbnVtYmVyIDwgMDtcclxuICAgICAgICAgICAgdmFyIGtleSA9ICcnO1xyXG4gICAgICAgICAgICB2YXIgcG93ZXJzID0gW3tcclxuICAgICAgICAgICAgICAgIGtleTogXCJRXCIsXHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogTWF0aC5wb3coMTAsIDE1KVxyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICBrZXk6IFwiVFwiLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6IE1hdGgucG93KDEwLCAxMilcclxuICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAga2V5OiBcIkJcIixcclxuICAgICAgICAgICAgICAgIHZhbHVlOiBNYXRoLnBvdygxMCwgOSlcclxuICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAga2V5OiBcIk1cIixcclxuICAgICAgICAgICAgICAgIHZhbHVlOiBNYXRoLnBvdygxMCwgNilcclxuICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAga2V5OiBcIktcIixcclxuICAgICAgICAgICAgICAgIHZhbHVlOiAxMDAwXHJcbiAgICAgICAgICAgIH1dO1xyXG5cclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwb3dlcnMubGVuZ3RoOyBpKyspIHtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgcmVkdWNlZCA9IGFicyAvIHBvd2Vyc1tpXS52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICByZWR1Y2VkID0gTWF0aC5yb3VuZChyZWR1Y2VkICogcm91bmRlcikgLyByb3VuZGVyO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChyZWR1Y2VkID49IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICBhYnMgPSByZWR1Y2VkO1xyXG4gICAgICAgICAgICAgICAgICAgIGtleSA9IHBvd2Vyc1tpXS5rZXk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiAoaXNOZWdhdGl2ZSA/ICctJyA6ICcnKSArIGFicyArIGtleTtcclxuICAgICAgICB9O1xyXG4gICAgfSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpLnNlcnZpY2UoJ0FwaScsIGZ1bmN0aW9uKCRodHRwLCAkcSwgQ29uZmlnLCAkdGltZW91dCwgLypOb3RpZmljYXRpb25zLCovIEJsb2NrZXIsICRzdGF0ZSkge1xyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIFBlcmZvcm0gYW4gQVBJIGNhbGwuXHJcbiAgICAgKiBAcGFyYW0gb3B0aW9ucyB7dXJsLCBwYXJhbXMsIGRhdGEsIGNhbGxiYWNrLCBtZXRob2QsIGVycm9ySGFuZGxlciAoc2hvdWxkIHJldHVybiB0cnVlKSwgdGltZW91dCBpbiBNUywgYmxvY2tVSX1cclxuICAgICAqL1xyXG4gICAgdGhpcy5jYWxsID0gZnVuY3Rpb24ob3B0aW9ucykge1xyXG5cclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGFuZ3VsYXIuZXh0ZW5kKHtcclxuICAgICAgICAgICAgdXJsOiBudWxsLFxyXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgICAgICBwYXJhbXM6IG51bGwsXHJcbiAgICAgICAgICAgIGRhdGE6IG51bGwsXHJcbiAgICAgICAgICAgIGNhbGxiYWNrOiBudWxsLFxyXG4gICAgICAgICAgICB0aW1lb3V0OiAzMDAwMCxcclxuICAgICAgICAgICAgZXJyb3JIYW5kbGVyOiBudWxsLFxyXG4gICAgICAgICAgICBibG9ja1VJOiB0cnVlLFxyXG4gICAgICAgIH0sIG9wdGlvbnMpO1xyXG5cclxuICAgICAgICB2YXIgY2FuY2VsZXIgPSAkcS5kZWZlcigpO1xyXG4gICAgICAgIHZhciBjYW5jZWxUaW1lb3V0ID0gb3B0aW9ucy50aW1lb3V0ID8gJHRpbWVvdXQoY2FuY2VsZXIucmVzb2x2ZSwgb3B0aW9ucy50aW1lb3V0KSA6IG51bGw7XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmJsb2NrVUkpIHtcclxuICAgICAgICAgICAgQmxvY2tlci5ibG9jaygpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIHVybCA9IG9wdGlvbnMudXJsLmluZGV4T2YoJ2h0dHAnKSA9PSAwID8gb3B0aW9ucy51cmwgOiBDb25maWcuYXBpQmFzZSArIG9wdGlvbnMudXJsO1xyXG5cclxuICAgICAgICAkaHR0cCh7XHJcbiAgICAgICAgICAgIHVybDogdXJsLFxyXG4gICAgICAgICAgICBtZXRob2Q6IG9wdGlvbnMubWV0aG9kLFxyXG4gICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zLFxyXG4gICAgICAgICAgICBkYXRhOiBvcHRpb25zLmRhdGEsXHJcbiAgICAgICAgICAgIHRpbWVvdXQ6IGNhbmNlbGVyLnByb21pc2VcclxuICAgICAgICB9KS5zdWNjZXNzKGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKGNhbmNlbFRpbWVvdXQpO1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuY2FsbGJhY2sgPT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgb3B0aW9ucy5jYWxsYmFjayhkYXRhKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAob3B0aW9ucy5ibG9ja1VJKSB7XHJcbiAgICAgICAgICAgICAgICBCbG9ja2VyLnVuYmxvY2soKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pLmVycm9yKGZ1bmN0aW9uKG1lc3NhZ2UsIHN0YXR1cykge1xyXG4gICAgICAgICAgICAkdGltZW91dC5jYW5jZWwoY2FuY2VsVGltZW91dCk7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5lcnJvckhhbmRsZXIgPT0gJ2Z1bmN0aW9uJyAmJiBvcHRpb25zLmVycm9ySGFuZGxlcihtZXNzYWdlLCBzdGF0dXMpKSB7XHJcbiAgICAgICAgICAgICAgICAvL0Vycm9yIHdhcyBoYW5kbGVkIGJ5IHRoZSBjdXN0b20gZXJyb3IgaGFuZGxlclxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIXN0YXR1cykge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFcnJvciB3aXRob3V0IHN0YXR1czsgcmVxdWVzdCBhYm9ydGVkP1wiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoc3RhdHVzID09IDQwMSkge1xyXG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdqb2luJyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIE5vdGlmaWNhdGlvbnMuYWRkKFwiRXJyb3IgXCIgKyBzdGF0dXMsIG1lc3NhZ2UpO1xyXG5cclxuICAgICAgICAgICAgaWYgKG9wdGlvbnMuYmxvY2tVSSkge1xyXG4gICAgICAgICAgICAgICAgQmxvY2tlci51bmJsb2NrKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGNhbmNlbDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBjYW5jZWxlci5yZXNvbHZlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgIH07XHJcblxyXG59KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJykuc2VydmljZSgnQmxvY2tlcicsIGZ1bmN0aW9uKCRyb290U2NvcGUpIHtcclxuXHJcbiAgICB0aGlzLmJsb2NrVUkgPSBmYWxzZTtcclxuICAgIHRoaXMuYmxvY2tDb3VudCA9IDA7XHJcbiAgICB0aGlzLm5hbWVkQmxvY2tzID0gW107XHJcbiAgICB0aGlzLnpJbmRleCA9IDEwMDAwMDAwO1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG5cclxuICAgIGZ1bmN0aW9uIGNhbGNaSW5kZXgoKSB7XHJcblxyXG4gICAgICAgIGlmICghdGhhdC5uYW1lZEJsb2Nrcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgdGhhdC56SW5kZXggPSAxMDAwMDAwMDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGF0LnpJbmRleCA9IDA7XHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCh0aGF0Lm5hbWVkQmxvY2tzLCBmdW5jdGlvbihibG9jaywgaW5kZXgpIHtcclxuICAgICAgICAgICAgICAgIHRoYXQuekluZGV4ID0gYmxvY2suekluZGV4ID4gdGhhdC56SW5kZXggPyBibG9jay56SW5kZXggOiB0aGF0LnpJbmRleDtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuYmxvY2sgPSBmdW5jdGlvbihuYW1lLCB6SW5kZXgpIHtcclxuXHJcbiAgICAgICAgaWYgKG5hbWUpIHtcclxuICAgICAgICAgICAgLy90b2RvOiBtYXliZSBqdXN0IGFuIG9iamVjdCB3aXRoIG5hbWUgZm9yIGtleXMgKGJ1dCB0aGVuIGxlbmd0aCB3b3VsZCBiZSBhbiBpc3N1ZSlcclxuICAgICAgICAgICAgdGhhdC5uYW1lZEJsb2Nrcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IG5hbWUsXHJcbiAgICAgICAgICAgICAgICB6SW5kZXg6IHpJbmRleFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGF0LmJsb2NrQ291bnQrKztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNhbGNaSW5kZXgoKTtcclxuICAgICAgICB0aGF0LmJsb2NrVUkgPSB0aGF0LmJsb2NrQ291bnQgPiAwIHx8IHRoYXQubmFtZWRCbG9ja3MubGVuZ3RoID4gMDtcclxuICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2Jsb2NrZXIudXBkYXRlQmxvY2tlcicpO1xyXG5cclxuICAgIH07XHJcblxyXG4gICAgdGhpcy51bmJsb2NrID0gZnVuY3Rpb24obmFtZSkge1xyXG5cclxuICAgICAgICBpZiAobmFtZSkge1xyXG4gICAgICAgICAgICB2YXIgZG9uZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2godGhhdC5uYW1lZEJsb2NrcywgZnVuY3Rpb24oYmxvY2ssIGluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoYmxvY2submFtZSA9PSBuYW1lICYmICFkb25lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5uYW1lZEJsb2Nrcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGRvbmUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGF0LmJsb2NrQ291bnQtLTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoYXQuYmxvY2tVSSA9IHRoYXQuYmxvY2tDb3VudCA+IDAgfHwgdGhhdC5uYW1lZEJsb2Nrcy5sZW5ndGggPiAwO1xyXG4gICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnYmxvY2tlci51cGRhdGVCbG9ja2VyJyk7XHJcblxyXG4gICAgfTtcclxuXHJcblxyXG59KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJykuc2VydmljZSgnTG9naW4nLCBmdW5jdGlvbigkcm9vdFNjb3BlLCAkaW50ZXJ2YWwsIEFwaSwgJHdpbmRvdywgc3RvcmUpIHtcclxuXHJcbiAgICB2YXIgdXNlciA9IG51bGw7XHJcbiAgICB2YXIgc3RhdHVzID0gJ25vdGNvbm5lY3RlZCc7XHJcbiAgICB2YXIgY3JlZGl0cyA9IG51bGw7XHJcbiAgICB2YXIgSldUID0gbnVsbDtcclxuICAgIHZhciBsb2FkZWQgPSBmYWxzZTtcclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGVTdGF0dXMoYWZ0ZXJMb2dpbikge1xyXG4gICAgICAgIHZhciBhZnRlckxvZ2luID0gYWZ0ZXJMb2dpbjtcclxuICAgICAgICBjb25zb2xlLmxvZygnVXBkYXRpbmcgc3RhdHVzIScpO1xyXG4gICAgICAgIEFwaS5jYWxsKHtcclxuICAgICAgICAgICAgdXJsOiAndXNlci9zdGF0dXMnLFxyXG4gICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgICAgICB1c2VyID0gZGF0YS5kYXRhLnVzZXIgfHwgbnVsbDtcclxuICAgICAgICAgICAgICAgIHN0YXR1cyA9IGRhdGEuZGF0YS5zdGF0dXM7XHJcbiAgICAgICAgICAgICAgICBsb2FkZWQgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgICAgIEpXVCA9IGRhdGEuZGF0YS5qd3RfdG9rZW47XHJcbiAgICAgICAgICAgICAgICBzdG9yZS5zZXQoJ2p3dCcsIGRhdGEuZGF0YS5qd3RfdG9rZW4pO1xyXG5cclxuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJ3N0YXR1c1VwZGF0ZWQnKTtcclxuICAgICAgICAgICAgICAgIGlmIChhZnRlckxvZ2luKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXR1cyA9PSAnY29ubmVjdGVkJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodXNlci5sYXN0X3N5bmNlZCA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnc3VjY2Vzc2Z1bGx5U2lnbmVkVXAnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnc3VjY2Vzc2Z1bGx5TG9nZ2VkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCdmYWlsZWRMb2dpbicpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZVN0YXR1cygpO1xyXG5cclxuICAgICRyb290U2NvcGUuJG9uKCdzdWNjZXNzZnVsbHlMb2dnZWQnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnc3VjY2Vzc2Z1bGx5TG9nZ2VkJyk7XHJcbiAgICAgICAgJHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gJy8nO1xyXG4gICAgfSk7XHJcblxyXG4gICAgJHJvb3RTY29wZS4kb24oJ3N1Y2Nlc3NmdWxseVNpZ25lZFVwJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ3N1Y2Nlc3NmdWxseVNpZ25lZFVwJyk7XHJcbiAgICAgICAgJHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gJy9zeW5jJztcclxuICAgIH0pO1xyXG5cclxuICAgIGZ1bmN0aW9uIGxvZ1dpdGhZb3V0dWJlKCkge1xyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwiTG9naW4gd2l0aCB5b3V0dWJlXCIpO1xyXG4gICAgICAgIHZhciBwb3B1cCA9IHdpbmRvdy5vcGVuKFwiYXV0aC95b3V0dWJlXCIsICdzb2NpYWxMb2dpbicsICd3aWR0aD00NTAsaGVpZ2h0PTYwMCxsb2NhdGlvbj0wLG1lbnViYXI9MCxyZXNpemFibGU9MSxzY3JvbGxiYXJzPTAsc3RhdHVzPTAsdGl0bGViYXI9MCx0b29sYmFyPTAnKTtcclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgcG9wdXAuZm9jdXMoKTtcclxuXHJcbiAgICAgICAgICAgIHZhciBwb3B1cEludGVydmFsID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFwb3B1cCB8fCBwb3B1cC5jbG9zZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVTdGF0dXModHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgJGludGVydmFsLmNhbmNlbChwb3B1cEludGVydmFsKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSwgMjAwKTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgIGFsZXJ0KFwiSXQgbG9va3MgbGlrZSB5b3UgYXJlIHVzaW5nIGEgcG9wdXAgYmxvY2tlci4gUGxlYXNlIGFsbG93IHRoaXMgb25lIGluIG9yZGVyIHRvIGxvZ2luLiBUaGFua3MhXCIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBpc0xvZ2dlZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBqd3QgPSBzdG9yZS5nZXQoJ2p3dCcpO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhqd3QpO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyghIWp3dCAmJiBqd3QgIT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGp3dCAhPSAndW5kZWZpbmVkJylcclxuICAgICAgICAgICAgcmV0dXJuICghIWp3dCAmJiBqd3QgIT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGp3dCAhPSAndW5kZWZpbmVkJyk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBsb2dPdXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBBcGkuY2FsbCh7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICd1c2VyL2xvZ291dCcsXHJcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdwb3N0JyxcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrOiB1cGRhdGVTdGF0dXNcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICR3aW5kb3cubG9jYXRpb24uaHJlZiA9ICcvJztcclxuICAgICAgICB9LFxyXG4gICAgICAgIHVwZGF0ZVN0YXR1czogdXBkYXRlU3RhdHVzLFxyXG4gICAgICAgIGxvZ1dpdGhZb3V0dWJlOiBsb2dXaXRoWW91dHViZSxcclxuICAgICAgICBnZXRVc2VyOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHVzZXI7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpc0xvYWRlZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBsb2FkZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbn0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKS5zZXJ2aWNlKCdQb2ludHMnLCBmdW5jdGlvbigkcm9vdFNjb3BlLCBBcGksICRxKSB7XHJcblxyXG5cdHZhciBsZXZlbHMgPSBudWxsO1xyXG5cdHZhciBsb2FkZWQgPSBmYWxzZTtcclxuXHJcblx0ZnVuY3Rpb24gaW5pdCgpIHtcclxuXHJcblx0XHRBcGkuY2FsbCh7XHJcblx0XHRcdHVybDogJ2xldmVsJyxcclxuXHRcdFx0Y2FsbGJhY2s6IGZ1bmN0aW9uKHJlcykge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKCdsZXZlbHNJbml0RG9uZScpO1xyXG5cdFx0XHRcdGxldmVscyA9IHJlcy5kYXRhLmxldmVscztcclxuXHJcblx0XHRcdFx0bG9hZGVkID0gdHJ1ZTtcclxuXHRcdFx0XHQkcm9vdFNjb3BlLiRlbWl0KCdsZXZlbHNJbml0RG9uZScpO1xyXG5cclxuXHRcdFx0fVxyXG5cdFx0fSlcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGdldExldmVsc0J5UG9pbnRzKHBvaW50cykge1xyXG5cdFx0dmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbGV2ZWxzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGxldmVsID0gbGV2ZWxzW2ldO1xyXG5cdFx0XHRpZiAobGV2ZWwucG9pbnRzID49IHBvaW50cykge1xyXG5cdFx0XHRcdGRlZmVycmVkLnJlc29sdmUoW2xldmVsc1tpIC0gMV0sIGxldmVsc1tpXV0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRkZWZlcnJlZC5yZXNvbHZlKFtsZXZlbHNbMV0sIGxldmVsc1syXV0pO1xyXG5cclxuXHRcdHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gZ2V0UGVyY2VudGFnZShjdXJyZW50TGV2ZWwsIG5leHRMZXZlbCwgcG9pbnRzKSB7XHJcblx0XHRyZXR1cm4gKChwb2ludHMgLSBjdXJyZW50TGV2ZWwucG9pbnRzKSAvIChuZXh0TGV2ZWwucG9pbnRzIC0gY3VycmVudExldmVsLnBvaW50cykpICogMTAwO1xyXG5cdH1cclxuXHRpbml0KCk7XHJcblx0cmV0dXJuIHtcclxuXHRcdGdldExldmVsc0J5UG9pbnRzOiBnZXRMZXZlbHNCeVBvaW50cyxcclxuXHRcdGdldFBlcmNlbnRhZ2U6IGdldFBlcmNlbnRhZ2UsXHJcblx0XHRsb2FkZWQ6IGxvYWRlZFxyXG5cdH07XHJcblxyXG59KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJykuc2VydmljZSgnU3luYycsIGZ1bmN0aW9uKCRyb290U2NvcGUsICRpbnRlcnZhbCwgQXBpKSB7XHJcblxyXG4gICAgdmFyIGxvYWRpbmcgPSBmYWxzZTtcclxuXHJcbiAgICBmdW5jdGlvbiBzeW5jKCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdTeW5jaW5nIGNoYW5uZWxzLi4uJyk7XHJcbiAgICAgICAgbG9hZGluZyA9IHRydWU7XHJcbiAgICAgICAgQXBpLmNhbGwoe1xyXG4gICAgICAgICAgICB1cmw6ICd1c2VyL3N5bmMnLFxyXG4gICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJTeW5jaW5nIGRvbmUuLi5cIik7XHJcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCdzeW5jRG9uZScpO1xyXG4gICAgICAgICAgICAgICAgbG9hZGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBzeW5jOiBzeW5jXHJcbiAgICB9O1xyXG5cclxufSk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
