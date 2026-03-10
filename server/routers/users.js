const { Router } = require('express');
const express = require('express');
const {
  getUsers,
  postUsers,
  getUserDetalhe,
  putUser,
  getUserComConjuge,
  postSyncUserMember,
  postSyncAllUserMembers
} = require('../controllers/users');

const router = Router();

router.use(express.json());

router.get('/', getUsers);
router.post('/sync-members', postSyncAllUserMembers);
router.post('/:id/sync-member', postSyncUserMember);
router.get('/:id/spouse', getUserComConjuge);
router.get('/:id', getUserDetalhe);
router.post('/', postUsers);
router.put('/:id', putUser);

module.exports = router;
