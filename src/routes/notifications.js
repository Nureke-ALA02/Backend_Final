const express = require('express');
const router = express.Router();
const prisma = require('../data/prisma');

router.get('/', async (req, res) => {
  const data = await prisma.notification.findMany();
  res.json(data);
});

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);

  const updated = await prisma.notification.update({
    where: { id },
    data: { read: true },
  });

  res.json(updated);
});

module.exports = router;
