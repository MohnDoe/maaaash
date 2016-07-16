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
					console.log(res);
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
            url: 'user/',
            callback: function(data) {
                // console.log(data);
                user = data.data.user || null;
                status = data.data.status;
                loaded = true;
                console.log(user);

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbnRyb2xsZXIvYmF0dGxlLmpzIiwiY29udHJvbGxlci9ib3R0b21Vc2VyLmpzIiwiY29udHJvbGxlci9qb2luLmpzIiwiY29udHJvbGxlci9zeW5jLmpzIiwic2VydmljZS9hcGkuanMiLCJzZXJ2aWNlL2Jsb2NrZXIuanMiLCJzZXJ2aWNlL2xvZ2luLmpzIiwic2VydmljZS9zeW5jLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJhbmd1bGFyLm1vZHVsZSgnQXBwJywgWyd0ZW1wbGF0ZXMnLCAndWkucm91dGVyJywgJ25nQW5pbWF0ZScsICduZ1JvdXRlJywgJ2FuZ3VsYXJNb21lbnQnLCAnYW5ndWxhci1zdG9yYWdlJywgJ2FuZ3VsYXItand0J10pXHJcbiAgICAuY29uc3RhbnQoJ0NvbmZpZycsIHtcclxuICAgICAgICBhcGlCYXNlOiB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyB3aW5kb3cubG9jYXRpb24uaG9zdCArIFwiL2FwaS9cIlxyXG4gICAgfSlcclxuICAgIC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIsICR1cmxSb3V0ZXJQcm92aWRlciwgJHNjZVByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlciwgand0SW50ZXJjZXB0b3JQcm92aWRlciwgJGh0dHBQcm92aWRlcikge1xyXG5cclxuICAgICAgICBqd3RJbnRlcmNlcHRvclByb3ZpZGVyLnRva2VuR2V0dGVyID0gZnVuY3Rpb24oc3RvcmUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHN0b3JlLmdldCgnand0Jyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goJ2p3dEludGVyY2VwdG9yJyk7XHJcblxyXG4gICAgICAgICRzY2VQcm92aWRlci5lbmFibGVkKGZhbHNlKTtcclxuICAgICAgICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XHJcblxyXG4gICAgICAgICRzdGF0ZVByb3ZpZGVyXHJcbiAgICAgICAgICAgIC5zdGF0ZSgnam9pbicsIHtcclxuICAgICAgICAgICAgICAgIHVybDogJy9qb2luJyxcclxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnam9pbi9pbmRleC5odG1sJyxcclxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdKb2luQ3RybCBhcyBKb2luJyxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICBlbnN1cmVBdXRoZW50aWNhdGU6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5zdGF0ZSgnc3luYycsIHtcclxuICAgICAgICAgICAgICAgIHVybDogJy9zeW5jJyxcclxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnc3luYy9pbmRleC5odG1sJyxcclxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdTeW5jQ3RybCBhcyBTeW5jJyxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICBlbnN1cmVBdXRoZW50aWNhdGU6IHRydWVcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLnN0YXRlKCdiYXR0bGUnLCB7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICcvJyxcclxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnYmF0dGxlL2luZGV4Lmh0bWwnLFxyXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0JhdHRsZUN0cmwgYXMgQmF0dGxlJyxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICBlbnN1cmVBdXRoZW50aWNhdGU6IHRydWVcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZShmdW5jdGlvbigkaW5qZWN0b3IpIHtcclxuICAgICAgICAgICAgdmFyICRzdGF0ZTtcclxuICAgICAgICAgICAgJHN0YXRlID0gJGluamVjdG9yLmdldCgnJHN0YXRlJyk7XHJcbiAgICAgICAgICAgIHJldHVybiAkc3RhdGUuZ28oJzQwNCcsIG51bGwsIHtcclxuICAgICAgICAgICAgICAgIGxvY2F0aW9uOiBmYWxzZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9KVxyXG4gICAgLnJ1bihmdW5jdGlvbigkcm9vdFNjb3BlLCAkc3RhdGUsICR0aW1lb3V0LCBMb2dpbiwgQmxvY2tlciwgJGxvY2F0aW9uKSB7XHJcbiAgICAgICAgJHJvb3RTY29wZS4kc3RhdGUgPSAkc3RhdGU7XHJcbiAgICAgICAgJHJvb3RTY29wZS5Mb2dpbiA9IExvZ2luO1xyXG4gICAgICAgICRyb290U2NvcGUuQmxvY2tlciA9IEJsb2NrZXI7XHJcblxyXG4gICAgICAgICRyb290U2NvcGUuJG9uKFwiJHN0YXRlQ2hhbmdlU3RhcnRcIiwgZnVuY3Rpb24oZXZlbnQsIG5leHQsIGN1cnJlbnQpIHtcclxuICAgICAgICAgICAgaWYgKG5leHQuZGF0YS5lbnN1cmVBdXRoZW50aWNhdGUpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdOZWVkIEF1dGhlbnRpY2F0ZWQgdXNlci4nKTtcclxuICAgICAgICAgICAgICAgIGlmICghJHJvb3RTY29wZS5Mb2dpbi5pc0xvZ2dlZCgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0R1ZGUgaXMgbm90IGxvZ2dlZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gJGxvY2F0aW9uLnBhdGgoJy9qb2luJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdqb2luJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChuZXh0LnVybCA9PSAnL2pvaW4nICYmICRyb290U2NvcGUuTG9naW4uaXNMb2dnZWQoKSkge1xyXG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnBhdGgoJy8nKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkcm9vdFNjb3BlLnNhZmVBcHBseSA9IGZ1bmN0aW9uIHNhZmVBcHBseShvcGVyYXRpb24pIHtcclxuICAgICAgICAgICAgdmFyIHBoYXNlID0gdGhpcy4kcm9vdC4kJHBoYXNlO1xyXG4gICAgICAgICAgICBpZiAocGhhc2UgIT09ICckYXBwbHknICYmIHBoYXNlICE9PSAnJGRpZ2VzdCcpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGFwcGx5KG9wZXJhdGlvbik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChvcGVyYXRpb24gJiYgdHlwZW9mIG9wZXJhdGlvbiA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgb3BlcmF0aW9uKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuXHJcblxyXG4gICAgfSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpXHJcblx0LmNvbnRyb2xsZXIoJ0JhdHRsZUN0cmwnLCBmdW5jdGlvbigkcm9vdFNjb3BlLCAkc3RhdGUsIEFwaSwgTG9naW4sICRzY29wZSkge1xyXG5cclxuXHRcdCRzY29wZS5iYXR0bGUgPSBudWxsO1xyXG5cdFx0JHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xyXG5cclxuXHRcdCRzY29wZS5nZXROZXdCYXR0bGUgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0JHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xyXG5cdFx0XHQkc2NvcGUuYmF0dGxlID0gbnVsbDtcclxuXHRcdFx0QXBpLmNhbGwoe1xyXG5cdFx0XHRcdHVybDogJ3ZvdGUvbmV3JyxcclxuXHRcdFx0XHRjYWxsYmFjazogZnVuY3Rpb24ocmVzKSB7XHJcblx0XHRcdFx0XHQkc2NvcGUuYmF0dGxlID0gcmVzLmRhdGEudm90ZTtcclxuXHRcdFx0XHRcdCRzY29wZS5sb2FkaW5nID0gZmFsc2U7XHJcblx0XHRcdFx0XHQvLyBjb25zb2xlLmxvZygkc2NvcGUuYmF0dGxlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdCRzY29wZS52b3RlID0gZnVuY3Rpb24od2lubmVyKSB7XHJcblx0XHRcdEFwaS5jYWxsKHtcclxuXHRcdFx0XHR1cmw6ICd2b3RlLycgKyAkc2NvcGUuYmF0dGxlLmhhc2hfaWQsXHJcblx0XHRcdFx0bWV0aG9kOiAnUFVUJyxcclxuXHRcdFx0XHRkYXRhOiB7XHJcblx0XHRcdFx0XHR3aW5uZXI6IHdpbm5lclxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0Y2FsbGJhY2s6IGZ1bmN0aW9uKHJlcykge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2cocmVzKTtcclxuXHRcdFx0XHRcdGlmIChyZXMuZGF0YS5wb2ludHMpIHtcclxuXHRcdFx0XHRcdFx0JHJvb3RTY29wZS4kZW1pdCgncG9pbnRzQ2hhbmdlZCcsIHJlcy5kYXRhLnBvaW50cyk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHQkc2NvcGUuZ2V0TmV3QmF0dGxlKCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KVxyXG5cdFx0fVxyXG5cclxuXHRcdCRzY29wZS5nZXROZXdCYXR0bGUoKTtcclxuXHR9KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJylcclxuXHQuY29udHJvbGxlcignYm90dG9tVXNlckN0cmwnLCBmdW5jdGlvbihMb2dpbiwgJHJvb3RTY29wZSwgJHNjb3BlKSB7XHJcblx0XHQkc2NvcGUudXNlciA9IG51bGw7XHJcblxyXG5cdFx0JHNjb3BlLmluaXRVc2VyID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdCRzY29wZS51c2VyID0gTG9naW4uZ2V0VXNlcigpO1xyXG5cdFx0fVxyXG5cclxuXHRcdCRyb290U2NvcGUuJG9uKCdwb2ludHNDaGFuZ2VkJywgZnVuY3Rpb24oZXZlbnQsIHBvaW50cykge1xyXG5cdFx0XHQkc2NvcGUudXNlci5wb2ludHMgPSBwb2ludHMudG90YWxfcG9pbnRzO1xyXG5cdFx0XHRjb25zb2xlLmxvZygkc2NvcGUudXNlci5wb2ludHMpO1xyXG5cdFx0fSlcclxuXHJcblxyXG5cclxuXHRcdCRyb290U2NvcGUuJG9uKCdzdGF0dXNVcGRhdGVkJywgZnVuY3Rpb24oKSB7XHJcblx0XHRcdCRzY29wZS5pbml0VXNlcigpO1xyXG5cdFx0fSk7XHJcblx0fSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpXHJcblx0LmNvbnRyb2xsZXIoJ0pvaW5DdHJsJywgZnVuY3Rpb24oTG9naW4pIHtcclxuXHRcdHZhciBzY29wZSA9IHRoaXM7XHJcblxyXG5cdFx0c2NvcGUubG9nV2l0aFlvdXR1YmUgPSBMb2dpbi5sb2dXaXRoWW91dHViZTtcclxuXHR9KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJylcclxuXHQuY29udHJvbGxlcignU3luY0N0cmwnLCBmdW5jdGlvbigkcm9vdFNjb3BlLCAkc3RhdGUsIEFwaSwgU3luYywgJGxvY2F0aW9uLCBMb2dpbikge1xyXG5cclxuXHRcdHZhciBzY29wZSA9IHRoaXM7XHJcblxyXG5cclxuXHRcdHNjb3BlLnN5bmMgPSBTeW5jLnN5bmM7XHJcblxyXG5cdFx0aWYgKExvZ2luLmlzTG9nZ2VkKCkpIHtcclxuXHRcdFx0c2NvcGUuc3luYygpO1xyXG5cdFx0fVxyXG5cclxuXHRcdCRyb290U2NvcGUuJG9uKCdzeW5jRG9uZScsIGZ1bmN0aW9uKCkge1xyXG5cdFx0XHQkbG9jYXRpb24ucGF0aCgnLycpO1xyXG5cdFx0fSlcclxuXHR9KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJykuc2VydmljZSgnQXBpJywgZnVuY3Rpb24oJGh0dHAsICRxLCBDb25maWcsICR0aW1lb3V0LCAvKk5vdGlmaWNhdGlvbnMsKi8gQmxvY2tlciwgJHN0YXRlKSB7XHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUGVyZm9ybSBhbiBBUEkgY2FsbC5cclxuICAgICAqIEBwYXJhbSBvcHRpb25zIHt1cmwsIHBhcmFtcywgZGF0YSwgY2FsbGJhY2ssIG1ldGhvZCwgZXJyb3JIYW5kbGVyIChzaG91bGQgcmV0dXJuIHRydWUpLCB0aW1lb3V0IGluIE1TLCBibG9ja1VJfVxyXG4gICAgICovXHJcbiAgICB0aGlzLmNhbGwgPSBmdW5jdGlvbihvcHRpb25zKSB7XHJcblxyXG4gICAgICAgIHZhciBvcHRpb25zID0gYW5ndWxhci5leHRlbmQoe1xyXG4gICAgICAgICAgICB1cmw6IG51bGwsXHJcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXHJcbiAgICAgICAgICAgIHBhcmFtczogbnVsbCxcclxuICAgICAgICAgICAgZGF0YTogbnVsbCxcclxuICAgICAgICAgICAgY2FsbGJhY2s6IG51bGwsXHJcbiAgICAgICAgICAgIHRpbWVvdXQ6IDMwMDAwLFxyXG4gICAgICAgICAgICBlcnJvckhhbmRsZXI6IG51bGwsXHJcbiAgICAgICAgICAgIGJsb2NrVUk6IHRydWUsXHJcbiAgICAgICAgfSwgb3B0aW9ucyk7XHJcblxyXG4gICAgICAgIHZhciBjYW5jZWxlciA9ICRxLmRlZmVyKCk7XHJcbiAgICAgICAgdmFyIGNhbmNlbFRpbWVvdXQgPSBvcHRpb25zLnRpbWVvdXQgPyAkdGltZW91dChjYW5jZWxlci5yZXNvbHZlLCBvcHRpb25zLnRpbWVvdXQpIDogbnVsbDtcclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuYmxvY2tVSSkge1xyXG4gICAgICAgICAgICBCbG9ja2VyLmJsb2NrKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgdXJsID0gb3B0aW9ucy51cmwuaW5kZXhPZignaHR0cCcpID09IDAgPyBvcHRpb25zLnVybCA6IENvbmZpZy5hcGlCYXNlICsgb3B0aW9ucy51cmw7XHJcblxyXG4gICAgICAgICRodHRwKHtcclxuICAgICAgICAgICAgdXJsOiB1cmwsXHJcbiAgICAgICAgICAgIG1ldGhvZDogb3B0aW9ucy5tZXRob2QsXHJcbiAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMsXHJcbiAgICAgICAgICAgIGRhdGE6IG9wdGlvbnMuZGF0YSxcclxuICAgICAgICAgICAgdGltZW91dDogY2FuY2VsZXIucHJvbWlzZVxyXG4gICAgICAgIH0pLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAkdGltZW91dC5jYW5jZWwoY2FuY2VsVGltZW91dCk7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5jYWxsYmFjayA9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICBvcHRpb25zLmNhbGxiYWNrKGRhdGEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmJsb2NrVUkpIHtcclxuICAgICAgICAgICAgICAgIEJsb2NrZXIudW5ibG9jaygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSkuZXJyb3IoZnVuY3Rpb24obWVzc2FnZSwgc3RhdHVzKSB7XHJcbiAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChjYW5jZWxUaW1lb3V0KTtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmVycm9ySGFuZGxlciA9PSAnZnVuY3Rpb24nICYmIG9wdGlvbnMuZXJyb3JIYW5kbGVyKG1lc3NhZ2UsIHN0YXR1cykpIHtcclxuICAgICAgICAgICAgICAgIC8vRXJyb3Igd2FzIGhhbmRsZWQgYnkgdGhlIGN1c3RvbSBlcnJvciBoYW5kbGVyXHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghc3RhdHVzKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkVycm9yIHdpdGhvdXQgc3RhdHVzOyByZXF1ZXN0IGFib3J0ZWQ/XCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChzdGF0dXMgPT0gNDAxKSB7XHJcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2pvaW4nKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gTm90aWZpY2F0aW9ucy5hZGQoXCJFcnJvciBcIiArIHN0YXR1cywgbWVzc2FnZSk7XHJcblxyXG4gICAgICAgICAgICBpZiAob3B0aW9ucy5ibG9ja1VJKSB7XHJcbiAgICAgICAgICAgICAgICBCbG9ja2VyLnVuYmxvY2soKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgY2FuY2VsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIGNhbmNlbGVyLnJlc29sdmUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgfTtcclxuXHJcbn0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKS5zZXJ2aWNlKCdCbG9ja2VyJywgZnVuY3Rpb24oJHJvb3RTY29wZSkge1xyXG5cclxuICAgIHRoaXMuYmxvY2tVSSA9IGZhbHNlO1xyXG4gICAgdGhpcy5ibG9ja0NvdW50ID0gMDtcclxuICAgIHRoaXMubmFtZWRCbG9ja3MgPSBbXTtcclxuICAgIHRoaXMuekluZGV4ID0gMTAwMDAwMDA7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgZnVuY3Rpb24gY2FsY1pJbmRleCgpIHtcclxuXHJcbiAgICAgICAgaWYgKCF0aGF0Lm5hbWVkQmxvY2tzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICB0aGF0LnpJbmRleCA9IDEwMDAwMDAwO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoYXQuekluZGV4ID0gMDtcclxuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHRoYXQubmFtZWRCbG9ja3MsIGZ1bmN0aW9uKGJsb2NrLCBpbmRleCkge1xyXG4gICAgICAgICAgICAgICAgdGhhdC56SW5kZXggPSBibG9jay56SW5kZXggPiB0aGF0LnpJbmRleCA/IGJsb2NrLnpJbmRleCA6IHRoYXQuekluZGV4O1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5ibG9jayA9IGZ1bmN0aW9uKG5hbWUsIHpJbmRleCkge1xyXG5cclxuICAgICAgICBpZiAobmFtZSkge1xyXG4gICAgICAgICAgICAvL3RvZG86IG1heWJlIGp1c3QgYW4gb2JqZWN0IHdpdGggbmFtZSBmb3Iga2V5cyAoYnV0IHRoZW4gbGVuZ3RoIHdvdWxkIGJlIGFuIGlzc3VlKVxyXG4gICAgICAgICAgICB0aGF0Lm5hbWVkQmxvY2tzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgbmFtZTogbmFtZSxcclxuICAgICAgICAgICAgICAgIHpJbmRleDogekluZGV4XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoYXQuYmxvY2tDb3VudCsrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY2FsY1pJbmRleCgpO1xyXG4gICAgICAgIHRoYXQuYmxvY2tVSSA9IHRoYXQuYmxvY2tDb3VudCA+IDAgfHwgdGhhdC5uYW1lZEJsb2Nrcy5sZW5ndGggPiAwO1xyXG4gICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnYmxvY2tlci51cGRhdGVCbG9ja2VyJyk7XHJcblxyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLnVuYmxvY2sgPSBmdW5jdGlvbihuYW1lKSB7XHJcblxyXG4gICAgICAgIGlmIChuYW1lKSB7XHJcbiAgICAgICAgICAgIHZhciBkb25lID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCh0aGF0Lm5hbWVkQmxvY2tzLCBmdW5jdGlvbihibG9jaywgaW5kZXgpIHtcclxuICAgICAgICAgICAgICAgIGlmIChibG9jay5uYW1lID09IG5hbWUgJiYgIWRvbmUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0Lm5hbWVkQmxvY2tzLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZG9uZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoYXQuYmxvY2tDb3VudC0tO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhhdC5ibG9ja1VJID0gdGhhdC5ibG9ja0NvdW50ID4gMCB8fCB0aGF0Lm5hbWVkQmxvY2tzLmxlbmd0aCA+IDA7XHJcbiAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdibG9ja2VyLnVwZGF0ZUJsb2NrZXInKTtcclxuXHJcbiAgICB9O1xyXG5cclxuXHJcbn0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKS5zZXJ2aWNlKCdMb2dpbicsIGZ1bmN0aW9uKCRyb290U2NvcGUsICRpbnRlcnZhbCwgQXBpLCAkbG9jYXRpb24sIHN0b3JlKSB7XHJcblxyXG4gICAgdmFyIHVzZXIgPSBudWxsO1xyXG4gICAgdmFyIHN0YXR1cyA9ICdub3Rjb25uZWN0ZWQnO1xyXG4gICAgdmFyIGNyZWRpdHMgPSBudWxsO1xyXG4gICAgdmFyIEpXVCA9IG51bGw7XHJcbiAgICB2YXIgbG9hZGVkID0gZmFsc2U7XHJcblxyXG4gICAgZnVuY3Rpb24gdXBkYXRlU3RhdHVzKGFmdGVyTG9naW4pIHtcclxuICAgICAgICB2YXIgYWZ0ZXJMb2dpbiA9IGFmdGVyTG9naW47XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1VwZGF0aW5nIHN0YXR1cyEnKTtcclxuICAgICAgICBBcGkuY2FsbCh7XHJcbiAgICAgICAgICAgIHVybDogJ3VzZXIvJyxcclxuICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgdXNlciA9IGRhdGEuZGF0YS51c2VyIHx8IG51bGw7XHJcbiAgICAgICAgICAgICAgICBzdGF0dXMgPSBkYXRhLmRhdGEuc3RhdHVzO1xyXG4gICAgICAgICAgICAgICAgbG9hZGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKHVzZXIpO1xyXG5cclxuICAgICAgICAgICAgICAgIEpXVCA9IGRhdGEuZGF0YS5qd3RfdG9rZW47XHJcbiAgICAgICAgICAgICAgICBzdG9yZS5zZXQoJ2p3dCcsIGRhdGEuZGF0YS5qd3RfdG9rZW4pO1xyXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnc3RhdHVzVXBkYXRlZCcpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGFmdGVyTG9naW4pIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdHVzID09ICdjb25uZWN0ZWQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh1c2VyLmxhc3Rfc3luY2VkID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCdzdWNjZXNzZnVsbHlTaWduZWRVcCcpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCdzdWNjZXNzZnVsbHlMb2dnZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJ2ZhaWxlZExvZ2luJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlU3RhdHVzKCk7XHJcblxyXG4gICAgJHJvb3RTY29wZS4kb24oJ3N1Y2Nlc3NmdWxseUxvZ2dlZCcsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdzdWNjZXNzZnVsbHlMb2dnZWQnKTtcclxuICAgICAgICAkbG9jYXRpb24ucGF0aCgnLycpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgJHJvb3RTY29wZS4kb24oJ3N1Y2Nlc3NmdWxseVNpZ25lZFVwJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ3N1Y2Nlc3NmdWxseVNpZ25lZFVwJyk7XHJcbiAgICAgICAgJGxvY2F0aW9uLnBhdGgoJy9zeW5jJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBmdW5jdGlvbiBsb2dXaXRoWW91dHViZSgpIHtcclxuICAgICAgICAvLyBjb25zb2xlLmxvZyhcIkxvZ2luIHdpdGggeW91dHViZVwiKTtcclxuICAgICAgICB2YXIgcG9wdXAgPSB3aW5kb3cub3BlbihcImF1dGgveW91dHViZVwiLCAnc29jaWFsTG9naW4nLCAnd2lkdGg9NDUwLGhlaWdodD02MDAsbG9jYXRpb249MCxtZW51YmFyPTAscmVzaXphYmxlPTEsc2Nyb2xsYmFycz0wLHN0YXR1cz0wLHRpdGxlYmFyPTAsdG9vbGJhcj0wJyk7XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHBvcHVwLmZvY3VzKCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgcG9wdXBJbnRlcnZhbCA9ICRpbnRlcnZhbChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIGlmICghcG9wdXAgfHwgcG9wdXAuY2xvc2VkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlU3RhdHVzKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwocG9wdXBJbnRlcnZhbCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sIDIwMCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICBhbGVydChcIkl0IGxvb2tzIGxpa2UgeW91IGFyZSB1c2luZyBhIHBvcHVwIGJsb2NrZXIuIFBsZWFzZSBhbGxvdyB0aGlzIG9uZSBpbiBvcmRlciB0byBsb2dpbi4gVGhhbmtzIVwiKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgaXNMb2dnZWQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgand0ID0gc3RvcmUuZ2V0KCdqd3QnKTtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coand0KTtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coISFqd3QgJiYgand0ICE9ICd1bmRlZmluZWQnICYmIHR5cGVvZiBqd3QgIT0gJ3VuZGVmaW5lZCcpXHJcbiAgICAgICAgICAgIHJldHVybiAoISFqd3QgJiYgand0ICE9ICd1bmRlZmluZWQnICYmIHR5cGVvZiBqd3QgIT0gJ3VuZGVmaW5lZCcpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgbG9nT3V0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgQXBpLmNhbGwoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnbG9naW4vbG9nb3V0JyxcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ3Bvc3QnLFxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6IHVwZGF0ZVN0YXR1c1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdXBkYXRlU3RhdHVzOiB1cGRhdGVTdGF0dXMsXHJcbiAgICAgICAgbG9nV2l0aFlvdXR1YmU6IGxvZ1dpdGhZb3V0dWJlLFxyXG4gICAgICAgIGdldFVzZXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdXNlcjtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGlzTG9hZGVkOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGxvYWRlZDtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG5cclxufSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpLnNlcnZpY2UoJ1N5bmMnLCBmdW5jdGlvbigkcm9vdFNjb3BlLCAkaW50ZXJ2YWwsIEFwaSkge1xyXG5cclxuICAgIHZhciBsb2FkaW5nID0gZmFsc2U7XHJcblxyXG4gICAgZnVuY3Rpb24gc3luYygpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnU3luY2luZyBjaGFubmVscy4uLicpO1xyXG4gICAgICAgIGxvYWRpbmcgPSB0cnVlO1xyXG4gICAgICAgIEFwaS5jYWxsKHtcclxuICAgICAgICAgICAgdXJsOiAndXNlci9zeW5jJyxcclxuICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiU3luY2luZyBkb25lLi4uXCIpO1xyXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnc3luY0RvbmUnKTtcclxuICAgICAgICAgICAgICAgIGxvYWRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgc3luYzogc3luY1xyXG4gICAgfTtcclxuXHJcbn0pOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
