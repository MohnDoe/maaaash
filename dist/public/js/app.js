angular.module('App', ['templates', 'ui.router', 'ngAnimate', 'ngRoute', 'angularMoment'])
    .constant('Config', {
        apiBase: window.location.protocol + "//" + window.location.host + "/api/"
    })
    .config(function($stateProvider, $urlRouterProvider, $sceProvider, $locationProvider) {

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
                    $location.path('/join');
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
angular.module('App').service('Api', function($http, $q, Config, $timeout, /*Notifications,*/ Blocker) {


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
angular.module('App').service('Login', function($rootScope, $interval, Api, $location) {

    var user = null;
    var status = 'notconnected';
    var credits = null;
    //var JWT     = null;
    var loaded = false;

    function updateStatus(afterLogin) {
        console.log('Updating status!');
        Api.call({
            url: 'user/',
            callback: function(data) {
                console.log(data);
                user = data.data.user || null;
                status = data.data.status;
                loaded = true;

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
        console.log("Login with youtube");
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
            console.log(!!user);
            return !!user;
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
        loading = true;
        Api.call({
            url: 'user/sync',
            callback: function(data) {
                $rootScope.$emit('syncDone');
                loading = true;
            }
        });
    }

    return {
        sync: sync
    };

});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbnRyb2xsZXIvYmF0dGxlLmpzIiwiY29udHJvbGxlci9qb2luLmpzIiwiY29udHJvbGxlci9zeW5jLmpzIiwic2VydmljZS9hcGkuanMiLCJzZXJ2aWNlL2Jsb2NrZXIuanMiLCJzZXJ2aWNlL2xvZ2luLmpzIiwic2VydmljZS9zeW5jLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXIubW9kdWxlKCdBcHAnLCBbJ3RlbXBsYXRlcycsICd1aS5yb3V0ZXInLCAnbmdBbmltYXRlJywgJ25nUm91dGUnLCAnYW5ndWxhck1vbWVudCddKVxyXG4gICAgLmNvbnN0YW50KCdDb25maWcnLCB7XHJcbiAgICAgICAgYXBpQmFzZTogd2luZG93LmxvY2F0aW9uLnByb3RvY29sICsgXCIvL1wiICsgd2luZG93LmxvY2F0aW9uLmhvc3QgKyBcIi9hcGkvXCJcclxuICAgIH0pXHJcbiAgICAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIsICRzY2VQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcclxuXHJcbiAgICAgICAgJHNjZVByb3ZpZGVyLmVuYWJsZWQoZmFsc2UpO1xyXG4gICAgICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcclxuXHJcbiAgICAgICAgJHN0YXRlUHJvdmlkZXJcclxuICAgICAgICAgICAgLnN0YXRlKCdqb2luJywge1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnL2pvaW4nLFxyXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdqb2luL2luZGV4Lmh0bWwnLFxyXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0pvaW5DdHJsIGFzIEpvaW4nLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuc3VyZUF1dGhlbnRpY2F0ZTogZmFsc2VcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLnN0YXRlKCdzeW5jJywge1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnL3N5bmMnLFxyXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdzeW5jL2luZGV4Lmh0bWwnLFxyXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ1N5bmNDdHJsIGFzIFN5bmMnLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuc3VyZUF1dGhlbnRpY2F0ZTogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuc3RhdGUoJ2JhdHRsZScsIHtcclxuICAgICAgICAgICAgICAgIHVybDogJy8nLFxyXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdiYXR0bGUvaW5kZXguaHRtbCcsXHJcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyOiAnQmF0dGxlQ3RybCBhcyBCYXR0bGUnLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuc3VyZUF1dGhlbnRpY2F0ZTogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKGZ1bmN0aW9uKCRpbmplY3Rvcikge1xyXG4gICAgICAgICAgICB2YXIgJHN0YXRlO1xyXG4gICAgICAgICAgICAkc3RhdGUgPSAkaW5qZWN0b3IuZ2V0KCckc3RhdGUnKTtcclxuICAgICAgICAgICAgcmV0dXJuICRzdGF0ZS5nbygnNDA0JywgbnVsbCwge1xyXG4gICAgICAgICAgICAgICAgbG9jYXRpb246IGZhbHNlXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH0pXHJcbiAgICAucnVuKGZ1bmN0aW9uKCRyb290U2NvcGUsICRzdGF0ZSwgJHRpbWVvdXQsIExvZ2luLCBCbG9ja2VyLCAkbG9jYXRpb24pIHtcclxuICAgICAgICAkcm9vdFNjb3BlLiRzdGF0ZSA9ICRzdGF0ZTtcclxuICAgICAgICAkcm9vdFNjb3BlLkxvZ2luID0gTG9naW47XHJcbiAgICAgICAgJHJvb3RTY29wZS5CbG9ja2VyID0gQmxvY2tlcjtcclxuXHJcbiAgICAgICAgJHJvb3RTY29wZS4kb24oXCIkc3RhdGVDaGFuZ2VTdGFydFwiLCBmdW5jdGlvbihldmVudCwgbmV4dCwgY3VycmVudCkge1xyXG4gICAgICAgICAgICBpZiAobmV4dC5kYXRhLmVuc3VyZUF1dGhlbnRpY2F0ZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ05lZWQgQXV0aGVudGljYXRlZCB1c2VyLicpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCEkcm9vdFNjb3BlLkxvZ2luLmlzTG9nZ2VkKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAkbG9jYXRpb24ucGF0aCgnL2pvaW4nKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG5leHQudXJsID09ICcvam9pbicgJiYgJHJvb3RTY29wZS5Mb2dpbi5pc0xvZ2dlZCgpKSB7XHJcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24ucGF0aCgnLycpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICRyb290U2NvcGUuc2FmZUFwcGx5ID0gZnVuY3Rpb24gc2FmZUFwcGx5KG9wZXJhdGlvbikge1xyXG4gICAgICAgICAgICB2YXIgcGhhc2UgPSB0aGlzLiRyb290LiQkcGhhc2U7XHJcbiAgICAgICAgICAgIGlmIChwaGFzZSAhPT0gJyRhcHBseScgJiYgcGhhc2UgIT09ICckZGlnZXN0Jykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kYXBwbHkob3BlcmF0aW9uKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG9wZXJhdGlvbiAmJiB0eXBlb2Ygb3BlcmF0aW9uID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICBvcGVyYXRpb24oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG5cclxuXHJcbiAgICB9KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJylcclxuXHQuY29udHJvbGxlcignQmF0dGxlQ3RybCcsIGZ1bmN0aW9uKCRyb290U2NvcGUsICRzdGF0ZSwgQXBpLCBMb2dpbikge1xyXG5cdFx0dmFyIHNjb3BlID0gdGhpcztcclxuXHRcdHNjb3BlLmJhdHRsZSA9IG51bGw7XHJcblxyXG5cdFx0c2NvcGUuZ2V0TmV3QmF0dGxlID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdEFwaS5jYWxsKHtcclxuXHRcdFx0XHR1cmw6ICd2b3RlL25ldycsXHJcblx0XHRcdFx0Y2FsbGJhY2s6IGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKGRhdGEpO1xyXG5cdFx0XHRcdFx0c2NvcGUuYmF0dGxlID0gZGF0YS52b3RlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpXHJcblx0LmNvbnRyb2xsZXIoJ0pvaW5DdHJsJywgZnVuY3Rpb24oTG9naW4pIHtcclxuXHRcdHZhciBzY29wZSA9IHRoaXM7XHJcblxyXG5cdFx0c2NvcGUubG9nV2l0aFlvdXR1YmUgPSBMb2dpbi5sb2dXaXRoWW91dHViZTtcclxuXHR9KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJylcclxuXHQuY29udHJvbGxlcignU3luY0N0cmwnLCBmdW5jdGlvbigkcm9vdFNjb3BlLCAkc3RhdGUsIEFwaSwgU3luYywgJGxvY2F0aW9uLCBMb2dpbikge1xyXG5cclxuXHRcdHZhciBzY29wZSA9IHRoaXM7XHJcblxyXG5cclxuXHRcdHNjb3BlLnN5bmMgPSBTeW5jLnN5bmM7XHJcblxyXG5cdFx0aWYgKExvZ2luLmlzTG9nZ2VkKCkpIHtcclxuXHRcdFx0c2NvcGUuc3luYygpO1xyXG5cdFx0fVxyXG5cclxuXHRcdCRyb290U2NvcGUuJG9uKCdzeW5jRG9uZScsIGZ1bmN0aW9uKCkge1xyXG5cdFx0XHQkbG9jYXRpb24ucGF0aCgnLycpO1xyXG5cdFx0fSlcclxuXHR9KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJykuc2VydmljZSgnQXBpJywgZnVuY3Rpb24oJGh0dHAsICRxLCBDb25maWcsICR0aW1lb3V0LCAvKk5vdGlmaWNhdGlvbnMsKi8gQmxvY2tlcikge1xyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIFBlcmZvcm0gYW4gQVBJIGNhbGwuXHJcbiAgICAgKiBAcGFyYW0gb3B0aW9ucyB7dXJsLCBwYXJhbXMsIGRhdGEsIGNhbGxiYWNrLCBtZXRob2QsIGVycm9ySGFuZGxlciAoc2hvdWxkIHJldHVybiB0cnVlKSwgdGltZW91dCBpbiBNUywgYmxvY2tVSX1cclxuICAgICAqL1xyXG4gICAgdGhpcy5jYWxsID0gZnVuY3Rpb24ob3B0aW9ucykge1xyXG5cclxuICAgICAgICB2YXIgb3B0aW9ucyA9IGFuZ3VsYXIuZXh0ZW5kKHtcclxuICAgICAgICAgICAgdXJsOiBudWxsLFxyXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgICAgICBwYXJhbXM6IG51bGwsXHJcbiAgICAgICAgICAgIGRhdGE6IG51bGwsXHJcbiAgICAgICAgICAgIGNhbGxiYWNrOiBudWxsLFxyXG4gICAgICAgICAgICB0aW1lb3V0OiAzMDAwMCxcclxuICAgICAgICAgICAgZXJyb3JIYW5kbGVyOiBudWxsLFxyXG4gICAgICAgICAgICBibG9ja1VJOiB0cnVlLFxyXG4gICAgICAgIH0sIG9wdGlvbnMpO1xyXG5cclxuICAgICAgICB2YXIgY2FuY2VsZXIgPSAkcS5kZWZlcigpO1xyXG4gICAgICAgIHZhciBjYW5jZWxUaW1lb3V0ID0gb3B0aW9ucy50aW1lb3V0ID8gJHRpbWVvdXQoY2FuY2VsZXIucmVzb2x2ZSwgb3B0aW9ucy50aW1lb3V0KSA6IG51bGw7XHJcblxyXG4gICAgICAgIGlmIChvcHRpb25zLmJsb2NrVUkpIHtcclxuICAgICAgICAgICAgQmxvY2tlci5ibG9jaygpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIHVybCA9IG9wdGlvbnMudXJsLmluZGV4T2YoJ2h0dHAnKSA9PSAwID8gb3B0aW9ucy51cmwgOiBDb25maWcuYXBpQmFzZSArIG9wdGlvbnMudXJsO1xyXG5cclxuICAgICAgICAkaHR0cCh7XHJcbiAgICAgICAgICAgIHVybDogdXJsLFxyXG4gICAgICAgICAgICBtZXRob2Q6IG9wdGlvbnMubWV0aG9kLFxyXG4gICAgICAgICAgICBwYXJhbXM6IG9wdGlvbnMucGFyYW1zLFxyXG4gICAgICAgICAgICBkYXRhOiBvcHRpb25zLmRhdGEsXHJcbiAgICAgICAgICAgIHRpbWVvdXQ6IGNhbmNlbGVyLnByb21pc2VcclxuICAgICAgICB9KS5zdWNjZXNzKGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKGNhbmNlbFRpbWVvdXQpO1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuY2FsbGJhY2sgPT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgb3B0aW9ucy5jYWxsYmFjayhkYXRhKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAob3B0aW9ucy5ibG9ja1VJKSB7XHJcbiAgICAgICAgICAgICAgICBCbG9ja2VyLnVuYmxvY2soKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pLmVycm9yKGZ1bmN0aW9uKG1lc3NhZ2UsIHN0YXR1cykge1xyXG4gICAgICAgICAgICAkdGltZW91dC5jYW5jZWwoY2FuY2VsVGltZW91dCk7XHJcblxyXG4gICAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuZXJyb3JIYW5kbGVyID09ICdmdW5jdGlvbicgJiYgb3B0aW9ucy5lcnJvckhhbmRsZXIobWVzc2FnZSwgc3RhdHVzKSkge1xyXG4gICAgICAgICAgICAgICAgLy9FcnJvciB3YXMgaGFuZGxlZCBieSB0aGUgY3VzdG9tIGVycm9yIGhhbmRsZXJcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFzdGF0dXMpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3Igd2l0aG91dCBzdGF0dXM7IHJlcXVlc3QgYWJvcnRlZD9cIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIE5vdGlmaWNhdGlvbnMuYWRkKFwiRXJyb3IgXCIgKyBzdGF0dXMsIG1lc3NhZ2UpO1xyXG5cclxuICAgICAgICAgICAgaWYgKG9wdGlvbnMuYmxvY2tVSSkge1xyXG4gICAgICAgICAgICAgICAgQmxvY2tlci51bmJsb2NrKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGNhbmNlbDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBjYW5jZWxlci5yZXNvbHZlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgIH07XHJcblxyXG59KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJykuc2VydmljZSgnQmxvY2tlcicsIGZ1bmN0aW9uKCRyb290U2NvcGUpIHtcclxuXHJcbiAgICB0aGlzLmJsb2NrVUkgPSBmYWxzZTtcclxuICAgIHRoaXMuYmxvY2tDb3VudCA9IDA7XHJcbiAgICB0aGlzLm5hbWVkQmxvY2tzID0gW107XHJcbiAgICB0aGlzLnpJbmRleCA9IDEwMDAwMDAwO1xyXG4gICAgdmFyIHRoYXQgPSB0aGlzO1xyXG5cclxuICAgIGZ1bmN0aW9uIGNhbGNaSW5kZXgoKSB7XHJcblxyXG4gICAgICAgIGlmICghdGhhdC5uYW1lZEJsb2Nrcy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgdGhhdC56SW5kZXggPSAxMDAwMDAwMDtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGF0LnpJbmRleCA9IDA7XHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCh0aGF0Lm5hbWVkQmxvY2tzLCBmdW5jdGlvbihibG9jaywgaW5kZXgpIHtcclxuICAgICAgICAgICAgICAgIHRoYXQuekluZGV4ID0gYmxvY2suekluZGV4ID4gdGhhdC56SW5kZXggPyBibG9jay56SW5kZXggOiB0aGF0LnpJbmRleDtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuYmxvY2sgPSBmdW5jdGlvbihuYW1lLCB6SW5kZXgpIHtcclxuXHJcbiAgICAgICAgaWYgKG5hbWUpIHtcclxuICAgICAgICAgICAgLy90b2RvOiBtYXliZSBqdXN0IGFuIG9iamVjdCB3aXRoIG5hbWUgZm9yIGtleXMgKGJ1dCB0aGVuIGxlbmd0aCB3b3VsZCBiZSBhbiBpc3N1ZSlcclxuICAgICAgICAgICAgdGhhdC5uYW1lZEJsb2Nrcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IG5hbWUsXHJcbiAgICAgICAgICAgICAgICB6SW5kZXg6IHpJbmRleFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGF0LmJsb2NrQ291bnQrKztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNhbGNaSW5kZXgoKTtcclxuICAgICAgICB0aGF0LmJsb2NrVUkgPSB0aGF0LmJsb2NrQ291bnQgPiAwIHx8IHRoYXQubmFtZWRCbG9ja3MubGVuZ3RoID4gMDtcclxuICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2Jsb2NrZXIudXBkYXRlQmxvY2tlcicpO1xyXG5cclxuICAgIH07XHJcblxyXG4gICAgdGhpcy51bmJsb2NrID0gZnVuY3Rpb24obmFtZSkge1xyXG5cclxuICAgICAgICBpZiAobmFtZSkge1xyXG4gICAgICAgICAgICB2YXIgZG9uZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2godGhhdC5uYW1lZEJsb2NrcywgZnVuY3Rpb24oYmxvY2ssIGluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoYmxvY2submFtZSA9PSBuYW1lICYmICFkb25lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5uYW1lZEJsb2Nrcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGRvbmUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGF0LmJsb2NrQ291bnQtLTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoYXQuYmxvY2tVSSA9IHRoYXQuYmxvY2tDb3VudCA+IDAgfHwgdGhhdC5uYW1lZEJsb2Nrcy5sZW5ndGggPiAwO1xyXG4gICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnYmxvY2tlci51cGRhdGVCbG9ja2VyJyk7XHJcblxyXG4gICAgfTtcclxuXHJcblxyXG59KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJykuc2VydmljZSgnTG9naW4nLCBmdW5jdGlvbigkcm9vdFNjb3BlLCAkaW50ZXJ2YWwsIEFwaSwgJGxvY2F0aW9uKSB7XHJcblxyXG4gICAgdmFyIHVzZXIgPSBudWxsO1xyXG4gICAgdmFyIHN0YXR1cyA9ICdub3Rjb25uZWN0ZWQnO1xyXG4gICAgdmFyIGNyZWRpdHMgPSBudWxsO1xyXG4gICAgLy92YXIgSldUICAgICA9IG51bGw7XHJcbiAgICB2YXIgbG9hZGVkID0gZmFsc2U7XHJcblxyXG4gICAgZnVuY3Rpb24gdXBkYXRlU3RhdHVzKGFmdGVyTG9naW4pIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnVXBkYXRpbmcgc3RhdHVzIScpO1xyXG4gICAgICAgIEFwaS5jYWxsKHtcclxuICAgICAgICAgICAgdXJsOiAndXNlci8nLFxyXG4gICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XHJcbiAgICAgICAgICAgICAgICB1c2VyID0gZGF0YS5kYXRhLnVzZXIgfHwgbnVsbDtcclxuICAgICAgICAgICAgICAgIHN0YXR1cyA9IGRhdGEuZGF0YS5zdGF0dXM7XHJcbiAgICAgICAgICAgICAgICBsb2FkZWQgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChhZnRlckxvZ2luKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXR1cyA9PSAnY29ubmVjdGVkJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodXNlci5sYXN0X3N5bmNlZCA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnc3VjY2Vzc2Z1bGx5U2lnbmVkVXAnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnc3VjY2Vzc2Z1bGx5TG9nZ2VkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRlbWl0KCdmYWlsZWRMb2dpbicpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZVN0YXR1cygpO1xyXG5cclxuICAgICRyb290U2NvcGUuJG9uKCdzdWNjZXNzZnVsbHlMb2dnZWQnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnc3VjY2Vzc2Z1bGx5TG9nZ2VkJyk7XHJcbiAgICAgICAgJGxvY2F0aW9uLnBhdGgoJy8nKTtcclxuICAgIH0pO1xyXG5cclxuICAgICRyb290U2NvcGUuJG9uKCdzdWNjZXNzZnVsbHlTaWduZWRVcCcsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdzdWNjZXNzZnVsbHlTaWduZWRVcCcpO1xyXG4gICAgICAgICRsb2NhdGlvbi5wYXRoKCcvc3luYycpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgZnVuY3Rpb24gbG9nV2l0aFlvdXR1YmUoKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJMb2dpbiB3aXRoIHlvdXR1YmVcIik7XHJcbiAgICAgICAgdmFyIHBvcHVwID0gd2luZG93Lm9wZW4oXCJhdXRoL3lvdXR1YmVcIiwgJ3NvY2lhbExvZ2luJywgJ3dpZHRoPTQ1MCxoZWlnaHQ9NjAwLGxvY2F0aW9uPTAsbWVudWJhcj0wLHJlc2l6YWJsZT0xLHNjcm9sbGJhcnM9MCxzdGF0dXM9MCx0aXRsZWJhcj0wLHRvb2xiYXI9MCcpO1xyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBwb3B1cC5mb2N1cygpO1xyXG5cclxuICAgICAgICAgICAgdmFyIHBvcHVwSW50ZXJ2YWwgPSAkaW50ZXJ2YWwoZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXBvcHVwIHx8IHBvcHVwLmNsb3NlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZVN0YXR1cyh0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKHBvcHVwSW50ZXJ2YWwpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCAyMDApO1xyXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgYWxlcnQoXCJJdCBsb29rcyBsaWtlIHlvdSBhcmUgdXNpbmcgYSBwb3B1cCBibG9ja2VyLiBQbGVhc2UgYWxsb3cgdGhpcyBvbmUgaW4gb3JkZXIgdG8gbG9naW4uIFRoYW5rcyFcIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGlzTG9nZ2VkOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coISF1c2VyKTtcclxuICAgICAgICAgICAgcmV0dXJuICEhdXNlcjtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGxvZ091dDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIEFwaS5jYWxsKHtcclxuICAgICAgICAgICAgICAgIHVybDogJ2xvZ2luL2xvZ291dCcsXHJcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdwb3N0JyxcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrOiB1cGRhdGVTdGF0dXNcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9LFxyXG4gICAgICAgIHVwZGF0ZVN0YXR1czogdXBkYXRlU3RhdHVzLFxyXG4gICAgICAgIGxvZ1dpdGhZb3V0dWJlOiBsb2dXaXRoWW91dHViZSxcclxuICAgICAgICBnZXRVc2VyOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHVzZXI7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpc0xvYWRlZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBsb2FkZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbn0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKS5zZXJ2aWNlKCdTeW5jJywgZnVuY3Rpb24oJHJvb3RTY29wZSwgJGludGVydmFsLCBBcGkpIHtcclxuXHJcbiAgICB2YXIgbG9hZGluZyA9IGZhbHNlO1xyXG5cclxuICAgIGZ1bmN0aW9uIHN5bmMoKSB7XHJcbiAgICAgICAgbG9hZGluZyA9IHRydWU7XHJcbiAgICAgICAgQXBpLmNhbGwoe1xyXG4gICAgICAgICAgICB1cmw6ICd1c2VyL3N5bmMnLFxyXG4gICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnc3luY0RvbmUnKTtcclxuICAgICAgICAgICAgICAgIGxvYWRpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBzeW5jOiBzeW5jXHJcbiAgICB9O1xyXG5cclxufSk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
