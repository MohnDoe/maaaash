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
            handler: function(req, res, next) {
                res.status(200).json({
                    status: 'success',
                    data: {
                        levels: Ops.pointsOperators.getLevels()
                    }
                })
            }
        }
    },
};