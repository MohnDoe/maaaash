var Mixpanel = require('mixpanel');
var Config = require('./config');
var mixpanel = Mixpanel.init(Config.mixpanel.token);

module.exports = mixpanel;