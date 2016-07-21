var Promise = require("bluebird");

module.exports = {
  up: function(queryInterface, Sequelize) {
    //http://docs.sequelizejs.com/en/latest/docs/migrations/
    //logic for transforming into the new state

    return queryInterface.addColumn('channels', 'banner_url', {
      type: Sequelize.STRING
    });
  },

  down: function(queryInterface, Sequelize) {
    // logic for reverting the changes
  }
};