var Promise = require("bluebird");

module.exports = {
  up: function(queryInterface, Sequelize) {
    //http://docs.sequelizejs.com/en/latest/docs/migrations/
    //logic for transforming into the new state
    return new Promise(function(resolve, reject) {
      queryInterface.changeColumn('channels', 'banner_url', {
        type: Sequelize.TEXT
      });
      queryInterface.changeColumn('channels', 'thumbnail_url', {
        type: Sequelize.TEXT
      });
      resolve();
    })
  },

  down: function(queryInterface, Sequelize) {
    // logic for reverting the changes
  }
};