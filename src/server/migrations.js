var Config = require("./modules/config");
var DB = require("./modules/db");
var Models = require("./modules/models");
var Promise = require("bluebird");
var Umzug = require("umzug");
var _ = require("lodash");
var Sequelize = require("sequelize");

var umzug;

DB.init().then(function() {

    umzug = new Umzug({
        //https://github.com/sequelize/umzug
        storage: 'sequelize',
        storageOptions: {
            sequelize: DB.instance,
            tableName: 'migrations'
        },
        logging: console.log,
        migrations: {
            params: [DB.instance.getQueryInterface(), Sequelize],
            path: __dirname + '/migrations'
        }
    });

    return umzug.up();

}).then(function() {

    console.log("All done!");
    process.exit();

}).catch(function(err) {
    console.error(err);
    console.error(err.stack);
    //console.error(err.captureStackTrace(this, 50));
});