const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/auth');

// GET /projects - List all projects for authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const projects = await prisma.proyecto.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        nombre: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener proyectos'
    });
  }
});

// GET /projects/:id - Get single project with full data
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await prisma.proyecto.findFirst({
      where: {
        id: parseInt(req.params.id),
        userId: req.user.id
      }
    });
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Proyecto no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener proyecto'
    });
  }
});

// POST /projects - Create new project
router.post('/', auth, async (req, res) => {
  try {
    const { nombre, datos } = req.body;
    
    if (!nombre) {
      return res.status(400).json({
        success: false,
        error: 'Nombre del proyecto es requerido'
      });
    }
    
    const project = await prisma.proyecto.create({
      data: {
        nombre,
        datos: datos || {},
        userId: req.user.id
      }
    });
    
    res.status(201).json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear proyecto'
    });
  }
});

// PUT /projects/:id - Update project
router.put('/:id', auth, async (req, res) => {
  try {
    const { nombre, datos } = req.body;
    
    // Verify project belongs to user
    const existing = await prisma.proyecto.findFirst({
      where: {
        id: parseInt(req.params.id),
        userId: req.user.id
      }
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Proyecto no encontrado'
      });
    }
    
    const project = await prisma.proyecto.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(nombre && { nombre }),
        ...(datos && { datos }),
        updatedAt: new Date()
      }
    });
    
    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar proyecto'
    });
  }
});

// DELETE /projects/:id - Delete project
router.delete('/:id', auth, async (req, res) => {
  try {
    // Verify project belongs to user
    const existing = await prisma.proyecto.findFirst({
      where: {
        id: parseInt(req.params.id),
        userId: req.user.id
      }
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Proyecto no encontrado'
      });
    }
    
    await prisma.proyecto.delete({
      where: { id: parseInt(req.params.id) }
    });
    
    res.json({
      success: true,
      message: 'Proyecto eliminado'
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar proyecto'
    });
  }
});

// POST /projects/:id/save - Quick save project data (nodes/edges)
router.post('/:id/save', auth, async (req, res) => {
  try {
    const { nodes, edges } = req.body;
    
    // Verify project belongs to user
    const existing = await prisma.proyecto.findFirst({
      where: {
        id: parseInt(req.params.id),
        userId: req.user.id
      }
    });
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Proyecto no encontrado'
      });
    }
    
    const project = await prisma.proyecto.update({
      where: { id: parseInt(req.params.id) },
      data: {
        datos: {
          ...existing.datos,
          nodes,
          edges,
          savedAt: new Date().toISOString()
        },
        updatedAt: new Date()
      }
    });
    
    res.json({
      success: true,
      data: project,
      message: 'Proyecto guardado'
    });
  } catch (error) {
    console.error('Error saving project:', error);
    res.status(500).json({
      success: false,
      error: 'Error al guardar proyecto'
    });
  }
});

module.exports = router;
