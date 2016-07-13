var express = require('express'),
	router = express.Router();

var usersController = require('../../controllers/usersController');

var isAuthenticated = function(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}

	res.status(401).json({
		status: 'error',
		message: 'You need to be logged in to do that'
	});
}

/* USERS GET */
// get info about connected user
router.get('/', usersController.getStatus);
// get a user by ID
router.get('/sync', isAuthenticated, usersController.syncChannels);
router.get('/:id');
// get a user by ID
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