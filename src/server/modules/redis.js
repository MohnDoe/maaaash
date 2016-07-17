var Redis = require("redis");
var Config = require("./config");
var Promise = require("bluebird");

var client = null;

module.exports = {
    init: function() {
        var that = this;
        return new Promise(function(resolve, reject) {
            that.client = client = Redis.createClient({
                url: 'redis://h:pb0qql1fh8l09sbmekmk18bo9hn@ec2-79-125-15-126.eu-west-1.compute.amazonaws.com:13849'
            });

            client.on('ready', function() {
                resolve()
            });

        });
    },
    client: null
};