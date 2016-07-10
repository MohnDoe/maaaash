var express = require('express'),
	router = express.Router();

var votesController = require('../../controllers/votesController');
// var usersController = require('../../controllers/usersController');

/* VOTES GET */
// get a vote for a logged user
router.get('', votesController.getVote);
// get a vote by the hash_id
router.get('/:hash_id');
// get all votes corresponding to this identifier
router.get('/i/:identifier');
// get count of all completed vote
router.get('/completed');
// get count of all vote
router.get('/all');
// get count of all deleted vote
router.get('/deleted');
/* END VOTES GET */

/* VOTES POST */
// create a custom vote
router.post('/'); // might not do that

/* END VOTES POST */


/* VOTES PUT */
// set winner to a vote
router.put('/:hash_id/:winner');
// set a vote to a draw
router.put('/:hash_id/draw');
/* END VOTES PUT*/

/* VOTES DELETE */
// delete one vote
router.delete('/:hash_id');
/* END VOTES DELETE */



module.exports = router;