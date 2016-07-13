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