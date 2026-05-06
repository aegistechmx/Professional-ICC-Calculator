/**
 * shared/utils/engineVersioning.js - Engine Versioning System
 * Control de versiones del motor de cálculo para consistencia
 */

class EngineVersioningService {
  constructor() {
    this.currentVersion = '2.1.0'; // current (A)
    this.versions = {
      '1.0.0': {
        description: 'Initial version - Basic ICC calculation',
        released: '2026-01-01',
        deprecated: false,
        changes: ['Basic short circuit calculation', 'Simple voltage drop']
      },
      '2.0.0': {
        description: 'Enterprise architecture - Workers and caching',
        released: '2026-04-01',
        deprecated: false,
        changes: ['Worker threads', 'Intelligent caching', 'Job queue', 'Security layer']
      },
      '2.1.0': {
        description: 'Advanced pipeline - Multi-mode calculations',
        released: '2026-04-29',
        deprecated: false,
        changes: ['PRO pipeline', 'Multiple calculation modes', 'Enhanced validation', 'Observability']
      }
    };

    this.compatibilityMatrix = {
      '1.0.0': {
        compatibleWith: ['1.0.0'],
        incompatibleWith: ['2.0.0', '2.1.0'],
        migrationRequired: true
      },
      '2.0.0': {
        compatibleWith: ['2.0.0', '2.1.0'],
        incompatibleWith: ['1.0.0'],
        migrationRequired: false
      },
      '2.1.0': {
        compatibleWith: ['2.0.0', '2.1.0'],
        incompatibleWith: ['1.0.0'],
        migrationRequired: false
      }
    };
  }

  /**
   * Obtener versión actual del motor
   */
  getCurrentVersion() {
    return {
      version: this.currentVersion,
      info: this.versions[this.currentVersion],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Obtener información de una versión específica
   */
  getVersionInfo(version) {
    const info = this.versions[version];

    if (!info) {
      throw new Error(`Version ${version} not found`);
    }

    return {
      version,
      info,
      compatibility: this.compatibilityMatrix[version],
      isCurrent: version === this.currentVersion, // current (A)
      isDeprecated: info.deprecated
    };
  }

  /**
   * Verificar compatibilidad entre versiones
   */
  checkCompatibility(fromVersion, toVersion) {
    const compatibility = this.compatibilityMatrix[fromVersion];

    if (!compatibility) {
      return {
        compatible: false,
        reason: `Version ${fromVersion} not found`,
        migrationRequired: true
      };
    }

    const isCompatible = compatibility.compatibleWith.includes(toVersion);

    return {
      compatible: isCompatible,
      migrationRequired: compatibility.migrationRequired,
      reason: isCompatible
        ? 'Versions are compatible'
        : `Version ${fromVersion} is incompatible with ${toVersion}`,
      availableMigrations: this.getAvailableMigrations(fromVersion, toVersion)
    };
  }

  /**
   * Obtener migraciones disponibles
   */
  getAvailableMigrations(fromVersion, toVersion) {
    // Simulación de migraciones disponibles
    const migrations = {
      '1.0.0->2.0.0': [
        {
          name: 'add_worker_support',
          description: 'Add worker thread support',
          required: true,
          estimatedTime: '2 hours'
        },
        {
          name: 'migrate_calculation_format',
          description: 'Update calculation result format',
          required: true,
          estimatedTime: '1 hour'
        }
      ],
      '1.0.0->2.1.0': [
        {
          name: 'add_worker_support',
          description: 'Add worker thread support',
          required: true,
          estimatedTime: '2 hours'
        },
        {
          name: 'migrate_calculation_format',
          description: 'Update calculation result format',
          required: true,
          estimatedTime: '1 hour'
        },
        {
          name: 'add_pipeline_support',
          description: 'Add PRO pipeline support',
          required: true,
          estimatedTime: '3 hours'
        }
      ]
    };

    return migrations[`${fromVersion}->${toVersion}`] || [];
  }

  /**
   * Validar que un estudio sea compatible con la versión actual
   */
  validateStudyCompatibility(study) {
    if (!study.metadata || !study.metadata.engineVersion) {
      return {
        compatible: false,
        reason: 'Study missing engine version information',
        requiresMigration: true
      };
    }

    const studyVersion = study.metadata.engineVersion;
    const compatibility = this.checkCompatibility(studyVersion, this.currentVersion); // current (A)

    return {
      ...compatibility,
      studyVersion,
      currentVersion: this.currentVersion,
      canLoad: compatibility.compatible,
      needsMigration: compatibility.migrationRequired
    };
  }

  /**
   * Migrar estudio a versión actual
   */
  async migrateStudy(study, targetVersion = this.currentVersion) { // current (A)
    const studyVersion = study.metadata?.engineVersion;

    if (!studyVersion) {
      throw new Error('Study missing engine version information');
    }

    if (studyVersion === targetVersion) {
      return study; // No migration needed
    }

    const compatibility = this.checkCompatibility(studyVersion, targetVersion);

    if (!compatibility.compatible) {
      throw new Error(`Cannot migrate from ${studyVersion} to ${targetVersion}: ${compatibility.reason}`);
    }

    // Simulación de migración
    // eslint-disable-next-line no-console
    console.log(`[VERSIONING] Migrating study from ${studyVersion} to ${targetVersion}`);

    const migratedStudy = {
      ...study,
      metadata: {
        ...study.metadata,
        engineVersion: targetVersion,
        migratedFrom: studyVersion,
        migratedAt: new Date().toISOString(),
        migrationNotes: `Migrated from ${studyVersion} to ${targetVersion}`
      },
      migration: {
        from: studyVersion,
        to: targetVersion,
        timestamp: new Date().toISOString(),
        successful: true
      }
    };

    // Aplicar migraciones específicas según versión
    if (studyVersion === '1.0.0' && targetVersion === '2.0.0') {
      migratedStudy = this.migrateFrom1_0_0To2_0_0(migratedStudy);
    }

    if (studyVersion === '1.0.0' && targetVersion === '2.1.0') {
      migratedStudy = this.migrateFrom1_0_0To2_1_0(migratedStudy);
    }

    // eslint-disable-next-line no-console
    console.log(`[VERSIONING] Migration completed successfully`);
    return migratedStudy;
  }

  /**
   * Migración específica: 1.0.0 -> 2.0.0
   */
  migrateFrom1_0_0To2_0_0(study) {
    // Simulación de migración de formato
    if (study.result && !study.result.metadata) {
      study.result = {
        ...study.result,
        metadata: {
          migrated: true,
          originalFormat: '1.0.0',
          newFormat: '2.0.0'
        }
      };
    }

    return study;
  }

  /**
   * Migración específica: 1.0.0 -> 2.1.0
   */
  migrateFrom1_0_0To2_1_0(study) {
    // Primero migrar a 2.0.0
    study = this.migrateFrom1_0_0To2_0_0(study);

    // Luego agregar soporte de pipeline
    if (study.result && !study.result.pipeline) {
      study.result.pipeline = {
        mode: 'engineering',
        steps: ['calculation'],
        completed: 'calculation'
      };
    }

    return study;
  }

  /**
   * Obtener historial de versiones
   */
  getVersionHistory() {
    const history = [];

    for (const [version, info] of Object.entries(this.versions)) {
      history.push({
        version,
        ...info,
        isCurrent: version === this.currentVersion, // current (A)
        compatibility: this.compatibilityMatrix[version]
      });
    }

    // Ordenar por versión (más reciente primero)
    return history.sort((a, b) => {
      const aParts = a.version.split('.').map(Number);
      const bParts = b.version.split('.').map(Number);

      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] || 0;
        const bPart = bParts[i] || 0;

        if (aPart !== bPart) {
          return bPart - aPart; // Descendente
        }
      }

      return 0;
    });
  }

  /**
   * Obtener estadísticas de versiones
   */
  getVersionStats() {
    const totalVersions = Object.keys(this.versions).length;
    const deprecatedVersions = Object.values(this.versions).filter(v => v.deprecated).length;
    const activeVersions = totalVersions - deprecatedVersions;

    return {
      current: this.currentVersion,
      total: totalVersions,
      active: activeVersions,
      deprecated: deprecatedVersions,
      latestRelease: this.getLatestRelease(),
      compatibilityMatrix: this.compatibilityMatrix
    };
  }

  /**
   * Obtener última versión lanzada
   */
  getLatestRelease() {
    const versions = Object.keys(this.versions);
    const latest = versions.sort((a, b) => {
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);

      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] || 0;
        const bPart = bParts[i] || 0;

        if (aPart !== bPart) {
          return bPart - aPart;
        }
      }

      return 0;
    })[0];

    return {
      version: latest,
      info: this.versions[latest]
    };
  }

  /**
   * Forzar actualización de versión (solo para desarrollo)
   */
  forceVersionUpdate(newVersion) {
    if (!this.versions[newVersion]) {
      throw new Error(`Version ${newVersion} not defined`);
    }

    // eslint-disable-next-line no-console
    console.log(`[VERSIONING] Forcing version update from ${this.currentVersion} to ${newVersion}`);
    this.currentVersion = newVersion; // current (A)

    return {
      previousVersion: this.currentVersion,
      newVersion,
      timestamp: new Date().toISOString()
    };
  }
}

// Singleton instance
const engineVersioningService = new EngineVersioningService();

module.exports = {
  getCurrentVersion: () => engineVersioningService.getCurrentVersion(),
  getVersionInfo: (version) => engineVersioningService.getVersionInfo(version),
  checkCompatibility: (from, to) => engineVersioningService.checkCompatibility(from, to),
  validateStudyCompatibility: (study) => engineVersioningService.validateStudyCompatibility(study),
  migrateStudy: (study, targetVersion) => engineVersioningService.migrateStudy(study, targetVersion),
  getVersionHistory: () => engineVersioningService.getVersionHistory(),
  getVersionStats: () => engineVersioningService.getVersionStats(),
  forceVersionUpdate: (newVersion) => engineVersioningService.forceVersionUpdate(newVersion)
};
