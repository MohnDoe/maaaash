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