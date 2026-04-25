const prisma = require('../config/db');
const { success, created, notFound } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

exports.create = asyncHandler(async (req, res) => {
  const proyecto = await prisma.proyecto.create({
    data: {
      nombre: req.body.nombre,
      data: req.body.data,
      userId: req.user.id
    }
  });

  created(res, proyecto);
});

exports.getAll = asyncHandler(async (req, res) => {
  const proyectos = await prisma.proyecto.findMany({
    where: { userId: req.user.id }
  });

  success(res, proyectos);
});
