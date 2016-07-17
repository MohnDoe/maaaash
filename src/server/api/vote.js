var Models = require("../modules/models");
var Config = require("../modules/config");
var Promise = require("bluebird");
var _ = require("lodash");
var JsonFields = require("../modules/jsonfields");
var Ops = require('../operators');

module.exports = {
    crud: {

        read: {
            handler: function(req, res, next) {
                console.log('vote.read');
                if (req.params.id) {
                    Ops.votesOperators.existsByHashID(req.params.id)
                        .then(function(vote) {
                            res.status(200).json({
                                status: 'succes',
                                data: {
                                    vote: vote
                                }
                            })
                        }).catch(function(err) {
                            res.status(404).json({
                                status: 'error',
                                message: 'Not Found!'
                            })
                        });
                } else {
                    res.status(400).json({
                        status: 'error',
                        message: 'No Hash ID?! Where am I suppose to find something without a clue?!'
                    })
                }

            }
        },
        update: {
            // set a winner to a vote
            minUserStatus: 2,
            handler: function(req, res, next) {
                console.log('vote.update');
                if (req.params.id && req.body.winner) {
                    Ops.usersOperators.vote(req.params.id, req.body.winner)
                        .then(function(points) {
                            res.status(200).json({
                                status: 'success',
                                data: {
                                    points: points
                                }
                            })
                        })
                        .catch(function(err) {
                            res.status(500).json({
                                status: 'error',
                                message: 'Internal Error! Here',
                                err: err.message
                            });
                        })
                } else {
                    res.status(400).json({
                        status: 'error',
                        message: 'No Hash ID nor Winner ?! No idea what to do'
                    })
                }
            }
        }
    },
    custom: [{
            url: '/new',
            method: 'get',
            minUserStatus: 2,
            handler: function(req, res, next) {
                Ops.usersOperators.getVote(req.user)
                    .then(function(vote) {
                        res.status(200).json({
                            status: 'success',
                            data: {
                                vote: vote
                            }
                        });

                    }).catch(function(err) {
                        res.status(500).json({
                            status: 'error',
                            message: 'Internal Error!',
                            err: err.message
                        });
                    });
            }
        }

    ]

};