var fs = require("fs");
var _ = require("lodash");
var App = require("../server");
var Config = require("./config");
var debug = require('debug')('web');
var auth = require('./auth/index');
var Validate = require('validate.js');
var Promise = require('bluebird');

//var endpoints = {};

module.exports = {
    init: function() {

        console.log("Loading API endpoints")

        //Read though the files
        var files = fs.readdirSync(__dirname + "/../api");
        for (var i = 0; i < files.length; i++) {

            //Just making sure that they are .js files
            if (files[i].indexOf('.js') == -1) continue;

            //For every thingamajig, set up the endpoints + auth
            var apiName = files[i].replace('.js', '');
            var endpoint = require("../api/" + files[i]);
            console.log("  - " + apiName);

            //todo: implement endpoint custom auth

            //Custom routes first, so that /resource/yaddayadda is caught before /resource/123
            if (endpoint.custom) {
                for (var j = 0; j < endpoint.custom.length; j++) {
                    var route = endpoint.custom[j];
                    console.log("    - (" + route.method + ")" + route.url);
                    App[(route.method || 'get').toLowerCase()](Config.server.apiBase + '/' + apiName + route.url, auth.middleware, this.generateAuthMiddleware(route), this.generateValidateMiddleware(route), route.handler);
                }
            }

            if (endpoint.crud.list) App.get(Config.server.apiBase + '/' + apiName, auth.middleware, this.generateAuthMiddleware(endpoint.crud.list), this.generateValidateMiddleware(endpoint.crud.list), endpoint.crud.list.handler);
            if (endpoint.crud.create) App.post(Config.server.apiBase + '/' + apiName, auth.middleware, this.generateAuthMiddleware(endpoint.crud.create), this.generateValidateMiddleware(endpoint.crud.create), endpoint.crud.create.handler);
            if (endpoint.crud.delete) App.delete(Config.server.apiBase + '/' + apiName, auth.middleware, this.generateAuthMiddleware(endpoint.crud.delete), this.generateValidateMiddleware(endpoint.crud.delete), endpoint.crud.delete.handler);
            if (endpoint.crud.update) App.put(Config.server.apiBase + '/' + apiName + "/:id", auth.middleware, this.generateAuthMiddleware(endpoint.crud.update), this.generateValidateMiddleware(endpoint.crud.update), endpoint.crud.update.handler);
            if (endpoint.crud.read) App.get(Config.server.apiBase + '/' + apiName + "/:id", auth.middleware, this.generateAuthMiddleware(endpoint.crud.read), this.generateValidateMiddleware(endpoint.crud.read), endpoint.crud.read.handler);

            //Todo: children. /post/123/comments
        }

        //Api invalid urls (valid urls will be handled before this)
        App.all([Config.server.apiBase + '/*', Config.server.apiBase], function(req, res) {
            res.status(404).send('Invalid endpoint: ' + req.method + ' ' + req.path);
        });

        console.log("API endpoints loaded");
    },

    generateAuthMiddleware: function(action) {
        return function(req, res, next) {

            //Login + certain status required?
            if (action.minUserStatus != null) {
                if (!req.user) {
                    res.status(401).send("You have to be logged in to perform this action");
                    return;
                }
                if (!req.user.status || req.user.status < action.minUserStatus) {
                    res.status(403).send("You do not have permission to perform this action");
                    return;
                }
            }

            //Todo: for children, add parent to req data.

            //Route has custom auth
            if (action.auth) {
                action.auth(req)
                    .then(function() {
                        return next();
                    })
                    .catch(function(error) {
                        //todo: error code
                        res.status(400).send(error.message);
                    });
            } else {
                //We are still here. Everything must be ok. Let's continue!
                next();
            }
        };

    },

    generateValidateMiddleware: function(action) {

        //todo: ensure arrays/strings are in order before continuing

        return function(req, res, next) {

            var promises = [];

            //Route has validation
            if (action.validate && action.validate.params) promises.push(Validate.async(req.params, action.validate.params));
            if (action.validate && action.validate.query) promises.push(Validate.async(req.query, action.validate.query));
            if (action.validate && action.validate.body) promises.push(Validate.async(req.body, action.validate.body));

            Promise.all(promises).then(function(paramsErrors, queryErrors, bodyErrors) {
                next();
            }).catch(function(err) {
                res.status(400).send(err);
                console.log(err);
            })

        };

    }
};