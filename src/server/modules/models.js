var Promise = require("bluebird");
var Config = require("./config");
var fs = require("fs");

module.exports = {
    init: function() {
        delete module.exports.init;
        console.log("Loading models");
        return new Promise(function(resolve, reject) {
            var file, files, i, k, len, model, models;
            models = {};
            files = fs.readdirSync(__dirname + "/../models");
            for (i = 0, len = files.length; i < len; i++) {
                var file = files[i];
                console.log("  - " + file.replace('.js', ''));
                models[file.replace('.js', '')] = require("../models/" + file);
                module.exports[file.replace('.js', '')] = models[file.replace('.js', '')];
            }

            for (k in models) {
                model = models[k];
                if (typeof model.init === "function") {
                    model.init(models);
                }
            }

            return require("./db").instance.sync().then(function() {
                console.log("Models loaded and synchronized");
                return resolve();
            });

        });
    }
};