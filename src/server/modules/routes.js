var App, Config, Express;

//Todo: We might be able to delete this entire file - We won't have any real routes besides the API (handled in api.js) - the rest is Angular.

Config = require('./config');
App = require('../server');
Express = require('express');

if (Config.server.corsEnabled) {
    //MISC - Allow CORS (api only)
    App.all('/api/*', function(req, res, next) {
        res.status(200);
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        next();
    });
    App.options('*', function(req, res) {
        res.sendStatus(200);
    });
    return;
}

//Regular static files, and if not found, the index file. Angular will handle 404's - This should come at the very LAST
var cacheAge = process.env.NODE_ENV == 'production' ? 86400000 : 0; //One day
App.use(Express.static(__dirname + '/../../../dist/public', {
    maxAge: cacheAge
}));
App.use(function(req, res) {
    //todo: read file and inject meta shit + if dev, no maxage
    res.sendFile('index.html', {
        root: __dirname + '/../../../dist/public'
    });
});

//Handle errors
//Todo: overhaul this
App.use(function(err, req, res, next) {

    if (err.name == 'ValidationError') {

        var messages = {};
        var messagesArray = [];
        for (var field in err.errors) {
            if (!err.errors.hasOwnProperty(field)) continue;
            messages[field] = err.errors[field].message;
            messagesArray.push(err.errors[field].message);
        }

        //if (req.xhr) {
        res.status(400).send(messages);
        //} else {
        //    res.status(400).send(messagesArray.join("<br>"));
        //}

    } else {

        //  http://www.bennadel.com/blog/2828-creating-custom-error-objects-in-node-js-with-error-capturestacktrace.htm
        //console.log(err);
        console.log(err.stack);
        //res.status(err.httpStatus ? err.httpStatus : 400).send(err.customMessage ? err.customMessage : err.message);
        res.status(500).send(err.message);

        //if (process.env.NODE_ENV != 'production') {

        //console.log(err.captureStackTrace(this));

        //res.status(500).send(err.message);
        //}

        //TODO URGENT

        //Still unhandled,
        //  In development -> spit out the a 500 message and continue.
        //  In production or anything else -> spit out a generic 500 message, stop accepting new requests, email developers, and shut down the server in 5 seconds

        //if (process.env.NODE_ENV == 'development') {
        //    res.status(500).send("UNHANDLED: " + err.message);
        //
        //} else {
        //
        //    console.error("!! UNHANDLED EXCEPTION - SHUTTING DOWN SERVER !!");
        //    console.error(err);
        //    res.status(500).send("Something has gone wrong. Our developers have been notified. This is not your fault");
        //    App.server.close();
        //    setTimeout(function () {
        //        process.exit(1);
        //    }, 5000);
        //
        //}

    }
});