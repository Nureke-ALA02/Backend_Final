const express = require('express');
const router = express.Router();
const prisma = require('../data/prisma');

router.get('/', async (req, res) => {
  const data = await prisma.child.findMany({
    orderBy: { xp: 'desc' },
    take: 10,
  });

  res.json(data);
});

module.exports = router;
