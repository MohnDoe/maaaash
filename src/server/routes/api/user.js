var express = require('express'),
	router = express.Router();

var usersController = require('../../controllers/usersController');

/* USERS GET */
// get info about connected user
router.get('/', usersController.getStatus);
// get a user by ID
router.get('/:id');
// get count of all user
router.get('/all');
// get count of all deleted user
router.get('/deleted');
/* END USERS GET */

/* USERS POST */
// create a custom user
router.post('/');

/* END USERS POST */


/* USERS PUT */

/* END USERS PUT*/

/* USERS DELETE */
// delete one user
router.delete('/:id');
/* END USERS DELETE */



module.exports = router;