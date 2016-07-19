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