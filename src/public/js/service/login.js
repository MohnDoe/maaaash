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