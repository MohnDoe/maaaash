var Models = require("../modules/models");
var Config = require("../modules/config");
var Promise = require("bluebird");
var _ = require("lodash");
//var JWT      = require("jsonwebtoken");
//var utility  = require("../modules/utility");

var Ops = require('../operators');

module.exports = {
    crud: {
        list: {
            minUserStatus: 2,
            handler: function(req, res, next) {
                Ops.channelsOperators.getTopChannels()
                    .then(function(channels) {
                        res.status(200).json({
                            status: 'success',
                            data: {
                                channels: channels
                            }
                        })
                    })
                    .catch(function(err) {
                        res.status(500).json({
                            status: 'error',
                            message: 'Internal Error!'
                        });
                    })
            }
        }
    },
};