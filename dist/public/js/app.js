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
                controller: 'JoinCtrl as Join'
            })
            .state('battle', {
                url: '/',
                templateUrl: 'battle/index.html',
                // controller: 'BattleCtrl as Battle'
            })

        $urlRouterProvider.otherwise(function($injector) {
            var $state;
            $state = $injector.get('$state');
            return $state.go('404', null, {
                location: false
            });
        });

    })
    .run(function($rootScope, $state, $timeout) {
        $rootScope.$state = $state;

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
angular.module('App').service('Login', function($rootScope, $interval, Api) {

    var user = null;
    var credits = null;
    //var JWT     = null;
    var loaded = false;

    function updateStatus() {
        Api.call({
            url: 'login/status',
            callback: function(data) {
                user = data.user || null;
                // credits = data.credits || 0;
                //JWT     = data.jwt || null;
                loaded = true;
            }
        });
    }

    updateStatus();

    function logWithYoutube() {

        var popup = window.open("auth/youtube", 'socialLogin', 'width=450,height=600,location=0,menubar=0,resizable=1,scrollbars=0,status=0,titlebar=0,toolbar=0');

        try {
            popup.focus();

            var popupInterval = $interval(function() {
                if (!popup || popup.closed) {
                    updateStatus();
                    $interval.cancel(popupInterval);
                }
            }, 200);
        } catch (e) {
            alert("It looks like you are using a popup blocker. Please allow this one in order to login. Thanks!");
        }

    }

    return {
        loggedIn: function() {
            return !!user
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
        //getJWT:       function () {
        //    return JWT;
        //},
        isLoaded: function() {
            return loaded;
        }
    };

});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImNvbnRyb2xsZXIvYmF0dGxlLmpzIiwiY29udHJvbGxlci9qb2luLmpzIiwic2VydmljZS9hcGkuanMiLCJzZXJ2aWNlL2Jsb2NrZXIuanMiLCJzZXJ2aWNlL2xvZ2luLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJhbmd1bGFyLm1vZHVsZSgnQXBwJywgWyd0ZW1wbGF0ZXMnLCAndWkucm91dGVyJywgJ25nQW5pbWF0ZScsICduZ1JvdXRlJywgJ2FuZ3VsYXJNb21lbnQnXSlcclxuICAgIC5jb25zdGFudCgnQ29uZmlnJywge1xyXG4gICAgICAgIGFwaUJhc2U6IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCArIFwiLy9cIiArIHdpbmRvdy5sb2NhdGlvbi5ob3N0ICsgXCIvYXBpL1wiXHJcbiAgICB9KVxyXG4gICAgLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlciwgJHVybFJvdXRlclByb3ZpZGVyLCAkc2NlUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XHJcblxyXG4gICAgICAgICRzY2VQcm92aWRlci5lbmFibGVkKGZhbHNlKTtcclxuICAgICAgICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XHJcblxyXG4gICAgICAgICRzdGF0ZVByb3ZpZGVyXHJcbiAgICAgICAgICAgIC5zdGF0ZSgnam9pbicsIHtcclxuICAgICAgICAgICAgICAgIHVybDogJy9qb2luJyxcclxuICAgICAgICAgICAgICAgIHRlbXBsYXRlVXJsOiAnam9pbi9pbmRleC5odG1sJyxcclxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6ICdKb2luQ3RybCBhcyBKb2luJ1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuc3RhdGUoJ2JhdHRsZScsIHtcclxuICAgICAgICAgICAgICAgIHVybDogJy8nLFxyXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVVcmw6ICdiYXR0bGUvaW5kZXguaHRtbCcsXHJcbiAgICAgICAgICAgICAgICAvLyBjb250cm9sbGVyOiAnQmF0dGxlQ3RybCBhcyBCYXR0bGUnXHJcbiAgICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoZnVuY3Rpb24oJGluamVjdG9yKSB7XHJcbiAgICAgICAgICAgIHZhciAkc3RhdGU7XHJcbiAgICAgICAgICAgICRzdGF0ZSA9ICRpbmplY3Rvci5nZXQoJyRzdGF0ZScpO1xyXG4gICAgICAgICAgICByZXR1cm4gJHN0YXRlLmdvKCc0MDQnLCBudWxsLCB7XHJcbiAgICAgICAgICAgICAgICBsb2NhdGlvbjogZmFsc2VcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgfSlcclxuICAgIC5ydW4oZnVuY3Rpb24oJHJvb3RTY29wZSwgJHN0YXRlLCAkdGltZW91dCkge1xyXG4gICAgICAgICRyb290U2NvcGUuJHN0YXRlID0gJHN0YXRlO1xyXG5cclxuICAgICAgICAkcm9vdFNjb3BlLnNhZmVBcHBseSA9IGZ1bmN0aW9uIHNhZmVBcHBseShvcGVyYXRpb24pIHtcclxuICAgICAgICAgICAgdmFyIHBoYXNlID0gdGhpcy4kcm9vdC4kJHBoYXNlO1xyXG4gICAgICAgICAgICBpZiAocGhhc2UgIT09ICckYXBwbHknICYmIHBoYXNlICE9PSAnJGRpZ2VzdCcpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGFwcGx5KG9wZXJhdGlvbik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChvcGVyYXRpb24gJiYgdHlwZW9mIG9wZXJhdGlvbiA9PT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgb3BlcmF0aW9uKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgIH0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKVxyXG5cdC5jb250cm9sbGVyKCdCYXR0bGVDdHJsJywgZnVuY3Rpb24oJHJvb3RTY29wZSwgJHN0YXRlLCBBcGkpIHtcclxuXHRcdHZhciBzY29wZSA9IHRoaXM7XHJcblx0XHRzY29wZS5iYXR0bGUgPSBudWxsO1xyXG5cdFx0QXBpLmNhbGwoe1xyXG5cdFx0XHR1cmw6ICd2b3RlL25ldycsXHJcblx0XHRcdGNhbGxiYWNrOiBmdW5jdGlvbihkYXRhKSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coZGF0YSk7XHJcblx0XHRcdFx0c2NvcGUuYmF0dGxlID0gZGF0YS52b3RlO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9KTsiLCJhbmd1bGFyLm1vZHVsZSgnQXBwJylcclxuXHQuY29udHJvbGxlcignSm9pbkN0cmwnLCBmdW5jdGlvbihMb2dpbikge1xyXG5cdFx0dmFyIHNjb3BlID0gdGhpcztcclxuXHJcblx0XHRzY29wZS5sb2dXaXRoWW91dHViZSA9IExvZ2luLmxvZ1dpdGhZb3V0dWJlO1xyXG5cdH0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKS5zZXJ2aWNlKCdBcGknLCBmdW5jdGlvbigkaHR0cCwgJHEsIENvbmZpZywgJHRpbWVvdXQsIC8qTm90aWZpY2F0aW9ucywqLyBCbG9ja2VyKSB7XHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICogUGVyZm9ybSBhbiBBUEkgY2FsbC5cclxuICAgICAqIEBwYXJhbSBvcHRpb25zIHt1cmwsIHBhcmFtcywgZGF0YSwgY2FsbGJhY2ssIG1ldGhvZCwgZXJyb3JIYW5kbGVyIChzaG91bGQgcmV0dXJuIHRydWUpLCB0aW1lb3V0IGluIE1TLCBibG9ja1VJfVxyXG4gICAgICovXHJcbiAgICB0aGlzLmNhbGwgPSBmdW5jdGlvbihvcHRpb25zKSB7XHJcblxyXG4gICAgICAgIHZhciBvcHRpb25zID0gYW5ndWxhci5leHRlbmQoe1xyXG4gICAgICAgICAgICB1cmw6IG51bGwsXHJcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXHJcbiAgICAgICAgICAgIHBhcmFtczogbnVsbCxcclxuICAgICAgICAgICAgZGF0YTogbnVsbCxcclxuICAgICAgICAgICAgY2FsbGJhY2s6IG51bGwsXHJcbiAgICAgICAgICAgIHRpbWVvdXQ6IDMwMDAwLFxyXG4gICAgICAgICAgICBlcnJvckhhbmRsZXI6IG51bGwsXHJcbiAgICAgICAgICAgIGJsb2NrVUk6IHRydWUsXHJcbiAgICAgICAgfSwgb3B0aW9ucyk7XHJcblxyXG4gICAgICAgIHZhciBjYW5jZWxlciA9ICRxLmRlZmVyKCk7XHJcbiAgICAgICAgdmFyIGNhbmNlbFRpbWVvdXQgPSBvcHRpb25zLnRpbWVvdXQgPyAkdGltZW91dChjYW5jZWxlci5yZXNvbHZlLCBvcHRpb25zLnRpbWVvdXQpIDogbnVsbDtcclxuXHJcbiAgICAgICAgaWYgKG9wdGlvbnMuYmxvY2tVSSkge1xyXG4gICAgICAgICAgICBCbG9ja2VyLmJsb2NrKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgdXJsID0gb3B0aW9ucy51cmwuaW5kZXhPZignaHR0cCcpID09IDAgPyBvcHRpb25zLnVybCA6IENvbmZpZy5hcGlCYXNlICsgb3B0aW9ucy51cmw7XHJcblxyXG4gICAgICAgICRodHRwKHtcclxuICAgICAgICAgICAgdXJsOiB1cmwsXHJcbiAgICAgICAgICAgIG1ldGhvZDogb3B0aW9ucy5tZXRob2QsXHJcbiAgICAgICAgICAgIHBhcmFtczogb3B0aW9ucy5wYXJhbXMsXHJcbiAgICAgICAgICAgIGRhdGE6IG9wdGlvbnMuZGF0YSxcclxuICAgICAgICAgICAgdGltZW91dDogY2FuY2VsZXIucHJvbWlzZVxyXG4gICAgICAgIH0pLnN1Y2Nlc3MoZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgICAkdGltZW91dC5jYW5jZWwoY2FuY2VsVGltZW91dCk7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5jYWxsYmFjayA9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICBvcHRpb25zLmNhbGxiYWNrKGRhdGEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmJsb2NrVUkpIHtcclxuICAgICAgICAgICAgICAgIEJsb2NrZXIudW5ibG9jaygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSkuZXJyb3IoZnVuY3Rpb24obWVzc2FnZSwgc3RhdHVzKSB7XHJcbiAgICAgICAgICAgICR0aW1lb3V0LmNhbmNlbChjYW5jZWxUaW1lb3V0KTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5lcnJvckhhbmRsZXIgPT0gJ2Z1bmN0aW9uJyAmJiBvcHRpb25zLmVycm9ySGFuZGxlcihtZXNzYWdlLCBzdGF0dXMpKSB7XHJcbiAgICAgICAgICAgICAgICAvL0Vycm9yIHdhcyBoYW5kbGVkIGJ5IHRoZSBjdXN0b20gZXJyb3IgaGFuZGxlclxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIXN0YXR1cykge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJFcnJvciB3aXRob3V0IHN0YXR1czsgcmVxdWVzdCBhYm9ydGVkP1wiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gTm90aWZpY2F0aW9ucy5hZGQoXCJFcnJvciBcIiArIHN0YXR1cywgbWVzc2FnZSk7XHJcblxyXG4gICAgICAgICAgICBpZiAob3B0aW9ucy5ibG9ja1VJKSB7XHJcbiAgICAgICAgICAgICAgICBCbG9ja2VyLnVuYmxvY2soKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgY2FuY2VsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIGNhbmNlbGVyLnJlc29sdmUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgfTtcclxuXHJcbn0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKS5zZXJ2aWNlKCdCbG9ja2VyJywgZnVuY3Rpb24oJHJvb3RTY29wZSkge1xyXG5cclxuICAgIHRoaXMuYmxvY2tVSSA9IGZhbHNlO1xyXG4gICAgdGhpcy5ibG9ja0NvdW50ID0gMDtcclxuICAgIHRoaXMubmFtZWRCbG9ja3MgPSBbXTtcclxuICAgIHRoaXMuekluZGV4ID0gMTAwMDAwMDA7XHJcbiAgICB2YXIgdGhhdCA9IHRoaXM7XHJcblxyXG4gICAgZnVuY3Rpb24gY2FsY1pJbmRleCgpIHtcclxuXHJcbiAgICAgICAgaWYgKCF0aGF0Lm5hbWVkQmxvY2tzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICB0aGF0LnpJbmRleCA9IDEwMDAwMDAwO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoYXQuekluZGV4ID0gMDtcclxuICAgICAgICAgICAgYW5ndWxhci5mb3JFYWNoKHRoYXQubmFtZWRCbG9ja3MsIGZ1bmN0aW9uKGJsb2NrLCBpbmRleCkge1xyXG4gICAgICAgICAgICAgICAgdGhhdC56SW5kZXggPSBibG9jay56SW5kZXggPiB0aGF0LnpJbmRleCA/IGJsb2NrLnpJbmRleCA6IHRoYXQuekluZGV4O1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5ibG9jayA9IGZ1bmN0aW9uKG5hbWUsIHpJbmRleCkge1xyXG5cclxuICAgICAgICBpZiAobmFtZSkge1xyXG4gICAgICAgICAgICAvL3RvZG86IG1heWJlIGp1c3QgYW4gb2JqZWN0IHdpdGggbmFtZSBmb3Iga2V5cyAoYnV0IHRoZW4gbGVuZ3RoIHdvdWxkIGJlIGFuIGlzc3VlKVxyXG4gICAgICAgICAgICB0aGF0Lm5hbWVkQmxvY2tzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgbmFtZTogbmFtZSxcclxuICAgICAgICAgICAgICAgIHpJbmRleDogekluZGV4XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoYXQuYmxvY2tDb3VudCsrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY2FsY1pJbmRleCgpO1xyXG4gICAgICAgIHRoYXQuYmxvY2tVSSA9IHRoYXQuYmxvY2tDb3VudCA+IDAgfHwgdGhhdC5uYW1lZEJsb2Nrcy5sZW5ndGggPiAwO1xyXG4gICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdCgnYmxvY2tlci51cGRhdGVCbG9ja2VyJyk7XHJcblxyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLnVuYmxvY2sgPSBmdW5jdGlvbihuYW1lKSB7XHJcblxyXG4gICAgICAgIGlmIChuYW1lKSB7XHJcbiAgICAgICAgICAgIHZhciBkb25lID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaCh0aGF0Lm5hbWVkQmxvY2tzLCBmdW5jdGlvbihibG9jaywgaW5kZXgpIHtcclxuICAgICAgICAgICAgICAgIGlmIChibG9jay5uYW1lID09IG5hbWUgJiYgIWRvbmUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGF0Lm5hbWVkQmxvY2tzLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZG9uZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoYXQuYmxvY2tDb3VudC0tO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhhdC5ibG9ja1VJID0gdGhhdC5ibG9ja0NvdW50ID4gMCB8fCB0aGF0Lm5hbWVkQmxvY2tzLmxlbmd0aCA+IDA7XHJcbiAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdibG9ja2VyLnVwZGF0ZUJsb2NrZXInKTtcclxuXHJcbiAgICB9O1xyXG5cclxuXHJcbn0pOyIsImFuZ3VsYXIubW9kdWxlKCdBcHAnKS5zZXJ2aWNlKCdMb2dpbicsIGZ1bmN0aW9uKCRyb290U2NvcGUsICRpbnRlcnZhbCwgQXBpKSB7XHJcblxyXG4gICAgdmFyIHVzZXIgPSBudWxsO1xyXG4gICAgdmFyIGNyZWRpdHMgPSBudWxsO1xyXG4gICAgLy92YXIgSldUICAgICA9IG51bGw7XHJcbiAgICB2YXIgbG9hZGVkID0gZmFsc2U7XHJcblxyXG4gICAgZnVuY3Rpb24gdXBkYXRlU3RhdHVzKCkge1xyXG4gICAgICAgIEFwaS5jYWxsKHtcclxuICAgICAgICAgICAgdXJsOiAnbG9naW4vc3RhdHVzJyxcclxuICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHVzZXIgPSBkYXRhLnVzZXIgfHwgbnVsbDtcclxuICAgICAgICAgICAgICAgIC8vIGNyZWRpdHMgPSBkYXRhLmNyZWRpdHMgfHwgMDtcclxuICAgICAgICAgICAgICAgIC8vSldUICAgICA9IGRhdGEuand0IHx8IG51bGw7XHJcbiAgICAgICAgICAgICAgICBsb2FkZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlU3RhdHVzKCk7XHJcblxyXG4gICAgZnVuY3Rpb24gbG9nV2l0aFlvdXR1YmUoKSB7XHJcblxyXG4gICAgICAgIHZhciBwb3B1cCA9IHdpbmRvdy5vcGVuKFwiYXV0aC95b3V0dWJlXCIsICdzb2NpYWxMb2dpbicsICd3aWR0aD00NTAsaGVpZ2h0PTYwMCxsb2NhdGlvbj0wLG1lbnViYXI9MCxyZXNpemFibGU9MSxzY3JvbGxiYXJzPTAsc3RhdHVzPTAsdGl0bGViYXI9MCx0b29sYmFyPTAnKTtcclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgcG9wdXAuZm9jdXMoKTtcclxuXHJcbiAgICAgICAgICAgIHZhciBwb3B1cEludGVydmFsID0gJGludGVydmFsKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFwb3B1cCB8fCBwb3B1cC5jbG9zZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVTdGF0dXMoKTtcclxuICAgICAgICAgICAgICAgICAgICAkaW50ZXJ2YWwuY2FuY2VsKHBvcHVwSW50ZXJ2YWwpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCAyMDApO1xyXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgYWxlcnQoXCJJdCBsb29rcyBsaWtlIHlvdSBhcmUgdXNpbmcgYSBwb3B1cCBibG9ja2VyLiBQbGVhc2UgYWxsb3cgdGhpcyBvbmUgaW4gb3JkZXIgdG8gbG9naW4uIFRoYW5rcyFcIik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGxvZ2dlZEluOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuICEhdXNlclxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgbG9nT3V0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgQXBpLmNhbGwoe1xyXG4gICAgICAgICAgICAgICAgdXJsOiAnbG9naW4vbG9nb3V0JyxcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ3Bvc3QnLFxyXG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6IHVwZGF0ZVN0YXR1c1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdXBkYXRlU3RhdHVzOiB1cGRhdGVTdGF0dXMsXHJcbiAgICAgICAgbG9nV2l0aFlvdXR1YmU6IGxvZ1dpdGhZb3V0dWJlLFxyXG4gICAgICAgIGdldFVzZXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdXNlcjtcclxuICAgICAgICB9LFxyXG4gICAgICAgIC8vZ2V0SldUOiAgICAgICBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgLy8gICAgcmV0dXJuIEpXVDtcclxuICAgICAgICAvL30sXHJcbiAgICAgICAgaXNMb2FkZWQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbG9hZGVkO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG59KTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
