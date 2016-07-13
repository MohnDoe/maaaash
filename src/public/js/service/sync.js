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