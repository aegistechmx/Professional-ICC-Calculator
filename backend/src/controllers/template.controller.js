const prisma = require('../config/db');
const { success, badRequest } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');
const templates = require('../data/templates');

// Allowed categoria values
const ALLOWED_CATEGORIAS = ['substation', 'panel', 'industrial', 'residential', 'commercial'];

exports.getAll = asyncHandler(async (req, res) => {
  const categoria = req.query.categoria;

  // Validate categoria parameter
  if (categoria && typeof categoria !== 'string') {
    return badRequest(res, 'Invalid categoria parameter');
  }

  // Validate categoria is in allowed values
  if (categoria && !ALLOWED_CATEGORIAS.includes(categoria)) {
    return badRequest(res, 'Invalid categoria value. Allowed values: ' + ALLOWED_CATEGORIAS.join(', '));
  }

  let filteredTemplates = templates;
  if (categoria) {
    filteredTemplates = templates.filter(t => t.categoria === categoria);
  }

  success(res, filteredTemplates);
});

exports.getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Validate id parameter
  if (!id || typeof id !== 'string') {
    return badRequest(res, 'Invalid template id');
  }

  const template = templates.find(t => t.nombre === id);

  if (!template) {
    return res.status(404).json({ success: false, error: 'Template not found' });
  }

  success(res, template);
});

exports.createFromDb = asyncHandler(async (req, res) => {
  // Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  const dbTemplates = await prisma.template.findMany({
    where: { isPublic: true }
  });

  const allTemplates = [...templates, ...dbTemplates];
  success(res, allTemplates);
});
