var Models = require("../modules/models");
var Config = require("../modules/config");
var Promise = require("bluebird");
var _ = require("lodash");
var Ops = require('../operators');

module.exports = {
    crud: {
        read: {
            handler: function(req, res, next) {
                var nameBoard = 'Global';
                var idBoard = 'GlobalUsers';
                if (req.params.id == 'global') {
                    nameBoard = 'Global';
                    idBoard = 'GlobalUsers';
                } else if (req.params.id == 'weekly') {
                    nameBoard = 'Weekly';
                    idBoard = 'WeeklyUsers';
                } else if (req.params.id == 'daily') {
                    nameBoard = 'Daily';
                    idBoard = 'DailyUsers';
                }


                Ops.leaderboardsOperators.getLeaderboard(idBoard)
                    .then(function(listUsers) {
                        res.status(200).json({
                            status: 'success',
                            data: {
                                leaderboard: {
                                    name: nameBoard,
                                    users: listUsers
                                }
                            }
                        })
                    })
                    .catch(function(err) {
                        res.status(500).json({
                            status: 'error',
                            message: 'Internal Error!',
                            error: err.message
                        })
                    })
            }
        }
    },
};