/**
 * infrastructure/repositories/study.repository.js - Persistencia de Estudios
 * Guarda y recupera estudios eléctricos completos
 */

/* eslint-disable no-console */
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

class StudyRepository {
  constructor() {
    this.dataDir = path.resolve(__dirname, '../../../data/studies');
    this.engineVersion = '2.1.0';
    this.standards = ['IEEE 1584', 'IEC 60909', 'NOM-001-SEDE-2012'];
  }

  /**
   * Inicializar directorio de datos
   */
  async initialize() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      console.log(`[REPO] Studies directory initialized: ${this.dataDir}`);
    } catch (error) {
      console.error('[REPO] Error initializing studies directory:', error.message);
    }
  }

  /**
   * Guardar estudio completo
   * @param {Object} input - Datos de entrada del estudio
   * @param {Object} result - Resultados del cálculo
   * @param {Object} metadata - Metadatos adicionales
   * @returns {Promise<Object>} Estudio guardado
   */
  async saveStudy(input, result, metadata = {}) {
    const studyId = uuidv4();
    const timestamp = new Date().toISOString();

    const study = {
      id: studyId,
      input: this.sanitizeInput(input),
      result: this.sanitizeResult(result),
      metadata: {
        ...metadata,
        createdAt: timestamp,
        updatedAt: timestamp,
        engineVersion: this.engineVersion,
        standards: this.standards,
        status: 'completed'
      },
      validation: {
        inputValid: true,
        resultValid: true,
        errors: [],
        warnings: []
      }
    };

    try {
      // Guardar en archivo JSON
      const filePath = path.join(this.dataDir, `${studyId}.json`);
      await fs.writeFile(filePath, JSON.stringify(study, null, 2));

      // Guardar en índice
      await this.updateIndex(study);

      console.log(`[REPO] Study saved: ${studyId}`);
      return study;

    } catch (error) {
      console.error(`[REPO] Error saving study ${studyId}:`, error.message);
      throw new Error(`Failed to save study: ${error.message}`);
    }
  }

  /**
   * Obtener estudio por ID
   * @param {string} studyId - ID del estudio
   * @returns {Promise<Object|null>} Estudio encontrado o null
   */
  async getStudy(studyId) {
    try {
      const filePath = path.join(this.dataDir, `${studyId}.json`);
      const data = await fs.readFile(filePath, 'utf8');
      const study = JSON.parse(data);

      console.log(`[REPO] Study retrieved: ${studyId}`);
      return study;

    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`[REPO] Study not found: ${studyId}`);
        return null;
      }
      console.error(`[REPO] Error retrieving study ${studyId}:`, error.message);
      throw new Error(`Failed to retrieve study: ${error.message}`);
    }
  }

  /**
   * Listar estudios con filtros
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Promise<Array>} Lista de estudios
   */
  async listStudies(filters = {}) {
    try {
      const index = await this.getIndex();
      let studies = index.studies || [];

      // Aplicar filtros
      if (filters.status) {
        studies = studies.filter(study => study.metadata.status === filters.status);
      }

      if (filters.engineVersion) {
        studies = studies.filter(study => study.metadata.engineVersion === filters.engineVersion);
      }

      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        studies = studies.filter(study => new Date(study.metadata.createdAt) >= fromDate);
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        studies = studies.filter(study => new Date(study.metadata.createdAt) <= toDate);
      }

      // Ordenar por fecha descendente
      studies.sort((a, b) => new Date(b.metadata.createdAt) - new Date(a.metadata.createdAt));

      // Limitar resultados
      const limit = filters.limit || 50;
      studies = studies.slice(0, limit);

      console.log(`[REPO] Found ${studies.length} studies`);
      return studies;

    } catch (error) {
      console.error('[REPO] Error listing studies:', error.message);
      throw new Error(`Failed to list studies: ${error.message}`);
    }
  }

  /**
   * Actualizar estudio existente
   * @param {string} studyId - ID del estudio
   * @param {Object} updates - Datos a actualizar
   * @returns {Promise<Object>} Estudio actualizado
   */
  async updateStudy(studyId, updates) {
    try {
      const study = await this.getStudy(studyId);
      if (!study) {
        throw new Error('Study not found');
      }

      // Actualizar campos
      if (updates.input) {
        study.input = this.sanitizeInput(updates.input);
      }

      if (updates.result) {
        study.result = this.sanitizeResult(updates.result);
      }

      if (updates.metadata) {
        study.metadata = {
          ...study.metadata,
          ...updates.metadata,
          updatedAt: new Date().toISOString()
        };
      }

      // Guardar cambios
      const filePath = path.join(this.dataDir, `${studyId}.json`);
      await fs.writeFile(filePath, JSON.stringify(study, null, 2));

      // Actualizar índice
      await this.updateIndex(study);

      console.log(`[REPO] Study updated: ${studyId}`);
      return study;

    } catch (error) {
      console.error(`[REPO] Error updating study ${studyId}:`, error.message);
      throw new Error(`Failed to update study: ${error.message}`);
    }
  }

  /**
   * Eliminar estudio
   * @param {string} studyId - ID del estudio
   * @returns {Promise<boolean>} True si se eliminó
   */
  async deleteStudy(studyId) {
    try {
      const filePath = path.join(this.dataDir, `${studyId}.json`);
      await fs.unlink(filePath);

      // Remover del índice
      await this.removeFromIndex(studyId);

      console.log(`[REPO] Study deleted: ${studyId}`);
      return true;

    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`[REPO] Study not found for deletion: ${studyId}`);
        return false;
      }
      console.error(`[REPO] Error deleting study ${studyId}:`, error.message);
      throw new Error(`Failed to delete study: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas de estudios
   * @returns {Promise<Object>} Estadísticas
   */
  async getStats() {
    try {
      const index = await this.getIndex();
      const studies = index.studies || [];

      const stats = {
        total: studies.length,
        byStatus: {},
        ByVersion: {},
        byMonth: {},
        recent: studies.filter(s => {
          const days = (Date.now() - new Date(s.metadata.createdAt)) / (1000 * 60 * 60 * 24);
          return days <= 30;
        }).length
      };

      // Agrupar por estado
      studies.forEach(study => {
        const status = study.metadata.status || 'unknown';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

        const version = study.metadata.engineVersion || 'unknown';
        stats.byVersion[version] = (stats.byVersion[version] || 0) + 1;

        const month = new Date(study.metadata.createdAt).toISOString().substring(0, 7);
        stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;
      });

      console.log('[REPO] Stats calculated');
      return stats;

    } catch (error) {
      console.error('[REPO] Error getting stats:', error.message);
      return {
        total: 0,
        byStatus: {},
        byVersion: {},
        byMonth: {},
        recent: 0
      };
    }
  }

  /**
   * Obtener índice de estudios
   */
  async getIndex() {
    try {
      const indexPath = path.join(this.dataDir, 'index.json');
      const data = await fs.readFile(indexPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { studies: [], lastUpdated: new Date().toISOString() };
      }
      throw error;
    }
  }

  /**
   * Actualizar índice de estudios
   */
  async updateIndex(study) {
    try {
      const index = await this.getIndex();

      // Remover entrada existente si hay
      index.studies = index.studies.filter(s => s.id !== study.id);

      // Agregar nueva entrada
      index.studies.push({
        id: study.id,
        input: {
          I_carga: study.input.I_carga,
          material: study.input.material,
          voltaje: study.input.voltaje
        },
        metadata: study.metadata,
        result: {
          ampacidadFinal: study.result.ampacidad?.I_final,
          conductor: study.result.conductor?.calibre,
          validacion: study.result.validation?.ok
        }
      });

      index.lastUpdated = new Date().toISOString();

      const indexPath = path.join(this.dataDir, 'index.json');
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2));

    } catch (error) {
      console.error('[REPO] Error updating index:', error.message);
    }
  }

  /**
   * Remover del índice
   */
  async removeFromIndex(studyId) {
    try {
      const index = await this.getIndex();
      index.studies = index.studies.filter(s => s.id !== studyId);
      index.lastUpdated = new Date().toISOString();

      const indexPath = path.join(this.dataDir, 'index.json');
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2));

    } catch (error) {
      console.error('[REPO] Error removing from index:', error.message);
    }
  }

  /**
   * Sanitizar input para almacenamiento
   */
  sanitizeInput(input) {
    const sanitized = { ...input };

    // Remover campos sensibles o innecesarios
    delete sanitized.timestamp;
    delete sanitized.jobId;

    return sanitized;
  }

  /**
   * Sanitizar resultado para almacenamiento
   */
  sanitizeResult(result) {
    const sanitized = { ...result };

    // Remover campos muy grandes si es necesario
    if (sanitized.performance && sanitized.performance.duration) {
      // Mantener solo métricas importantes
      sanitized.performance = {
        duration: sanitized.performance.duration,
        workerThread: sanitized.performance.workerThread
      };
    }

    return sanitized;
  }
}

// Singleton instance
const studyRepository = new StudyRepository();

// Inicializar al cargar
studyRepository.initialize();

module.exports = {
  saveStudy: (input, result, metadata) => studyRepository.saveStudy(input, result, metadata),
  getStudy: (studyId) => studyRepository.getStudy(studyId),
  listStudies: (filters) => studyRepository.listStudies(filters),
  updateStudy: (studyId, updates) => studyRepository.updateStudy(studyId, updates),
  deleteStudy: (studyId) => studyRepository.deleteStudy(studyId),
  getStats: () => studyRepository.getStats()
};
