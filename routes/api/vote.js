var express = require('express'),
	router = express.Router();

var votesController = require('../../controllers/votesController');
// var usersController = require('../../controllers/usersController');

/* VOTES GET */
// get list of all votes
router.get('', votesController.getVote);
// get a vote
router.get('/:id');
// get COUNT of likes & dislikes on a vote
router.get('/:id/likes');
/* END VOTES GET */

/* VOTES POST */
// add a vote
router.post('');
// add a song to a vote
router.post('/:id/song');
// add an artists from a vote
router.post('/:id/artist');
/* END VOTES POST */


/* VOTES PUT */
// edit a vote
router.put('/:id');
// increment popularity of a vote
router.put('/:id/popularity');
// increment views count of a vote
router.put('/:id/views');
/* END VOTES PUT*/

/* VOTES DELETE */
// delete one vote
router.delete('/:id');
/* END VOTES DELETE */



module.exports = router;