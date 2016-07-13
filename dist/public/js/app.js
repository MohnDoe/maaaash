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
                        $rootScope.$emit('successfullyLogged');
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
            return !!user || status != 'connected';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbnRyb2xsZXIvYmF0dGxlLmpzIiwiY29udHJvbGxlci9qb2luLmpzIiwic2VydmljZS9hcGkuanMiLCJzZXJ2aWNlL2Jsb2NrZXIuanMiLCJzZXJ2aWNlL2xvZ2luLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImFuZ3VsYXIubW9kdWxlKCdBcHAnLCBbJ3RlbXBsYXRlcycsICd1aS5yb3V0ZXInLCAnbmdBbmltYXRlJywgJ25nUm91dGUnLCAnYW5ndWxhck1vbWVudCddKVxyXG4gICAgLmNvbnN0YW50KCdDb25maWcnLCB7XHJcbiAgICAgICAgYXBpQmFzZTogd2luZG93LmxvY2F0aW9uLnByb3RvY29sICsgXCIvL1wiICsgd2luZG93LmxvY2F0aW9uLmhvc3QgKyBcIi9hcGkvXCJcclxuICAgIH0pXHJcbiAgICAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyLCAkdXJsUm91dGVyUHJvdmlkZXIsICRzY2VQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcclxuXHJcbiAgICAgICAgJHNjZVByb3ZpZGVyLmVuYWJsZWQoZmFsc2UpO1xyXG4gICAgICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcclxuXHJcbiAgICAgICAgJHN0YXRlUHJvdmlkZXJcclxuICAgICAgICAgICAgLnN0YXRlKCdqb2luJywge1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnL2pvaW4nLFxyXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdqb2luL2luZGV4Lmh0bWwnLFxyXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0pvaW5DdHJsIGFzIEpvaW4nLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuc3VyZUF1dGhlbnRpY2F0ZTogZmFsc2VcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLnN0YXRlKCdiYXR0bGUnLCB7XHJcbiAgICAgICAgICAgICAgICB1cmw6ICcvJyxcclxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnYmF0dGxlL2luZGV4Lmh0bWwnLFxyXG4gICAgICAgICAgICAgICAgY29udHJvbGxlcjogJ0JhdHRsZUN0cmwgYXMgQmF0dGxlJyxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICBlbnN1cmVBdXRoZW50aWNhdGU6IHRydWVcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZShmdW5jdGlvbigkaW5qZWN0b3IpIHtcclxuICAgICAgICAgICAgdmFyICRzdGF0ZTtcclxuICAgICAgICAgICAgJHN0YXRlID0gJGluamVjdG9yLmdldCgnJHN0YXRlJyk7XHJcbiAgICAgICAgICAgIHJldHVybiAkc3RhdGUuZ28oJzQwNCcsIG51bGwsIHtcclxuICAgICAgICAgICAgICAgIGxvY2F0aW9uOiBmYWxzZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9KVxyXG4gICAgLnJ1bihmdW5jdGlvbigkcm9vdFNjb3BlLCAkc3RhdGUsICR0aW1lb3V0LCBMb2dpbiwgQmxvY2tlciwgJGxvY2F0aW9uKSB7XHJcbiAgICAgICAgJHJvb3RTY29wZS4kc3RhdGUgPSAkc3RhdGU7XHJcbiAgICAgICAgJHJvb3RTY29wZS5Mb2dpbiA9IExvZ2luO1xyXG4gICAgICAgICRyb290U2NvcGUuQmxvY2tlciA9IEJsb2NrZXI7XHJcblxyXG4gICAgICAgICRyb290U2NvcGUuJG9uKFwiJHN0YXRlQ2hhbmdlU3RhcnRcIiwgZnVuY3Rpb24oZXZlbnQsIG5leHQsIGN1cnJlbnQpIHtcclxuICAgICAgICAgICAgaWYgKG5leHQuZGF0YS5lbnN1cmVBdXRoZW50aWNhdGUpIHtcclxuICAgICAgICAgICAgICAgIGlmICghJHJvb3RTY29wZS5Mb2dpbi5pc0xvZ2dlZCgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJGxvY2F0aW9uLnBhdGgoJy9qb2luJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChuZXh0LnVybCA9PSAnL2pvaW4nICYmICRyb290U2NvcGUuTG9naW4uaXNMb2dnZWQoKSkge1xyXG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnBhdGgoJy8nKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAkcm9vdFNjb3BlLnNhZmVBcHBseSA9IGZ1bmN0aW9uIHNhZmVBcHBseShvcGVyYXRpb24pIHtcclxuICAgICAgICAgICAgdmFyIHBoYXNlID0gdGhpcy4kcm9vdC4kJHBoYXNlO1xyXG4gICAgICAgICAgICBpZiAocGhhc2UgIT09ICckYXBwbHknICYmIHBoYXNlICE9PSAnJGRpZ2VzdCcpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGFwcGx5KG9wZXJhdGlvbik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChvcGVyYXRpb24gJiYgdHlwZW9mIG9wZXJhdGlvbiA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgb3BlcmF0aW9uKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuXHJcblxyXG4gICAgfSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpXHJcblx0LmNvbnRyb2xsZXIoJ0JhdHRsZUN0cmwnLCBmdW5jdGlvbigkcm9vdFNjb3BlLCAkc3RhdGUsIEFwaSwgTG9naW4pIHtcclxuXHRcdHZhciBzY29wZSA9IHRoaXM7XHJcblx0XHRzY29wZS5iYXR0bGUgPSBudWxsO1xyXG5cclxuXHRcdHNjb3BlLmdldE5ld0JhdHRsZSA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRBcGkuY2FsbCh7XHJcblx0XHRcdFx0dXJsOiAndm90ZS9uZXcnLFxyXG5cdFx0XHRcdGNhbGxiYWNrOiBmdW5jdGlvbihkYXRhKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhkYXRhKTtcclxuXHRcdFx0XHRcdHNjb3BlLmJhdHRsZSA9IGRhdGEudm90ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdH0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKVxyXG5cdC5jb250cm9sbGVyKCdKb2luQ3RybCcsIGZ1bmN0aW9uKExvZ2luKSB7XHJcblx0XHR2YXIgc2NvcGUgPSB0aGlzO1xyXG5cclxuXHRcdHNjb3BlLmxvZ1dpdGhZb3V0dWJlID0gTG9naW4ubG9nV2l0aFlvdXR1YmU7XHJcblx0fSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpLnNlcnZpY2UoJ0FwaScsIGZ1bmN0aW9uKCRodHRwLCAkcSwgQ29uZmlnLCAkdGltZW91dCwgLypOb3RpZmljYXRpb25zLCovIEJsb2NrZXIpIHtcclxuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBQZXJmb3JtIGFuIEFQSSBjYWxsLlxyXG4gICAgICogQHBhcmFtIG9wdGlvbnMge3VybCwgcGFyYW1zLCBkYXRhLCBjYWxsYmFjaywgbWV0aG9kLCBlcnJvckhhbmRsZXIgKHNob3VsZCByZXR1cm4gdHJ1ZSksIHRpbWVvdXQgaW4gTVMsIGJsb2NrVUl9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuY2FsbCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcclxuXHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBhbmd1bGFyLmV4dGVuZCh7XHJcbiAgICAgICAgICAgIHVybDogbnVsbCxcclxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcclxuICAgICAgICAgICAgcGFyYW1zOiBudWxsLFxyXG4gICAgICAgICAgICBkYXRhOiBudWxsLFxyXG4gICAgICAgICAgICBjYWxsYmFjazogbnVsbCxcclxuICAgICAgICAgICAgdGltZW91dDogMzAwMDAsXHJcbiAgICAgICAgICAgIGVycm9ySGFuZGxlcjogbnVsbCxcclxuICAgICAgICAgICAgYmxvY2tVSTogdHJ1ZSxcclxuICAgICAgICB9LCBvcHRpb25zKTtcclxuXHJcbiAgICAgICAgdmFyIGNhbmNlbGVyID0gJHEuZGVmZXIoKTtcclxuICAgICAgICB2YXIgY2FuY2VsVGltZW91dCA9IG9wdGlvbnMudGltZW91dCA/ICR0aW1lb3V0KGNhbmNlbGVyLnJlc29sdmUsIG9wdGlvbnMudGltZW91dCkgOiBudWxsO1xyXG5cclxuICAgICAgICBpZiAob3B0aW9ucy5ibG9ja1VJKSB7XHJcbiAgICAgICAgICAgIEJsb2NrZXIuYmxvY2soKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciB1cmwgPSBvcHRpb25zLnVybC5pbmRleE9mKCdodHRwJykgPT0gMCA/IG9wdGlvbnMudXJsIDogQ29uZmlnLmFwaUJhc2UgKyBvcHRpb25zLnVybDtcclxuXHJcbiAgICAgICAgJGh0dHAoe1xyXG4gICAgICAgICAgICB1cmw6IHVybCxcclxuICAgICAgICAgICAgbWV0aG9kOiBvcHRpb25zLm1ldGhvZCxcclxuICAgICAgICAgICAgcGFyYW1zOiBvcHRpb25zLnBhcmFtcyxcclxuICAgICAgICAgICAgZGF0YTogb3B0aW9ucy5kYXRhLFxyXG4gICAgICAgICAgICB0aW1lb3V0OiBjYW5jZWxlci5wcm9taXNlXHJcbiAgICAgICAgfSkuc3VjY2VzcyhmdW5jdGlvbihkYXRhKSB7XHJcbiAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChjYW5jZWxUaW1lb3V0KTtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmNhbGxiYWNrID09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgIG9wdGlvbnMuY2FsbGJhY2soZGF0YSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKG9wdGlvbnMuYmxvY2tVSSkge1xyXG4gICAgICAgICAgICAgICAgQmxvY2tlci51bmJsb2NrKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KS5lcnJvcihmdW5jdGlvbihtZXNzYWdlLCBzdGF0dXMpIHtcclxuICAgICAgICAgICAgJHRpbWVvdXQuY2FuY2VsKGNhbmNlbFRpbWVvdXQpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmVycm9ySGFuZGxlciA9PSAnZnVuY3Rpb24nICYmIG9wdGlvbnMuZXJyb3JIYW5kbGVyKG1lc3NhZ2UsIHN0YXR1cykpIHtcclxuICAgICAgICAgICAgICAgIC8vRXJyb3Igd2FzIGhhbmRsZWQgYnkgdGhlIGN1c3RvbSBlcnJvciBoYW5kbGVyXHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghc3RhdHVzKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkVycm9yIHdpdGhvdXQgc3RhdHVzOyByZXF1ZXN0IGFib3J0ZWQ/XCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBOb3RpZmljYXRpb25zLmFkZChcIkVycm9yIFwiICsgc3RhdHVzLCBtZXNzYWdlKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmJsb2NrVUkpIHtcclxuICAgICAgICAgICAgICAgIEJsb2NrZXIudW5ibG9jaygpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBjYW5jZWw6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgY2FuY2VsZXIucmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICB9O1xyXG5cclxufSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpLnNlcnZpY2UoJ0Jsb2NrZXInLCBmdW5jdGlvbigkcm9vdFNjb3BlKSB7XHJcblxyXG4gICAgdGhpcy5ibG9ja1VJID0gZmFsc2U7XHJcbiAgICB0aGlzLmJsb2NrQ291bnQgPSAwO1xyXG4gICAgdGhpcy5uYW1lZEJsb2NrcyA9IFtdO1xyXG4gICAgdGhpcy56SW5kZXggPSAxMDAwMDAwMDtcclxuICAgIHZhciB0aGF0ID0gdGhpcztcclxuXHJcbiAgICBmdW5jdGlvbiBjYWxjWkluZGV4KCkge1xyXG5cclxuICAgICAgICBpZiAoIXRoYXQubmFtZWRCbG9ja3MubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIHRoYXQuekluZGV4ID0gMTAwMDAwMDA7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhhdC56SW5kZXggPSAwO1xyXG4gICAgICAgICAgICBhbmd1bGFyLmZvckVhY2godGhhdC5uYW1lZEJsb2NrcywgZnVuY3Rpb24oYmxvY2ssIGluZGV4KSB7XHJcbiAgICAgICAgICAgICAgICB0aGF0LnpJbmRleCA9IGJsb2NrLnpJbmRleCA+IHRoYXQuekluZGV4ID8gYmxvY2suekluZGV4IDogdGhhdC56SW5kZXg7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmJsb2NrID0gZnVuY3Rpb24obmFtZSwgekluZGV4KSB7XHJcblxyXG4gICAgICAgIGlmIChuYW1lKSB7XHJcbiAgICAgICAgICAgIC8vdG9kbzogbWF5YmUganVzdCBhbiBvYmplY3Qgd2l0aCBuYW1lIGZvciBrZXlzIChidXQgdGhlbiBsZW5ndGggd291bGQgYmUgYW4gaXNzdWUpXHJcbiAgICAgICAgICAgIHRoYXQubmFtZWRCbG9ja3MucHVzaCh7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBuYW1lLFxyXG4gICAgICAgICAgICAgICAgekluZGV4OiB6SW5kZXhcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhhdC5ibG9ja0NvdW50Kys7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjYWxjWkluZGV4KCk7XHJcbiAgICAgICAgdGhhdC5ibG9ja1VJID0gdGhhdC5ibG9ja0NvdW50ID4gMCB8fCB0aGF0Lm5hbWVkQmxvY2tzLmxlbmd0aCA+IDA7XHJcbiAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdibG9ja2VyLnVwZGF0ZUJsb2NrZXInKTtcclxuXHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMudW5ibG9jayA9IGZ1bmN0aW9uKG5hbWUpIHtcclxuXHJcbiAgICAgICAgaWYgKG5hbWUpIHtcclxuICAgICAgICAgICAgdmFyIGRvbmUgPSBmYWxzZTtcclxuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHRoYXQubmFtZWRCbG9ja3MsIGZ1bmN0aW9uKGJsb2NrLCBpbmRleCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGJsb2NrLm5hbWUgPT0gbmFtZSAmJiAhZG9uZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoYXQubmFtZWRCbG9ja3Muc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBkb25lID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhhdC5ibG9ja0NvdW50LS07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGF0LmJsb2NrVUkgPSB0aGF0LmJsb2NrQ291bnQgPiAwIHx8IHRoYXQubmFtZWRCbG9ja3MubGVuZ3RoID4gMDtcclxuICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoJ2Jsb2NrZXIudXBkYXRlQmxvY2tlcicpO1xyXG5cclxuICAgIH07XHJcblxyXG5cclxufSk7IiwiYW5ndWxhci5tb2R1bGUoJ0FwcCcpLnNlcnZpY2UoJ0xvZ2luJywgZnVuY3Rpb24oJHJvb3RTY29wZSwgJGludGVydmFsLCBBcGksICRsb2NhdGlvbikge1xyXG5cclxuICAgIHZhciB1c2VyID0gbnVsbDtcclxuICAgIHZhciBzdGF0dXMgPSAnbm90Y29ubmVjdGVkJztcclxuICAgIHZhciBjcmVkaXRzID0gbnVsbDtcclxuICAgIC8vdmFyIEpXVCAgICAgPSBudWxsO1xyXG4gICAgdmFyIGxvYWRlZCA9IGZhbHNlO1xyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZVN0YXR1cyhhZnRlckxvZ2luKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1VwZGF0aW5nIHN0YXR1cyEnKTtcclxuICAgICAgICBBcGkuY2FsbCh7XHJcbiAgICAgICAgICAgIHVybDogJ3VzZXIvJyxcclxuICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgdXNlciA9IGRhdGEuZGF0YS51c2VyIHx8IG51bGw7XHJcbiAgICAgICAgICAgICAgICBzdGF0dXMgPSBkYXRhLmRhdGEuc3RhdHVzO1xyXG4gICAgICAgICAgICAgICAgbG9hZGVkID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoYWZ0ZXJMb2dpbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGF0dXMgPT0gJ2Nvbm5lY3RlZCcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnc3VjY2Vzc2Z1bGx5TG9nZ2VkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnZmFpbGVkTG9naW4nKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVTdGF0dXMoKTtcclxuXHJcbiAgICAkcm9vdFNjb3BlLiRvbignc3VjY2Vzc2Z1bGx5TG9nZ2VkJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ3N1Y2Nlc3NmdWxseUxvZ2dlZCcpO1xyXG4gICAgICAgICRsb2NhdGlvbi5wYXRoKCcvJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBmdW5jdGlvbiBsb2dXaXRoWW91dHViZSgpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIkxvZ2luIHdpdGggeW91dHViZVwiKTtcclxuICAgICAgICB2YXIgcG9wdXAgPSB3aW5kb3cub3BlbihcImF1dGgveW91dHViZVwiLCAnc29jaWFsTG9naW4nLCAnd2lkdGg9NDUwLGhlaWdodD02MDAsbG9jYXRpb249MCxtZW51YmFyPTAscmVzaXphYmxlPTEsc2Nyb2xsYmFycz0wLHN0YXR1cz0wLHRpdGxlYmFyPTAsdG9vbGJhcj0wJyk7XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHBvcHVwLmZvY3VzKCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgcG9wdXBJbnRlcnZhbCA9ICRpbnRlcnZhbChmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIGlmICghcG9wdXAgfHwgcG9wdXAuY2xvc2VkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlU3RhdHVzKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICRpbnRlcnZhbC5jYW5jZWwocG9wdXBJbnRlcnZhbCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sIDIwMCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICBhbGVydChcIkl0IGxvb2tzIGxpa2UgeW91IGFyZSB1c2luZyBhIHBvcHVwIGJsb2NrZXIuIFBsZWFzZSBhbGxvdyB0aGlzIG9uZSBpbiBvcmRlciB0byBsb2dpbi4gVGhhbmtzIVwiKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgaXNMb2dnZWQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gISF1c2VyIHx8IHN0YXR1cyAhPSAnY29ubmVjdGVkJztcclxuICAgICAgICB9LFxyXG4gICAgICAgIGxvZ091dDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIEFwaS5jYWxsKHtcclxuICAgICAgICAgICAgICAgIHVybDogJ2xvZ2luL2xvZ291dCcsXHJcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdwb3N0JyxcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrOiB1cGRhdGVTdGF0dXNcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9LFxyXG4gICAgICAgIHVwZGF0ZVN0YXR1czogdXBkYXRlU3RhdHVzLFxyXG4gICAgICAgIGxvZ1dpdGhZb3V0dWJlOiBsb2dXaXRoWW91dHViZSxcclxuICAgICAgICBnZXRVc2VyOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHVzZXI7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpc0xvYWRlZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBsb2FkZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbn0pOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
