const prisma = require('../config/db');
const { success, created } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');

exports.create = asyncHandler(async (req, res) => {
  const proyecto = await prisma.proyecto.create({
    data: {
      nombre: req.body.nombre,
      nodes: typeof req.body.nodes === 'string' ? req.body.nodes : JSON.stringify(req.body.nodes || req.body.data?.nodes || []),
      edges: typeof req.body.edges === 'string' ? req.body.edges : JSON.stringify(req.body.edges || req.body.data?.edges || []),
      metadata: req.body.metadata ? (typeof req.body.metadata === 'string' ? req.body.metadata : JSON.stringify(req.body.metadata)) : null,
      userId: req.user?.id || null
    }
  });

  created(res, proyecto);
});

exports.getAll = asyncHandler(async (req, res) => {
  const proyectos = await prisma.proyecto.findMany({
    where: { userId: req.user?.id || null }
  });

  // Parse JSON strings back to objects with error handling
  const proyectosParsed = proyectos.map(p => {
    try {
      return {
        ...p,
        nodes: p.nodes ? JSON.parse(p.nodes) : [],
        edges: p.edges ? JSON.parse(p.edges) : [],
        metadata: p.metadata ? JSON.parse(p.metadata) : null
      };
    } catch (error) {
      return {
        ...p,
        nodes: [],
        edges: [],
        metadata: null,
        parseError: true
      };
    }
  });

  success(res, proyectosParsed);
});
