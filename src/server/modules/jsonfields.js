//I can probably turn this into a Sequelize plugin

var _ = require("lodash");

module.exports = function(object, user) {
    return toJson(object, user);
};

function toJson(object, user) {
    if (Object.prototype.toString.call(object) === '[object Array]') {

        var a = [];
        _.forEach(object, function(thing) {
            a.push(toJson(thing, user));
        });

        return a;

    } else if (typeof object.toJSON == "function") {

        return object.toJSON(!!(user && user.status >= 4));

    } else {

        return object;

    }
}