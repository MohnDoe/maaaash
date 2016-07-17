var Models = require("../modules/models");
var Config = require("../modules/config");
var Promise = require("bluebird");
var _ = require("lodash");
var Passport = require("passport");
//var JWT      = require("jsonwebtoken");
//var utility  = require("../modules/utility");

var Ops = require('../operators');

module.exports = {
    crud: {},
    custom: [{
        url: '/logout',
        method: 'post',
        handler: function(req, res, next) {
            req.logout();
            res.sendStatus(200);
        }
    }, {
        url: '/status',
        method: 'get',
        handler: function(req, res, next) {
            if (req.user) {
                res.status(200).json({
                    status: 'success',
                    data: {
                        status: 'connected',
                        user: req.user,
                        jwt_token: Ops.usersOperators.createToken({
                            id: req.user.id
                        })
                    }
                });
            } else {
                res.status(200).json({
                    status: 'success',
                    data: {
                        status: 'notconnected'
                    }
                })
            }

        }
    }, {
        url: '/',
        method: 'get',
        handler: function(req, res, next) {
            // if (req.user) {
            //     res.status(200).json({
            //         status: 'success',
            //         data: {
            //             status: 'connected',
            //             user: req.user,
            //             jwt_token: Ops.usersOperators.createToken({
            //                 id: req.user.id
            //             })
            //         }
            //     });
            // } else {
            //     res.status(200).json({
            //         status: 'success',
            //         data: {
            //             status: 'notconnected'
            //         }
            //     })
            // }
        }
    }, {
        url: '/sync',
        method: 'get',
        minUserStatus: 2,
        handler: function(req, res, next) {
            if (req.user) {
                Ops.usersOperators.saveChannels(req.user)
                    .then(function(user) {
                        res.status(200).json({
                            status: 'success',
                            message: 'Channels successfully synced'
                        });
                    })
                    .catch(function(err) {
                        res.status(500).json({
                            status: 'error',
                            message: 'Internal Error!'
                        })
                    })
            } else {
                res.status(401).json({
                    status: 'error',
                    message: 'You must be logged in to do that'
                });
            }
        }
    }]

};