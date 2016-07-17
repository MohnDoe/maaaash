var Redis = require("redis");
var Config = require("./config");
var Promise = require("bluebird");

var client = null;

module.exports = {
    init: function() {
        var that = this;
        return new Promise(function(resolve, reject) {
            that.client = client = Redis.createClient({
                url: Config.database.url_redis
            });

            client.on('ready', function() {
                resolve()
            });

        });
    },
    client: null
};