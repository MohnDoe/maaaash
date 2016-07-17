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
    .run(function($rootScope, $state, $timeout, Login, Blocker, $location) {
        $rootScope.$state = $state;
        $rootScope.Login = Login;
        $rootScope.Blocker = Blocker;

        $rootScope.$on("$stateChangeStart", function(event, next, current) {
            if (next.data.ensureAuthenticate) {
                console.log('Need Authenticated user.');
                if (!$rootScope.Login.isLogged()) {
                    console.log('Dude is not logged');
                    event.preventDefault();
                    // $location.path('/join');
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
angular.module('App').service('Points', function($rootScope, Api) {

	var levels = null;

	function init() {
		Api.call({
			url: 'level',
			callback: function(res) {
				levels = res.data.levels;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbnRyb2xsZXIvYmF0dGxlLmpzIiwiY29udHJvbGxlci9ib3R0b21Vc2VyLmpzIiwiY29udHJvbGxlci9qb2luLmpzIiwiY29udHJvbGxlci9zeW5jLmpzIiwiZmlsdGVyL21lZ2FOdW1iZXIuanMiLCJzZXJ2aWNlL2FwaS5qcyIsInNlcnZpY2UvYmxvY2tlci5qcyIsInNlcnZpY2UvbG9naW4uanMiLCJzZXJ2aWNlL3BvaW50cy5qcyIsInNlcnZpY2Uvc3luYy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiYW5ndWxhci5tb2R1bGUoJ0FwcCcsIFsndGVtcGxhdGVzJywgJ3VpLnJvdXRlcicsICduZ0FuaW1hdGUnLCAnbmdSb3V0ZScsICdhbmd1bGFyTW9tZW50JywgJ2FuZ3VsYXItc3RvcmFnZScsICdhbmd1bGFyLWp3dCddKVxyXG4gICAgLmNvbnN0YW50KCdDb25maWcnLCB7XHJcbiAgICAgICAgYXBpQmFzZTogd2luZG93LmxvY2F0aW9uLnByb3RvY29sICsgXCIvL1wiICsgd2luZG93LmxvY2F0aW9uLmhvc3QgKyBcIi9hcGkvXCJcclxuICAgIH0pXHJcbiAgICAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIsICRzY2VQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIsIGp3dEludGVyY2VwdG9yUHJvdmlkZXIsICRodHRwUHJvdmlkZXIpIHtcclxuXHJcbiAgICAgICAgand0SW50ZXJjZXB0b3JQcm92aWRlci50b2tlbkdldHRlciA9IGZ1bmN0aW9uKHN0b3JlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBzdG9yZS5nZXQoJ2p3dCcpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKCdqd3RJbnRlcmNlcHRvcicpO1xyXG5cclxuICAgICAgICAkc2NlUHJvdmlkZXIuZW5hYmxlZChmYWxzZSk7XHJcbiAgICAgICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xyXG5cclxuICAgICAgICAkc3RhdGVQcm92aWRlclxyXG4gICAgICAgICAgICAuc3RhdGUoJ2pvaW4nLCB7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICcvam9pbicsXHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2pvaW4vaW5kZXguaHRtbCcsXHJcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnSm9pbkN0cmwgYXMgSm9pbicsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5zdXJlQXV0aGVudGljYXRlOiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuc3RhdGUoJ3N5bmMnLCB7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICcvc3luYycsXHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ3N5bmMvaW5kZXguaHRtbCcsXHJcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnU3luY0N0cmwgYXMgU3luYycsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5zdXJlQXV0aGVudGljYXRlOiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5zdGF0ZSgnYmF0dGxlJywge1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnLycsXHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZVVybDogJ2JhdHRsZS9pbmRleC5odG1sJyxcclxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdCYXR0bGVDdHJsIGFzIEJhdHRsZScsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5zdXJlQXV0aGVudGljYXRlOiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoZnVuY3Rpb24oJGluamVjdG9yKSB7XHJcbiAgICAgICAgICAgIHZhciAkc3RhdGU7XHJcbiAgICAgICAgICAgICRzdGF0ZSA9ICRpbmplY3Rvci5nZXQoJyRzdGF0ZScpO1xyXG4gICAgICAgICAgICByZXR1cm4gJHN0YXRlLmdvKCc0MDQnLCBudWxsLCB7XHJcbiAgICAgICAgICAgICAgICBsb2NhdGlvbjogZmFsc2VcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfSlcclxuICAgIC5ydW4oZnVuY3Rpb24oJHJvb3RTY29wZSwgJHN0YXRlLCAkdGltZW91dCwgTG9naW4sIEJsb2NrZXIsICRsb2NhdGlvbikge1xyXG4gICAgICAgICRyb290U2NvcGUuJHN0YXRlID0gJHN0YXRlO1xyXG4gICAgICAgICRyb290U2NvcGUuTG9naW4gPSBMb2dpbjtcclxuICAgICAgICAkcm9vdFNjb3BlLkJsb2NrZXIgPSBCbG9ja2VyO1xyXG5cclxuICAgICAgICAkcm9vdFNjb3BlLiRvbihcIiRzdGF0ZUNoYW5nZVN0YXJ0XCIsIGZ1bmN0aW9uKGV2ZW50LCBuZXh0LCBjdXJyZW50KSB7XHJcbiAgICAgICAgICAgIGlmIChuZXh0LmRhdGEuZW5zdXJlQXV0aGVudGljYXRlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnTmVlZCBBdXRoZW50aWNhdGVkIHVzZXIuJyk7XHJcbiAgICAgICAgICAgICAgICBpZiAoISRyb290U2NvcGUuTG9naW4uaXNMb2dnZWQoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdEdWRlIGlzIG5vdCBsb2dnZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vICRsb2NhdGlvbi5wYXRoKCcvam9pbicpO1xyXG4gICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnam9pbicpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAobmV4dC51cmwgPT0gJy9qb2luJyAmJiAkcm9vdFNjb3BlLkxvZ2luLmlzTG9nZ2VkKCkpIHtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5wYXRoKCcvJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgJHJvb3RTY29wZS5zYWZlQXBwbHkgPSBmdW5jdGlvbiBzYWZlQXBwbHkob3BlcmF0aW9uKSB7XHJcbiAgICAgICAgICAgIHZhciBwaGFzZSA9IHRoaXMuJHJvb3QuJCRwaGFzZTtcclxuICAgICAgICAgICAgaWYgKHBoYXNlICE9PSAnJGFwcGx5JyAmJiBwaGFzZSAhPT0gJyRkaWdlc3QnKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRhcHBseShvcGVyYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAob3BlcmF0aW9uICYmIHR5cGVvZiBvcGVyYXRpb24gPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgIG9wZXJhdGlvbigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcblxyXG5cclxuICAgIH0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKVxyXG5cdC5jb250cm9sbGVyKCdCYXR0bGVDdHJsJywgZnVuY3Rpb24oJHJvb3RTY29wZSwgJHN0YXRlLCBBcGksIExvZ2luLCAkc2NvcGUpIHtcclxuXHJcblx0XHQkc2NvcGUuYmF0dGxlID0gbnVsbDtcclxuXHRcdCRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcclxuXHJcblx0XHQkc2NvcGUuZ2V0TmV3QmF0dGxlID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdCRzY29wZS5sb2FkaW5nID0gdHJ1ZTtcclxuXHRcdFx0JHNjb3BlLmJhdHRsZSA9IG51bGw7XHJcblx0XHRcdEFwaS5jYWxsKHtcclxuXHRcdFx0XHR1cmw6ICd2b3RlL25ldycsXHJcblx0XHRcdFx0Y2FsbGJhY2s6IGZ1bmN0aW9uKHJlcykge1xyXG5cdFx0XHRcdFx0JHNjb3BlLmJhdHRsZSA9IHJlcy5kYXRhLnZvdGU7XHJcblx0XHRcdFx0XHQkc2NvcGUubG9hZGluZyA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0Ly8gY29uc29sZS5sb2coJHNjb3BlLmJhdHRsZSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQkc2NvcGUudm90ZSA9IGZ1bmN0aW9uKHdpbm5lcikge1xyXG5cdFx0XHRBcGkuY2FsbCh7XHJcblx0XHRcdFx0dXJsOiAndm90ZS8nICsgJHNjb3BlLmJhdHRsZS5oYXNoX2lkLFxyXG5cdFx0XHRcdG1ldGhvZDogJ1BVVCcsXHJcblx0XHRcdFx0ZGF0YToge1xyXG5cdFx0XHRcdFx0d2lubmVyOiB3aW5uZXJcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGNhbGxiYWNrOiBmdW5jdGlvbihyZXMpIHtcclxuXHRcdFx0XHRcdGlmIChyZXMuZGF0YS5wb2ludHMpIHtcclxuXHRcdFx0XHRcdFx0JHJvb3RTY29wZS4kZW1pdCgncG9pbnRzQ2hhbmdlZCcsIHJlcy5kYXRhLnBvaW50cyk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHQkc2NvcGUuZ2V0TmV3QmF0dGxlKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KVxyXG5cdFx0fVxyXG5cclxuXHRcdCRzY29wZS5nZXROZXdCYXR0bGUoKTtcclxuXHR9KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJylcclxuXHQuY29udHJvbGxlcignYm90dG9tVXNlckN0cmwnLCBmdW5jdGlvbihMb2dpbiwgJHJvb3RTY29wZSwgJHNjb3BlLCBQb2ludHMpIHtcclxuXHRcdCRzY29wZS51c2VyID0ge307XHJcblxyXG5cdFx0JHNjb3BlLnByb2dyZXNzID0ge1xyXG5cdFx0XHRwb2ludHM6IDAsXHJcblx0XHRcdGxldmVsOiB7XHJcblx0XHRcdFx0Y3VycmVudDogbnVsbCxcclxuXHRcdFx0XHRuZXh0OiBudWxsLFxyXG5cdFx0XHRcdHByb2dyZXNzOiAwXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQkc2NvcGUuaW5pdFVzZXIgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0JHNjb3BlLnVzZXIgPSBMb2dpbi5nZXRVc2VyKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0JHNjb3BlLnVwZGF0ZVBvaW50cyA9IGZ1bmN0aW9uKHBvaW50cykge1xyXG5cdFx0XHQkc2NvcGUucHJvZ3Jlc3MucG9pbnRzID0gcG9pbnRzLnRvdGFsX3BvaW50cztcclxuXHRcdFx0dmFyIGxldmVscyA9IFBvaW50cy5nZXRMZXZlbHNCeVBvaW50cygkc2NvcGUucHJvZ3Jlc3MucG9pbnRzKTtcclxuXHRcdFx0JHNjb3BlLnByb2dyZXNzLmxldmVsLmN1cnJlbnQgPSBsZXZlbHNbMF07XHJcblx0XHRcdCRzY29wZS5wcm9ncmVzcy5sZXZlbC5uZXh0ID0gbGV2ZWxzWzFdO1xyXG5cdFx0XHQkc2NvcGUucHJvZ3Jlc3MubGV2ZWwucHJvZ3Jlc3MgPSBQb2ludHMuZ2V0UGVyY2VudGFnZSgkc2NvcGUucHJvZ3Jlc3MubGV2ZWwuY3VycmVudCwgJHNjb3BlLnByb2dyZXNzLmxldmVsLm5leHQsICRzY29wZS5wcm9ncmVzcy5wb2ludHMpO1xyXG5cdFx0fVxyXG5cclxuXHRcdCRyb290U2NvcGUuJG9uKCdwb2ludHNDaGFuZ2VkJywgZnVuY3Rpb24oZXZlbnQsIHBvaW50cykge1xyXG5cdFx0XHQkc2NvcGUudXBkYXRlUG9pbnRzKHBvaW50cyk7XHJcblx0XHR9KVxyXG5cclxuXHRcdCRyb290U2NvcGUuJG9uKCdzdGF0dXNVcGRhdGVkJywgZnVuY3Rpb24oKSB7XHJcblx0XHRcdCRzY29wZS5pbml0VXNlcigpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0JHNjb3BlLmluaXRVc2VyKCk7XHJcblx0fSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpXHJcblx0LmNvbnRyb2xsZXIoJ0pvaW5DdHJsJywgZnVuY3Rpb24oTG9naW4pIHtcclxuXHRcdHZhciBzY29wZSA9IHRoaXM7XHJcblxyXG5cdFx0c2NvcGUubG9nV2l0aFlvdXR1YmUgPSBMb2dpbi5sb2dXaXRoWW91dHViZTtcclxuXHR9KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJylcclxuXHQuY29udHJvbGxlcignU3luY0N0cmwnLCBmdW5jdGlvbigkcm9vdFNjb3BlLCAkc3RhdGUsIEFwaSwgU3luYywgJGxvY2F0aW9uLCBMb2dpbikge1xyXG5cclxuXHRcdHZhciBzY29wZSA9IHRoaXM7XHJcblxyXG5cclxuXHRcdHNjb3BlLnN5bmMgPSBTeW5jLnN5bmM7XHJcblxyXG5cdFx0aWYgKExvZ2luLmlzTG9nZ2VkKCkpIHtcclxuXHRcdFx0c2NvcGUuc3luYygpO1xyXG5cdFx0fVxyXG5cclxuXHRcdCRyb290U2NvcGUuJG9uKCdzeW5jRG9uZScsIGZ1bmN0aW9uKCkge1xyXG5cdFx0XHQkbG9jYXRpb24ucGF0aCgnLycpO1xyXG5cdFx0fSlcclxuXHR9KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJylcclxuICAgIC5maWx0ZXIoXCJtZWdhTnVtYmVyXCIsICgpID0+IHtcclxuICAgICAgICByZXR1cm4gKG51bWJlciwgZnJhY3Rpb25TaXplKSA9PiB7XHJcblxyXG4gICAgICAgICAgICBpZiAobnVtYmVyID09PSBudWxsKSByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgaWYgKG51bWJlciA9PT0gMCkgcmV0dXJuIFwiMFwiO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFmcmFjdGlvblNpemUgfHwgZnJhY3Rpb25TaXplIDwgMClcclxuICAgICAgICAgICAgICAgIGZyYWN0aW9uU2l6ZSA9IDE7XHJcblxyXG4gICAgICAgICAgICB2YXIgYWJzID0gTWF0aC5hYnMobnVtYmVyKTtcclxuICAgICAgICAgICAgdmFyIHJvdW5kZXIgPSBNYXRoLnBvdygxMCwgZnJhY3Rpb25TaXplKTtcclxuICAgICAgICAgICAgdmFyIGlzTmVnYXRpdmUgPSBudW1iZXIgPCAwO1xyXG4gICAgICAgICAgICB2YXIga2V5ID0gJyc7XHJcbiAgICAgICAgICAgIHZhciBwb3dlcnMgPSBbe1xyXG4gICAgICAgICAgICAgICAga2V5OiBcIlFcIixcclxuICAgICAgICAgICAgICAgIHZhbHVlOiBNYXRoLnBvdygxMCwgMTUpXHJcbiAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgIGtleTogXCJUXCIsXHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogTWF0aC5wb3coMTAsIDEyKVxyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICBrZXk6IFwiQlwiLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6IE1hdGgucG93KDEwLCA5KVxyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICBrZXk6IFwiTVwiLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6IE1hdGgucG93KDEwLCA2KVxyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICBrZXk6IFwiS1wiLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6IDEwMDBcclxuICAgICAgICAgICAgfV07XHJcblxyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBvd2Vycy5sZW5ndGg7IGkrKykge1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciByZWR1Y2VkID0gYWJzIC8gcG93ZXJzW2ldLnZhbHVlO1xyXG5cclxuICAgICAgICAgICAgICAgIHJlZHVjZWQgPSBNYXRoLnJvdW5kKHJlZHVjZWQgKiByb3VuZGVyKSAvIHJvdW5kZXI7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHJlZHVjZWQgPj0gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGFicyA9IHJlZHVjZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAga2V5ID0gcG93ZXJzW2ldLmtleTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIChpc05lZ2F0aXZlID8gJy0nIDogJycpICsgYWJzICsga2V5O1xyXG4gICAgICAgIH07XHJcbiAgICB9KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJykuc2VydmljZSgnQXBpJywgZnVuY3Rpb24oJGh0dHAsICRxLCBDb25maWcsICR0aW1lb3V0LCAvKk5vdGlmaWNhdGlvbnMsKi8gQmxvY2tlciwgJHN0YXRlKSB7XHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUGVyZm9ybSBhbiBBUEkgY2FsbC5cclxuICAgICAqIEBwYXJhbSBvcHRpb25zIHt1cmwsIHBhcmFtcywgZGF0YSwgY2FsbGJhY2ssIG1ldGhvZCwgZXJyb3JIYW5kbGVyIChzaG91bGQgcmV0dXJuIHRydWUpLCB0aW1lb3V0IGluIE1TLCBibG9ja1VJfVxyXG4gICAgICovXHJcbiAgICB0aGlzLmNhbGwgPSBmdW5jdGlvbihvcHRpb25zKSB7XHJcblxyXG4gICAgICAgIHZhciBvcHRpb25zID0gYW5ndWxhci5leHRlbmQoe1xyXG4gICAgICAgICAgICB1cmw6IG51bGwsXHJcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXHJcbiAgICAgICAgICAgIHBhcmFtczogbnVsbCxcclxuICAgICAgICAgICAgZGF0YTogbnVsbCxcclxuICAgICAgICAgICAgY2FsbGJhY2s6IG51bGwsXHJcbiAgICAgICAgICAgIHRpbWVvdXQ6IDMwMDAwLFxyXG4gICAgICAgICAgICBlcnJvckhhbmRsZXI6IG51bGwsXHJcbiAgICAgICAgICAgIGJsb2NrVUk6IHRydWUsXHJcbiAgICAgICAgfSwgb3B0aW9ucyk7XHJcblxyXG4gICAgICAgIHZhciBjYW5jZWxlciA9ICRxLmRlZmVyKCk7XHJcbiAgICAgICAgdmFyIGNhbmNlbFRpbWVvdXQgPSBvcHRpb25zLnRpbWVvdXQgPyAkdGltZW91dChjYW5jZWxlci5yZXNvbHZlLCBvcHRpb25zLnRpbWVvdXQpIDogbnVsbDtcclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuYmxvY2tVSSkge1xyXG4gICAgICAgICAgICBCbG9ja2VyLmJsb2NrKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgdXJsID0gb3B0aW9ucy51cmwuaW5kZXhPZignaHR0cCcpID09IDAgPyBvcHRpb25zLnVybCA6IENvbmZpZy5hcGlCYXNlICsgb3B0aW9ucy51cmw7XHJcblxyXG4gICAgICAgICRodHRwKHtcclxuICAgICAgICAgICAgdXJsOiB1cmwsXHJcbiAgICAgICAgICAgIG1ldGhvZDogb3B0aW9ucy5tZXRob2QsXHJcbiAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMsXHJcbiAgICAgICAgICAgIGRhdGE6IG9wdGlvbnMuZGF0YSxcclxuICAgICAgICAgICAgdGltZW91dDogY2FuY2VsZXIucHJvbWlzZVxyXG4gICAgICAgIH0pLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAkdGltZW91dC5jYW5jZWwoY2FuY2VsVGltZW91dCk7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5jYWxsYmFjayA9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICBvcHRpb25zLmNhbGxiYWNrKGRhdGEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmJsb2NrVUkpIHtcclxuICAgICAgICAgICAgICAgIEJsb2NrZXIudW5ibG9jaygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSkuZXJyb3IoZnVuY3Rpb24obWVzc2FnZSwgc3RhdHVzKSB7XHJcbiAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChjYW5jZWxUaW1lb3V0KTtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmVycm9ySGFuZGxlciA9PSAnZnVuY3Rpb24nICYmIG9wdGlvbnMuZXJyb3JIYW5kbGVyKG1lc3NhZ2UsIHN0YXR1cykpIHtcclxuICAgICAgICAgICAgICAgIC8vRXJyb3Igd2FzIGhhbmRsZWQgYnkgdGhlIGN1c3RvbSBlcnJvciBoYW5kbGVyXHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghc3RhdHVzKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkVycm9yIHdpdGhvdXQgc3RhdHVzOyByZXF1ZXN0IGFib3J0ZWQ/XCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChzdGF0dXMgPT0gNDAxKSB7XHJcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2pvaW4nKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gTm90aWZpY2F0aW9ucy5hZGQoXCJFcnJvciBcIiArIHN0YXR1cywgbWVzc2FnZSk7XHJcblxyXG4gICAgICAgICAgICBpZiAob3B0aW9ucy5ibG9ja1VJKSB7XHJcbiAgICAgICAgICAgICAgICBCbG9ja2VyLnVuYmxvY2soKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgY2FuY2VsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIGNhbmNlbGVyLnJlc29sdmUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgfTtcclxuXHJcbn0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKS5zZXJ2aWNlKCdCbG9ja2VyJywgZnVuY3Rpb24oJHJvb3RTY29wZSkge1xyXG5cclxuICAgIHRoaXMuYmxvY2tVSSA9IGZhbHNlO1xyXG4gICAgdGhpcy5ibG9ja0NvdW50ID0gMDtcclxuICAgIHRoaXMubmFtZWRCbG9ja3MgPSBbXTtcclxuICAgIHRoaXMuekluZGV4ID0gMTAwMDAwMDA7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgZnVuY3Rpb24gY2FsY1pJbmRleCgpIHtcclxuXHJcbiAgICAgICAgaWYgKCF0aGF0Lm5hbWVkQmxvY2tzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICB0aGF0LnpJbmRleCA9IDEwMDAwMDAwO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoYXQuekluZGV4ID0gMDtcclxuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHRoYXQubmFtZWRCbG9ja3MsIGZ1bmN0aW9uKGJsb2NrLCBpbmRleCkge1xyXG4gICAgICAgICAgICAgICAgdGhhdC56SW5kZXggPSBibG9jay56SW5kZXggPiB0aGF0LnpJbmRleCA/IGJsb2NrLnpJbmRleCA6IHRoYXQuekluZGV4O1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5ibG9jayA9IGZ1bmN0aW9uKG5hbWUsIHpJbmRleCkge1xyXG5cclxuICAgICAgICBpZiAobmFtZSkge1xyXG4gICAgICAgICAgICAvL3RvZG86IG1heWJlIGp1c3QgYW4gb2JqZWN0IHdpdGggbmFtZSBmb3Iga2V5cyAoYnV0IHRoZW4gbGVuZ3RoIHdvdWxkIGJlIGFuIGlzc3VlKVxyXG4gICAgICAgICAgICB0aGF0Lm5hbWVkQmxvY2tzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgbmFtZTogbmFtZSxcclxuICAgICAgICAgICAgICAgIHpJbmRleDogekluZGV4XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoYXQuYmxvY2tDb3VudCsrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY2FsY1pJbmRleCgpO1xyXG4gICAgICAgIHRoYXQuYmxvY2tVSSA9IHRoYXQuYmxvY2tDb3VudCA+IDAgfHwgdGhhdC5uYW1lZEJsb2Nrcy5sZW5ndGggPiAwO1xyXG4gICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnYmxvY2tlci51cGRhdGVCbG9ja2VyJyk7XHJcblxyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLnVuYmxvY2sgPSBmdW5jdGlvbihuYW1lKSB7XHJcblxyXG4gICAgICAgIGlmIChuYW1lKSB7XHJcbiAgICAgICAgICAgIHZhciBkb25lID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCh0aGF0Lm5hbWVkQmxvY2tzLCBmdW5jdGlvbihibG9jaywgaW5kZXgpIHtcclxuICAgICAgICAgICAgICAgIGlmIChibG9jay5uYW1lID09IG5hbWUgJiYgIWRvbmUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0Lm5hbWVkQmxvY2tzLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZG9uZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoYXQuYmxvY2tDb3VudC0tO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhhdC5ibG9ja1VJID0gdGhhdC5ibG9ja0NvdW50ID4gMCB8fCB0aGF0Lm5hbWVkQmxvY2tzLmxlbmd0aCA+IDA7XHJcbiAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdibG9ja2VyLnVwZGF0ZUJsb2NrZXInKTtcclxuXHJcbiAgICB9O1xyXG5cclxuXHJcbn0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKS5zZXJ2aWNlKCdMb2dpbicsIGZ1bmN0aW9uKCRyb290U2NvcGUsICRpbnRlcnZhbCwgQXBpLCAkbG9jYXRpb24sIHN0b3JlKSB7XHJcblxyXG4gICAgdmFyIHVzZXIgPSBudWxsO1xyXG4gICAgdmFyIHN0YXR1cyA9ICdub3Rjb25uZWN0ZWQnO1xyXG4gICAgdmFyIGNyZWRpdHMgPSBudWxsO1xyXG4gICAgdmFyIEpXVCA9IG51bGw7XHJcbiAgICB2YXIgbG9hZGVkID0gZmFsc2U7XHJcblxyXG4gICAgZnVuY3Rpb24gdXBkYXRlU3RhdHVzKGFmdGVyTG9naW4pIHtcclxuICAgICAgICB2YXIgYWZ0ZXJMb2dpbiA9IGFmdGVyTG9naW47XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1VwZGF0aW5nIHN0YXR1cyEnKTtcclxuICAgICAgICBBcGkuY2FsbCh7XHJcbiAgICAgICAgICAgIHVybDogJ3VzZXIvc3RhdHVzJyxcclxuICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgdXNlciA9IGRhdGEuZGF0YS51c2VyIHx8IG51bGw7XHJcbiAgICAgICAgICAgICAgICBzdGF0dXMgPSBkYXRhLmRhdGEuc3RhdHVzO1xyXG4gICAgICAgICAgICAgICAgbG9hZGVkID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBKV1QgPSBkYXRhLmRhdGEuand0X3Rva2VuO1xyXG4gICAgICAgICAgICAgICAgc3RvcmUuc2V0KCdqd3QnLCBkYXRhLmRhdGEuand0X3Rva2VuKTtcclxuXHJcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCdzdGF0dXNVcGRhdGVkJyk7XHJcbiAgICAgICAgICAgICAgICBpZiAoYWZ0ZXJMb2dpbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGF0dXMgPT0gJ2Nvbm5lY3RlZCcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHVzZXIubGFzdF9zeW5jZWQgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJ3N1Y2Nlc3NmdWxseVNpZ25lZFVwJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJ3N1Y2Nlc3NmdWxseUxvZ2dlZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnZmFpbGVkTG9naW4nKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVTdGF0dXMoKTtcclxuXHJcbiAgICAkcm9vdFNjb3BlLiRvbignc3VjY2Vzc2Z1bGx5TG9nZ2VkJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ3N1Y2Nlc3NmdWxseUxvZ2dlZCcpO1xyXG4gICAgICAgICRsb2NhdGlvbi5wYXRoKCcvJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAkcm9vdFNjb3BlLiRvbignc3VjY2Vzc2Z1bGx5U2lnbmVkVXAnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnc3VjY2Vzc2Z1bGx5U2lnbmVkVXAnKTtcclxuICAgICAgICAkbG9jYXRpb24ucGF0aCgnL3N5bmMnKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGZ1bmN0aW9uIGxvZ1dpdGhZb3V0dWJlKCkge1xyXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwiTG9naW4gd2l0aCB5b3V0dWJlXCIpO1xyXG4gICAgICAgIHZhciBwb3B1cCA9IHdpbmRvdy5vcGVuKFwiYXV0aC95b3V0dWJlXCIsICdzb2NpYWxMb2dpbicsICd3aWR0aD00NTAsaGVpZ2h0PTYwMCxsb2NhdGlvbj0wLG1lbnViYXI9MCxyZXNpemFibGU9MSxzY3JvbGxiYXJzPTAsc3RhdHVzPTAsdGl0bGViYXI9MCx0b29sYmFyPTAnKTtcclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgcG9wdXAuZm9jdXMoKTtcclxuXHJcbiAgICAgICAgICAgIHZhciBwb3B1cEludGVydmFsID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFwb3B1cCB8fCBwb3B1cC5jbG9zZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVTdGF0dXModHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgJGludGVydmFsLmNhbmNlbChwb3B1cEludGVydmFsKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSwgMjAwKTtcclxuICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgIGFsZXJ0KFwiSXQgbG9va3MgbGlrZSB5b3UgYXJlIHVzaW5nIGEgcG9wdXAgYmxvY2tlci4gUGxlYXNlIGFsbG93IHRoaXMgb25lIGluIG9yZGVyIHRvIGxvZ2luLiBUaGFua3MhXCIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBpc0xvZ2dlZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBqd3QgPSBzdG9yZS5nZXQoJ2p3dCcpO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhqd3QpO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyghIWp3dCAmJiBqd3QgIT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGp3dCAhPSAndW5kZWZpbmVkJylcclxuICAgICAgICAgICAgcmV0dXJuICghIWp3dCAmJiBqd3QgIT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGp3dCAhPSAndW5kZWZpbmVkJyk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBsb2dPdXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBBcGkuY2FsbCh7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICdsb2dpbi9sb2dvdXQnLFxyXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAncG9zdCcsXHJcbiAgICAgICAgICAgICAgICBjYWxsYmFjazogdXBkYXRlU3RhdHVzXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfSxcclxuICAgICAgICB1cGRhdGVTdGF0dXM6IHVwZGF0ZVN0YXR1cyxcclxuICAgICAgICBsb2dXaXRoWW91dHViZTogbG9nV2l0aFlvdXR1YmUsXHJcbiAgICAgICAgZ2V0VXNlcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB1c2VyO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaXNMb2FkZWQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbG9hZGVkO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG59KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJykuc2VydmljZSgnUG9pbnRzJywgZnVuY3Rpb24oJHJvb3RTY29wZSwgQXBpKSB7XHJcblxyXG5cdHZhciBsZXZlbHMgPSBudWxsO1xyXG5cclxuXHRmdW5jdGlvbiBpbml0KCkge1xyXG5cdFx0QXBpLmNhbGwoe1xyXG5cdFx0XHR1cmw6ICdsZXZlbCcsXHJcblx0XHRcdGNhbGxiYWNrOiBmdW5jdGlvbihyZXMpIHtcclxuXHRcdFx0XHRsZXZlbHMgPSByZXMuZGF0YS5sZXZlbHM7XHJcblx0XHRcdH1cclxuXHRcdH0pXHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBnZXRMZXZlbHNCeVBvaW50cyhwb2ludHMpIHtcclxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbGV2ZWxzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGxldmVsID0gbGV2ZWxzW2ldO1xyXG5cdFx0XHRpZiAobGV2ZWwucG9pbnRzID49IHBvaW50cykge1xyXG5cdFx0XHRcdHJldHVybiBbbGV2ZWxzW2kgLSAxXSwgbGV2ZWxzW2ldXTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIFtsZXZlbHNbMV0sIGxldmVsc1syXV07XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBnZXRQZXJjZW50YWdlKGN1cnJlbnRMZXZlbCwgbmV4dExldmVsLCBwb2ludHMpIHtcclxuXHRcdHJldHVybiAoKHBvaW50cyAtIGN1cnJlbnRMZXZlbC5wb2ludHMpIC8gKG5leHRMZXZlbC5wb2ludHMgLSBjdXJyZW50TGV2ZWwucG9pbnRzKSkgKiAxMDA7XHJcblx0fVxyXG5cdGluaXQoKTtcclxuXHRyZXR1cm4ge1xyXG5cdFx0Z2V0TGV2ZWxzQnlQb2ludHM6IGdldExldmVsc0J5UG9pbnRzLFxyXG5cdFx0Z2V0UGVyY2VudGFnZTogZ2V0UGVyY2VudGFnZSxcclxuXHR9O1xyXG5cclxufSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpLnNlcnZpY2UoJ1N5bmMnLCBmdW5jdGlvbigkcm9vdFNjb3BlLCAkaW50ZXJ2YWwsIEFwaSkge1xyXG5cclxuICAgIHZhciBsb2FkaW5nID0gZmFsc2U7XHJcblxyXG4gICAgZnVuY3Rpb24gc3luYygpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnU3luY2luZyBjaGFubmVscy4uLicpO1xyXG4gICAgICAgIGxvYWRpbmcgPSB0cnVlO1xyXG4gICAgICAgIEFwaS5jYWxsKHtcclxuICAgICAgICAgICAgdXJsOiAndXNlci9zeW5jJyxcclxuICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU3luY2luZyBkb25lLi4uXCIpO1xyXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnc3luY0RvbmUnKTtcclxuICAgICAgICAgICAgICAgIGxvYWRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgc3luYzogc3luY1xyXG4gICAgfTtcclxuXHJcbn0pOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
