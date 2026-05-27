const { Router } = require('express');
const controller = require('../controllers/youtubeChannelController');

const router = Router();

router.get('/oauth/callback', controller.oauthCallback);

module.exports = router;
