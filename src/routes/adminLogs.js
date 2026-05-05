const express = require('express');
const router = express.Router();
const prisma = require('../data/prisma');

router.get('/', async (req, res) => {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
  });

  res.json(logs);
});

module.exports = router;
