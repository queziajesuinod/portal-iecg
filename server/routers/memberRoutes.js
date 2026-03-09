const express = require('express');
const memberController = require('../controllers/memberController');

const router = express.Router();

router.get('/stats', memberController.stats);
router.get('/activity-types', memberController.listActivityTypes);
router.post('/activity-types', memberController.createActivityType);
router.put('/activity-types/:typeId', memberController.updateActivityType);
router.patch('/activity-types/:typeId/active', memberController.setActivityTypeActive);
router.get('/', memberController.list);
router.get('/:id', memberController.getById);
router.post('/:id/activities', memberController.addActivity);
router.delete('/:id/activities/:activityId', memberController.deleteActivity);
router.post('/:id/milestones', memberController.addMilestone);
router.patch('/:id/journey', memberController.updateJourney);
router.post('/', memberController.create);
router.put('/:id', memberController.update);
router.delete('/:id', memberController.remove);

module.exports = router;
