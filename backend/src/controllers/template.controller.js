const prisma = require('../config/db');
const { success } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/errorHandler');
const templates = require('../data/templates');

exports.getAll = asyncHandler(async (req, res) => {
  const categoria = req.query.categoria;

  let filteredTemplates = templates;
  if (categoria) {
    filteredTemplates = templates.filter(t => t.categoria === categoria);
  }

  success(res, filteredTemplates);
});

exports.getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const template = templates.find(t => t.nombre === id);

  if (!template) {
    return res.status(404).json({ success: false, error: 'Template not found' });
  }

  success(res, template);
});

exports.createFromDb = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const dbTemplates = await prisma.template.findMany({
    where: { isPublic: true }
  });

  const allTemplates = [...templates, ...dbTemplates];
  success(res, allTemplates);
});
