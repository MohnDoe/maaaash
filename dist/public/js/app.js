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
			var levels = $rootScope.Points.getLevelsByPoints($scope.progress.points);
			$scope.progress.level.current = levels[0];
			$scope.progress.level.next = levels[1];
			$scope.progress.level.progress = $rootScope.Points.getPercentage($scope.progress.level.current, $scope.progress.level.next, $scope.progress.points);
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
		for (var i = 0; i < levels.length; i++) {
			level = levels[i];
			if (level.points >= points) {
				return [levels[i - 1], levels[i]];
			}
		}
		return [levels[1], levels[2]];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImZpbHRlci9tZWdhTnVtYmVyLmpzIiwiY29udHJvbGxlci9iYXR0bGUuanMiLCJjb250cm9sbGVyL2JvdHRvbVVzZXIuanMiLCJjb250cm9sbGVyL2pvaW4uanMiLCJjb250cm9sbGVyL3N5bmMuanMiLCJzZXJ2aWNlL2FwaS5qcyIsInNlcnZpY2UvYmxvY2tlci5qcyIsInNlcnZpY2UvbG9naW4uanMiLCJzZXJ2aWNlL3BvaW50cy5qcyIsInNlcnZpY2Uvc3luYy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiYW5ndWxhci5tb2R1bGUoJ0FwcCcsIFsndGVtcGxhdGVzJywgJ3VpLnJvdXRlcicsICduZ0FuaW1hdGUnLCAnbmdSb3V0ZScsICdhbmd1bGFyTW9tZW50JywgJ2FuZ3VsYXItc3RvcmFnZScsICdhbmd1bGFyLWp3dCddKVxyXG4gICAgLmNvbnN0YW50KCdDb25maWcnLCB7XHJcbiAgICAgICAgYXBpQmFzZTogd2luZG93LmxvY2F0aW9uLnByb3RvY29sICsgXCIvL1wiICsgd2luZG93LmxvY2F0aW9uLmhvc3QgKyBcIi9hcGkvXCJcclxuICAgIH0pXHJcbiAgICAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIsICRzY2VQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIsIGp3dEludGVyY2VwdG9yUHJvdmlkZXIsICRodHRwUHJvdmlkZXIpIHtcclxuXHJcbiAgICAgICAgand0SW50ZXJjZXB0b3JQcm92aWRlci50b2tlbkdldHRlciA9IGZ1bmN0aW9uKHN0b3JlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBzdG9yZS5nZXQoJ2p3dCcpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKCdqd3RJbnRlcmNlcHRvcicpO1xyXG5cclxuICAgICAgICAkc2NlUHJvdmlkZXIuZW5hYmxlZChmYWxzZSk7XHJcbiAgICAgICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xyXG5cclxuICAgICAgICAkc3RhdGVQcm92aWRlclxyXG4gICAgICAgICAgICAuc3RhdGUoJ2pvaW4nLCB7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICcvam9pbicsXHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2pvaW4vaW5kZXguaHRtbCcsXHJcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnSm9pbkN0cmwgYXMgSm9pbicsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5zdXJlQXV0aGVudGljYXRlOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuc3RhdGUoJ3N5bmMnLCB7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICcvc3luYycsXHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ3N5bmMvaW5kZXguaHRtbCcsXHJcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnU3luY0N0cmwgYXMgU3luYycsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5zdXJlQXV0aGVudGljYXRlOiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5zdGF0ZSgnYmF0dGxlJywge1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnLycsXHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2JhdHRsZS9pbmRleC5odG1sJyxcclxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdCYXR0bGVDdHJsIGFzIEJhdHRsZScsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5zdXJlQXV0aGVudGljYXRlOiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoZnVuY3Rpb24oJGluamVjdG9yKSB7XHJcbiAgICAgICAgICAgIHZhciAkc3RhdGU7XHJcbiAgICAgICAgICAgICRzdGF0ZSA9ICRpbmplY3Rvci5nZXQoJyRzdGF0ZScpO1xyXG4gICAgICAgICAgICByZXR1cm4gJHN0YXRlLmdvKCc0MDQnLCBudWxsLCB7XHJcbiAgICAgICAgICAgICAgICBsb2NhdGlvbjogZmFsc2VcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfSlcclxuICAgIC5ydW4oZnVuY3Rpb24oJHJvb3RTY29wZSwgJHN0YXRlLCAkdGltZW91dCwgTG9naW4sIEJsb2NrZXIsICRsb2NhdGlvbiwgUG9pbnRzKSB7XHJcbiAgICAgICAgJHJvb3RTY29wZS4kc3RhdGUgPSAkc3RhdGU7XHJcbiAgICAgICAgJHJvb3RTY29wZS5Mb2dpbiA9IExvZ2luO1xyXG4gICAgICAgICRyb290U2NvcGUuQmxvY2tlciA9IEJsb2NrZXI7XHJcbiAgICAgICAgJHJvb3RTY29wZS5Qb2ludHMgPSBQb2ludHM7XHJcblxyXG4gICAgICAgICRyb290U2NvcGUuJG9uKFwiJHN0YXRlQ2hhbmdlU3RhcnRcIiwgZnVuY3Rpb24oZXZlbnQsIG5leHQsIGN1cnJlbnQpIHtcclxuICAgICAgICAgICAgaWYgKG5leHQuZGF0YS5lbnN1cmVBdXRoZW50aWNhdGUpIHtcclxuICAgICAgICAgICAgICAgIGlmICghJHJvb3RTY29wZS5Mb2dpbi5pc0xvZ2dlZCgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2pvaW4nKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG5leHQudXJsID09ICcvam9pbicgJiYgJHJvb3RTY29wZS5Mb2dpbi5pc0xvZ2dlZCgpKSB7XHJcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24ucGF0aCgnLycpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRyb290U2NvcGUuc2FmZUFwcGx5ID0gZnVuY3Rpb24gc2FmZUFwcGx5KG9wZXJhdGlvbikge1xyXG4gICAgICAgICAgICB2YXIgcGhhc2UgPSB0aGlzLiRyb290LiQkcGhhc2U7XHJcbiAgICAgICAgICAgIGlmIChwaGFzZSAhPT0gJyRhcHBseScgJiYgcGhhc2UgIT09ICckZGlnZXN0Jykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kYXBwbHkob3BlcmF0aW9uKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG9wZXJhdGlvbiAmJiB0eXBlb2Ygb3BlcmF0aW9uID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICBvcGVyYXRpb24oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG5cclxuXHJcbiAgICB9KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJylcclxuICAgIC5maWx0ZXIoXCJtZWdhTnVtYmVyXCIsICgpID0+IHtcclxuICAgICAgICByZXR1cm4gKG51bWJlciwgZnJhY3Rpb25TaXplKSA9PiB7XHJcblxyXG4gICAgICAgICAgICBpZiAobnVtYmVyID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgaWYgKG51bWJlciA9PT0gMCkgcmV0dXJuIFwiMFwiO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFmcmFjdGlvblNpemUgfHwgZnJhY3Rpb25TaXplIDwgMClcclxuICAgICAgICAgICAgICAgIGZyYWN0aW9uU2l6ZSA9IDE7XHJcblxyXG4gICAgICAgICAgICB2YXIgYWJzID0gTWF0aC5hYnMobnVtYmVyKTtcclxuICAgICAgICAgICAgdmFyIHJvdW5kZXIgPSBNYXRoLnBvdygxMCwgZnJhY3Rpb25TaXplKTtcclxuICAgICAgICAgICAgdmFyIGlzTmVnYXRpdmUgPSBudW1iZXIgPCAwO1xyXG4gICAgICAgICAgICB2YXIga2V5ID0gJyc7XHJcbiAgICAgICAgICAgIHZhciBwb3dlcnMgPSBbe1xyXG4gICAgICAgICAgICAgICAga2V5OiBcIlFcIixcclxuICAgICAgICAgICAgICAgIHZhbHVlOiBNYXRoLnBvdygxMCwgMTUpXHJcbiAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgIGtleTogXCJUXCIsXHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogTWF0aC5wb3coMTAsIDEyKVxyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICBrZXk6IFwiQlwiLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6IE1hdGgucG93KDEwLCA5KVxyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICBrZXk6IFwiTVwiLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6IE1hdGgucG93KDEwLCA2KVxyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICBrZXk6IFwiS1wiLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6IDEwMDBcclxuICAgICAgICAgICAgfV07XHJcblxyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBvd2Vycy5sZW5ndGg7IGkrKykge1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciByZWR1Y2VkID0gYWJzIC8gcG93ZXJzW2ldLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgICAgIHJlZHVjZWQgPSBNYXRoLnJvdW5kKHJlZHVjZWQgKiByb3VuZGVyKSAvIHJvdW5kZXI7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHJlZHVjZWQgPj0gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGFicyA9IHJlZHVjZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAga2V5ID0gcG93ZXJzW2ldLmtleTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIChpc05lZ2F0aXZlID8gJy0nIDogJycpICsgYWJzICsga2V5O1xyXG4gICAgICAgIH07XHJcbiAgICB9KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJylcclxuXHQuY29udHJvbGxlcignQmF0dGxlQ3RybCcsIGZ1bmN0aW9uKCRyb290U2NvcGUsICRzdGF0ZSwgQXBpLCBMb2dpbiwgJHNjb3BlKSB7XHJcblxyXG5cdFx0JHNjb3BlLmJhdHRsZSA9IG51bGw7XHJcblx0XHQkc2NvcGUubG9hZGluZyA9IHRydWU7XHJcblxyXG5cdFx0JHNjb3BlLmdldE5ld0JhdHRsZSA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHQkc2NvcGUubG9hZGluZyA9IHRydWU7XHJcblx0XHRcdCRzY29wZS5iYXR0bGUgPSBudWxsO1xyXG5cdFx0XHRBcGkuY2FsbCh7XHJcblx0XHRcdFx0dXJsOiAndm90ZS9uZXcnLFxyXG5cdFx0XHRcdGNhbGxiYWNrOiBmdW5jdGlvbihyZXMpIHtcclxuXHRcdFx0XHRcdCRzY29wZS5iYXR0bGUgPSByZXMuZGF0YS52b3RlO1xyXG5cdFx0XHRcdFx0JHNjb3BlLmxvYWRpbmcgPSBmYWxzZTtcclxuXHRcdFx0XHRcdC8vIGNvbnNvbGUubG9nKCRzY29wZS5iYXR0bGUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0JHNjb3BlLnZvdGUgPSBmdW5jdGlvbih3aW5uZXIpIHtcclxuXHRcdFx0QXBpLmNhbGwoe1xyXG5cdFx0XHRcdHVybDogJ3ZvdGUvJyArICRzY29wZS5iYXR0bGUuaGFzaF9pZCxcclxuXHRcdFx0XHRtZXRob2Q6ICdQVVQnLFxyXG5cdFx0XHRcdGRhdGE6IHtcclxuXHRcdFx0XHRcdHdpbm5lcjogd2lubmVyXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRjYWxsYmFjazogZnVuY3Rpb24ocmVzKSB7XHJcblx0XHRcdFx0XHRpZiAocmVzLmRhdGEucG9pbnRzKSB7XHJcblx0XHRcdFx0XHRcdCRyb290U2NvcGUuJGVtaXQoJ3BvaW50c0NoYW5nZWQnLCByZXMuZGF0YS5wb2ludHMpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0JHNjb3BlLmdldE5ld0JhdHRsZSgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSlcclxuXHRcdH1cclxuXHJcblx0XHQkc2NvcGUuZ2V0TmV3QmF0dGxlKCk7XHJcblx0fSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpXHJcblx0LmNvbnRyb2xsZXIoJ2JvdHRvbVVzZXJDdHJsJywgZnVuY3Rpb24oTG9naW4sICRyb290U2NvcGUsICRzY29wZSwgUG9pbnRzKSB7XHJcblx0XHQkc2NvcGUudXNlciA9IHt9O1xyXG5cclxuXHRcdCRzY29wZS5wcm9ncmVzcyA9IHtcclxuXHRcdFx0cG9pbnRzOiAwLFxyXG5cdFx0XHRsZXZlbDoge1xyXG5cdFx0XHRcdGN1cnJlbnQ6IG51bGwsXHJcblx0XHRcdFx0bmV4dDogbnVsbCxcclxuXHRcdFx0XHRwcm9ncmVzczogMFxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0JHNjb3BlLmluaXRVc2VyID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdCRzY29wZS51c2VyID0gJHJvb3RTY29wZS5Mb2dpbi5nZXRVc2VyKCk7XHJcblxyXG5cdFx0fVxyXG5cclxuXHRcdCRzY29wZS51cGRhdGVQb2ludHMgPSBmdW5jdGlvbihwb2ludHMpIHtcclxuXHRcdFx0aWYgKHR5cGVvZiBwb2ludHMgIT0gJ251bWJlcicpIHtcclxuXHRcdFx0XHRwb2ludHMgPSBwb2ludHMudG90YWxfcG9pbnRzO1xyXG5cdFx0XHR9XHJcblx0XHRcdCRzY29wZS5wcm9ncmVzcy5wb2ludHMgPSBwb2ludHM7XHJcblx0XHRcdHZhciBsZXZlbHMgPSAkcm9vdFNjb3BlLlBvaW50cy5nZXRMZXZlbHNCeVBvaW50cygkc2NvcGUucHJvZ3Jlc3MucG9pbnRzKTtcclxuXHRcdFx0JHNjb3BlLnByb2dyZXNzLmxldmVsLmN1cnJlbnQgPSBsZXZlbHNbMF07XHJcblx0XHRcdCRzY29wZS5wcm9ncmVzcy5sZXZlbC5uZXh0ID0gbGV2ZWxzWzFdO1xyXG5cdFx0XHQkc2NvcGUucHJvZ3Jlc3MubGV2ZWwucHJvZ3Jlc3MgPSAkcm9vdFNjb3BlLlBvaW50cy5nZXRQZXJjZW50YWdlKCRzY29wZS5wcm9ncmVzcy5sZXZlbC5jdXJyZW50LCAkc2NvcGUucHJvZ3Jlc3MubGV2ZWwubmV4dCwgJHNjb3BlLnByb2dyZXNzLnBvaW50cyk7XHJcblx0XHR9XHJcblxyXG5cdFx0JHJvb3RTY29wZS4kb24oJ3BvaW50c0NoYW5nZWQnLCBmdW5jdGlvbihldmVudCwgcG9pbnRzKSB7XHJcblx0XHRcdCRzY29wZS51cGRhdGVQb2ludHMocG9pbnRzKTtcclxuXHRcdH0pXHJcblxyXG5cdFx0JHJvb3RTY29wZS4kb24oJ3N0YXR1c1VwZGF0ZWQnLCBmdW5jdGlvbigpIHtcclxuXHRcdFx0JHNjb3BlLmluaXRVc2VyKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQkcm9vdFNjb3BlLiRvbignbGV2ZWxzSW5pdERvbmUnLCBmdW5jdGlvbigpIHtcclxuXHRcdFx0JHNjb3BlLnVwZGF0ZVBvaW50cygkc2NvcGUudXNlci5wb2ludHMpXHJcblx0XHR9KTtcclxuXHRcdC8vICRzY29wZS5pbml0VXNlcigpO1xyXG5cdH0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKVxyXG5cdC5jb250cm9sbGVyKCdKb2luQ3RybCcsIGZ1bmN0aW9uKExvZ2luKSB7XHJcblx0XHR2YXIgc2NvcGUgPSB0aGlzO1xyXG5cclxuXHRcdHNjb3BlLmxvZ1dpdGhZb3V0dWJlID0gTG9naW4ubG9nV2l0aFlvdXR1YmU7XHJcblx0fSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpXHJcblx0LmNvbnRyb2xsZXIoJ1N5bmNDdHJsJywgZnVuY3Rpb24oJHJvb3RTY29wZSwgJHN0YXRlLCBBcGksIFN5bmMsICRsb2NhdGlvbiwgTG9naW4pIHtcclxuXHJcblx0XHR2YXIgc2NvcGUgPSB0aGlzO1xyXG5cclxuXHJcblx0XHRzY29wZS5zeW5jID0gU3luYy5zeW5jO1xyXG5cclxuXHRcdGlmIChMb2dpbi5pc0xvZ2dlZCgpKSB7XHJcblx0XHRcdHNjb3BlLnN5bmMoKTtcclxuXHRcdH1cclxuXHJcblx0XHQkcm9vdFNjb3BlLiRvbignc3luY0RvbmUnLCBmdW5jdGlvbigpIHtcclxuXHRcdFx0JGxvY2F0aW9uLnBhdGgoJy8nKTtcclxuXHRcdH0pXHJcblx0fSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpLnNlcnZpY2UoJ0FwaScsIGZ1bmN0aW9uKCRodHRwLCAkcSwgQ29uZmlnLCAkdGltZW91dCwgLypOb3RpZmljYXRpb25zLCovIEJsb2NrZXIsICRzdGF0ZSkge1xyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIFBlcmZvcm0gYW4gQVBJIGNhbGwuXHJcbiAgICAgKiBAcGFyYW0gb3B0aW9ucyB7dXJsLCBwYXJhbXMsIGRhdGEsIGNhbGxiYWNrLCBtZXRob2QsIGVycm9ySGFuZGxlciAoc2hvdWxkIHJldHVybiB0cnVlKSwgdGltZW91dCBpbiBNUywgYmxvY2tVSX1cclxuICAgICAqL1xyXG4gICAgdGhpcy5jYWxsID0gZnVuY3Rpb24ob3B0aW9ucykge1xyXG5cclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGFuZ3VsYXIuZXh0ZW5kKHtcclxuICAgICAgICAgICAgdXJsOiBudWxsLFxyXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgICAgICBwYXJhbXM6IG51bGwsXHJcbiAgICAgICAgICAgIGRhdGE6IG51bGwsXHJcbiAgICAgICAgICAgIGNhbGxiYWNrOiBudWxsLFxyXG4gICAgICAgICAgICB0aW1lb3V0OiAzMDAwMCxcclxuICAgICAgICAgICAgZXJyb3JIYW5kbGVyOiBudWxsLFxyXG4gICAgICAgICAgICBibG9ja1VJOiB0cnVlLFxyXG4gICAgICAgIH0sIG9wdGlvbnMpO1xyXG5cclxuICAgICAgICB2YXIgY2FuY2VsZXIgPSAkcS5kZWZlcigpO1xyXG4gICAgICAgIHZhciBjYW5jZWxUaW1lb3V0ID0gb3B0aW9ucy50aW1lb3V0ID8gJHRpbWVvdXQoY2FuY2VsZXIucmVzb2x2ZSwgb3B0aW9ucy50aW1lb3V0KSA6IG51bGw7XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmJsb2NrVUkpIHtcclxuICAgICAgICAgICAgQmxvY2tlci5ibG9jaygpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIHVybCA9IG9wdGlvbnMudXJsLmluZGV4T2YoJ2h0dHAnKSA9PSAwID8gb3B0aW9ucy51cmwgOiBDb25maWcuYXBpQmFzZSArIG9wdGlvbnMudXJsO1xyXG5cclxuICAgICAgICAkaHR0cCh7XHJcbiAgICAgICAgICAgIHVybDogdXJsLFxyXG4gICAgICAgICAgICBtZXRob2Q6IG9wdGlvbnMubWV0aG9kLFxyXG4gICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zLFxyXG4gICAgICAgICAgICBkYXRhOiBvcHRpb25zLmRhdGEsXHJcbiAgICAgICAgICAgIHRpbWVvdXQ6IGNhbmNlbGVyLnByb21pc2VcclxuICAgICAgICB9KS5zdWNjZXNzKGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKGNhbmNlbFRpbWVvdXQpO1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuY2FsbGJhY2sgPT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgb3B0aW9ucy5jYWxsYmFjayhkYXRhKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAob3B0aW9ucy5ibG9ja1VJKSB7XHJcbiAgICAgICAgICAgICAgICBCbG9ja2VyLnVuYmxvY2soKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pLmVycm9yKGZ1bmN0aW9uKG1lc3NhZ2UsIHN0YXR1cykge1xyXG4gICAgICAgICAgICAkdGltZW91dC5jYW5jZWwoY2FuY2VsVGltZW91dCk7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5lcnJvckhhbmRsZXIgPT0gJ2Z1bmN0aW9uJyAmJiBvcHRpb25zLmVycm9ySGFuZGxlcihtZXNzYWdlLCBzdGF0dXMpKSB7XHJcbiAgICAgICAgICAgICAgICAvL0Vycm9yIHdhcyBoYW5kbGVkIGJ5IHRoZSBjdXN0b20gZXJyb3IgaGFuZGxlclxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIXN0YXR1cykge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFcnJvciB3aXRob3V0IHN0YXR1czsgcmVxdWVzdCBhYm9ydGVkP1wiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoc3RhdHVzID09IDQwMSkge1xyXG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdqb2luJyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIE5vdGlmaWNhdGlvbnMuYWRkKFwiRXJyb3IgXCIgKyBzdGF0dXMsIG1lc3NhZ2UpO1xyXG5cclxuICAgICAgICAgICAgaWYgKG9wdGlvbnMuYmxvY2tVSSkge1xyXG4gICAgICAgICAgICAgICAgQmxvY2tlci51bmJsb2NrKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGNhbmNlbDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBjYW5jZWxlci5yZXNvbHZlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgIH07XHJcblxyXG59KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJykuc2VydmljZSgnQmxvY2tlcicsIGZ1bmN0aW9uKCRyb290U2NvcGUpIHtcclxuXHJcbiAgICB0aGlzLmJsb2NrVUkgPSBmYWxzZTtcclxuICAgIHRoaXMuYmxvY2tDb3VudCA9IDA7XHJcbiAgICB0aGlzLm5hbWVkQmxvY2tzID0gW107XHJcbiAgICB0aGlzLnpJbmRleCA9IDEwMDAwMDAwO1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG5cclxuICAgIGZ1bmN0aW9uIGNhbGNaSW5kZXgoKSB7XHJcblxyXG4gICAgICAgIGlmICghdGhhdC5uYW1lZEJsb2Nrcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgdGhhdC56SW5kZXggPSAxMDAwMDAwMDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGF0LnpJbmRleCA9IDA7XHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCh0aGF0Lm5hbWVkQmxvY2tzLCBmdW5jdGlvbihibG9jaywgaW5kZXgpIHtcclxuICAgICAgICAgICAgICAgIHRoYXQuekluZGV4ID0gYmxvY2suekluZGV4ID4gdGhhdC56SW5kZXggPyBibG9jay56SW5kZXggOiB0aGF0LnpJbmRleDtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuYmxvY2sgPSBmdW5jdGlvbihuYW1lLCB6SW5kZXgpIHtcclxuXHJcbiAgICAgICAgaWYgKG5hbWUpIHtcclxuICAgICAgICAgICAgLy90b2RvOiBtYXliZSBqdXN0IGFuIG9iamVjdCB3aXRoIG5hbWUgZm9yIGtleXMgKGJ1dCB0aGVuIGxlbmd0aCB3b3VsZCBiZSBhbiBpc3N1ZSlcclxuICAgICAgICAgICAgdGhhdC5uYW1lZEJsb2Nrcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IG5hbWUsXHJcbiAgICAgICAgICAgICAgICB6SW5kZXg6IHpJbmRleFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGF0LmJsb2NrQ291bnQrKztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNhbGNaSW5kZXgoKTtcclxuICAgICAgICB0aGF0LmJsb2NrVUkgPSB0aGF0LmJsb2NrQ291bnQgPiAwIHx8IHRoYXQubmFtZWRCbG9ja3MubGVuZ3RoID4gMDtcclxuICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2Jsb2NrZXIudXBkYXRlQmxvY2tlcicpO1xyXG5cclxuICAgIH07XHJcblxyXG4gICAgdGhpcy51bmJsb2NrID0gZnVuY3Rpb24obmFtZSkge1xyXG5cclxuICAgICAgICBpZiAobmFtZSkge1xyXG4gICAgICAgICAgICB2YXIgZG9uZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2godGhhdC5uYW1lZEJsb2NrcywgZnVuY3Rpb24oYmxvY2ssIGluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoYmxvY2submFtZSA9PSBuYW1lICYmICFkb25lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5uYW1lZEJsb2Nrcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGRvbmUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGF0LmJsb2NrQ291bnQtLTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoYXQuYmxvY2tVSSA9IHRoYXQuYmxvY2tDb3VudCA+IDAgfHwgdGhhdC5uYW1lZEJsb2Nrcy5sZW5ndGggPiAwO1xyXG4gICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnYmxvY2tlci51cGRhdGVCbG9ja2VyJyk7XHJcblxyXG4gICAgfTtcclxuXHJcblxyXG59KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJykuc2VydmljZSgnTG9naW4nLCBmdW5jdGlvbigkcm9vdFNjb3BlLCAkaW50ZXJ2YWwsIEFwaSwgJGxvY2F0aW9uLCBzdG9yZSkge1xyXG5cclxuICAgIHZhciB1c2VyID0gbnVsbDtcclxuICAgIHZhciBzdGF0dXMgPSAnbm90Y29ubmVjdGVkJztcclxuICAgIHZhciBjcmVkaXRzID0gbnVsbDtcclxuICAgIHZhciBKV1QgPSBudWxsO1xyXG4gICAgdmFyIGxvYWRlZCA9IGZhbHNlO1xyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZVN0YXR1cyhhZnRlckxvZ2luKSB7XHJcbiAgICAgICAgdmFyIGFmdGVyTG9naW4gPSBhZnRlckxvZ2luO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdVcGRhdGluZyBzdGF0dXMhJyk7XHJcbiAgICAgICAgQXBpLmNhbGwoe1xyXG4gICAgICAgICAgICB1cmw6ICd1c2VyL3N0YXR1cycsXHJcbiAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhkYXRhKTtcclxuICAgICAgICAgICAgICAgIHVzZXIgPSBkYXRhLmRhdGEudXNlciB8fCBudWxsO1xyXG4gICAgICAgICAgICAgICAgc3RhdHVzID0gZGF0YS5kYXRhLnN0YXR1cztcclxuICAgICAgICAgICAgICAgIGxvYWRlZCA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICAgICAgSldUID0gZGF0YS5kYXRhLmp3dF90b2tlbjtcclxuICAgICAgICAgICAgICAgIHN0b3JlLnNldCgnand0JywgZGF0YS5kYXRhLmp3dF90b2tlbik7XHJcblxyXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnc3RhdHVzVXBkYXRlZCcpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGFmdGVyTG9naW4pIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdHVzID09ICdjb25uZWN0ZWQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh1c2VyLmxhc3Rfc3luY2VkID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCdzdWNjZXNzZnVsbHlTaWduZWRVcCcpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCdzdWNjZXNzZnVsbHlMb2dnZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJ2ZhaWxlZExvZ2luJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlU3RhdHVzKCk7XHJcblxyXG4gICAgJHJvb3RTY29wZS4kb24oJ3N1Y2Nlc3NmdWxseUxvZ2dlZCcsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdzdWNjZXNzZnVsbHlMb2dnZWQnKTtcclxuICAgICAgICAkbG9jYXRpb24ucGF0aCgnLycpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgJHJvb3RTY29wZS4kb24oJ3N1Y2Nlc3NmdWxseVNpZ25lZFVwJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ3N1Y2Nlc3NmdWxseVNpZ25lZFVwJyk7XHJcbiAgICAgICAgJGxvY2F0aW9uLnBhdGgoJy9zeW5jJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBmdW5jdGlvbiBsb2dXaXRoWW91dHViZSgpIHtcclxuICAgICAgICAvLyBjb25zb2xlLmxvZyhcIkxvZ2luIHdpdGggeW91dHViZVwiKTtcclxuICAgICAgICB2YXIgcG9wdXAgPSB3aW5kb3cub3BlbihcImF1dGgveW91dHViZVwiLCAnc29jaWFsTG9naW4nLCAnd2lkdGg9NDUwLGhlaWdodD02MDAsbG9jYXRpb249MCxtZW51YmFyPTAscmVzaXphYmxlPTEsc2Nyb2xsYmFycz0wLHN0YXR1cz0wLHRpdGxlYmFyPTAsdG9vbGJhcj0wJyk7XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHBvcHVwLmZvY3VzKCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgcG9wdXBJbnRlcnZhbCA9ICRpbnRlcnZhbChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIGlmICghcG9wdXAgfHwgcG9wdXAuY2xvc2VkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlU3RhdHVzKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwocG9wdXBJbnRlcnZhbCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sIDIwMCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICBhbGVydChcIkl0IGxvb2tzIGxpa2UgeW91IGFyZSB1c2luZyBhIHBvcHVwIGJsb2NrZXIuIFBsZWFzZSBhbGxvdyB0aGlzIG9uZSBpbiBvcmRlciB0byBsb2dpbi4gVGhhbmtzIVwiKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgaXNMb2dnZWQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgand0ID0gc3RvcmUuZ2V0KCdqd3QnKTtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coand0KTtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coISFqd3QgJiYgand0ICE9ICd1bmRlZmluZWQnICYmIHR5cGVvZiBqd3QgIT0gJ3VuZGVmaW5lZCcpXHJcbiAgICAgICAgICAgIHJldHVybiAoISFqd3QgJiYgand0ICE9ICd1bmRlZmluZWQnICYmIHR5cGVvZiBqd3QgIT0gJ3VuZGVmaW5lZCcpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgbG9nT3V0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgQXBpLmNhbGwoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnbG9naW4vbG9nb3V0JyxcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ3Bvc3QnLFxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6IHVwZGF0ZVN0YXR1c1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdXBkYXRlU3RhdHVzOiB1cGRhdGVTdGF0dXMsXHJcbiAgICAgICAgbG9nV2l0aFlvdXR1YmU6IGxvZ1dpdGhZb3V0dWJlLFxyXG4gICAgICAgIGdldFVzZXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdXNlcjtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGlzTG9hZGVkOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGxvYWRlZDtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxufSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpLnNlcnZpY2UoJ1BvaW50cycsIGZ1bmN0aW9uKCRyb290U2NvcGUsIEFwaSwgJHEpIHtcclxuXHJcblx0dmFyIGxldmVscyA9IG51bGw7XHJcblx0dmFyIGxvYWRlZCA9IGZhbHNlO1xyXG5cclxuXHRmdW5jdGlvbiBpbml0KCkge1xyXG5cdFx0QXBpLmNhbGwoe1xyXG5cdFx0XHR1cmw6ICdsZXZlbCcsXHJcblx0XHRcdGNhbGxiYWNrOiBmdW5jdGlvbihyZXMpIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZygnbGV2ZWxzSW5pdERvbmUnKTtcclxuXHRcdFx0XHRsZXZlbHMgPSByZXMuZGF0YS5sZXZlbHM7XHJcblxyXG5cdFx0XHRcdGxvYWRlZCA9IHRydWU7XHJcblx0XHRcdFx0JHJvb3RTY29wZS4kZW1pdCgnbGV2ZWxzSW5pdERvbmUnKTtcclxuXHJcblx0XHRcdH1cclxuXHRcdH0pXHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBnZXRMZXZlbHNCeVBvaW50cyhwb2ludHMpIHtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbGV2ZWxzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGxldmVsID0gbGV2ZWxzW2ldO1xyXG5cdFx0XHRpZiAobGV2ZWwucG9pbnRzID49IHBvaW50cykge1xyXG5cdFx0XHRcdHJldHVybiBbbGV2ZWxzW2kgLSAxXSwgbGV2ZWxzW2ldXTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIFtsZXZlbHNbMV0sIGxldmVsc1syXV07XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBnZXRQZXJjZW50YWdlKGN1cnJlbnRMZXZlbCwgbmV4dExldmVsLCBwb2ludHMpIHtcclxuXHRcdHJldHVybiAoKHBvaW50cyAtIGN1cnJlbnRMZXZlbC5wb2ludHMpIC8gKG5leHRMZXZlbC5wb2ludHMgLSBjdXJyZW50TGV2ZWwucG9pbnRzKSkgKiAxMDA7XHJcblx0fVxyXG5cdGluaXQoKTtcclxuXHRyZXR1cm4ge1xyXG5cdFx0Z2V0TGV2ZWxzQnlQb2ludHM6IGdldExldmVsc0J5UG9pbnRzLFxyXG5cdFx0Z2V0UGVyY2VudGFnZTogZ2V0UGVyY2VudGFnZSxcclxuXHRcdGxvYWRlZDogbG9hZGVkXHJcblx0fTtcclxuXHJcbn0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKS5zZXJ2aWNlKCdTeW5jJywgZnVuY3Rpb24oJHJvb3RTY29wZSwgJGludGVydmFsLCBBcGkpIHtcclxuXHJcbiAgICB2YXIgbG9hZGluZyA9IGZhbHNlO1xyXG5cclxuICAgIGZ1bmN0aW9uIHN5bmMoKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1N5bmNpbmcgY2hhbm5lbHMuLi4nKTtcclxuICAgICAgICBsb2FkaW5nID0gdHJ1ZTtcclxuICAgICAgICBBcGkuY2FsbCh7XHJcbiAgICAgICAgICAgIHVybDogJ3VzZXIvc3luYycsXHJcbiAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlN5bmNpbmcgZG9uZS4uLlwiKTtcclxuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJ3N5bmNEb25lJyk7XHJcbiAgICAgICAgICAgICAgICBsb2FkaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHN5bmM6IHN5bmNcclxuICAgIH07XHJcblxyXG59KTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
