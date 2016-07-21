var Config = require('./config');
var Sequelize = require('sequelize');

module.exports = {
    init: function() {
        console.log('Init DB');
        this.instance = new Sequelize(Config.database.url, {
            pool: {
                maxConnections: process.env.NODE_ENV == 'production' ? 15 : 10,
                minConnections: 1,
                //maxIdleTime:    10000
            },
            dialectOptions: {
                // ssl: process.env.SQL_SSL === 'false' ? false : true,
            },
            // logging: console.log,
            logging: false,
            sync: true,
            // force: true,
            define: {
                syncOnAssociation: true,
                charset: 'utf8', //utf8mb4 Allows for emoji but gives shit, sort out
                // charset: 'utf8mb4', //utf8mb4 Allows for emoji but gives shit, sort out
                //collate:           "utf8_general_ci",
                underscored: true,
                timestamps: true, //createdAt and updatedAt
                paranoid: true, //Doesn't delete anything from the database, instead, sets deletedAt (requires timestamps) -> disabled for several reasons -> i thought it would magically not include them in selects, plus some issues with Count / joins
                freezeTableName: false, //false -> names are pluralized
            }
        });

        return this.instance.authenticate();
    },
    instance: null
};