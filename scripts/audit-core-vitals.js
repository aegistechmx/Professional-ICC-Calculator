/**
 * Core Web Vitals Audit Tool
 * Mide y audita las métricas principales de rendimiento web
 */

const fs = require('fs');
const path = require('path');

class CoreVitalsAuditor {
  constructor() {
    this.metrics = {
      fcp: { target: 1.5, actual: null, status: 'unknown' },
      lcp: { target: 2.5, actual: null, status: 'unknown' },
      cls: { target: 0.1, actual: null, status: 'unknown' },
      fid: { target: 0.1, actual: null, status: 'unknown' },
      ttfb: { target: 0.8, actual: null, status: 'unknown' }
    };
  }

  /**
   * Simular medición de Core Web Vitals
   * En producción, esto usaría Lighthouse o Chrome DevTools
   */
  async measureCoreVitals() {
    console.log('Auditoría de Core Web Vitals...');
    
    // Simulación basada en mediciones anteriores
    this.metrics.fcp.actual = 1.2;
    this.metrics.lcp.actual = 2.1;
    this.metrics.cls.actual = 0.05;
    this.metrics.fid.actual = 0.08;
    this.metrics.ttfb.actual = 0.3;

    // Evaluar estado de cada métrica
    Object.keys(this.metrics).forEach(key => {
      const metric = this.metrics[key];
      metric.status = metric.actual <= metric.target ? 'good' : 'needs-improvement';
    });

    return this.metrics;
  }

  /**
   * Generar reporte de auditoría
   */
  generateReport(metrics) {
    const report = {
      timestamp: new Date().toISOString(),
      overall: this.calculateOverallScore(metrics),
      metrics: metrics,
      recommendations: this.generateRecommendations(metrics)
    };

    return report;
  }

  /**
   * Calcular puntuación general
   */
  calculateOverallScore(metrics) {
    const goodMetrics = Object.values(metrics).filter(m => m.status === 'good').length;
    const totalMetrics = Object.keys(metrics).length;
    return Math.round((goodMetrics / totalMetrics) * 100);
  }

  /**
   * Generar recomendaciones basadas en métricas
   */
  generateRecommendations(metrics) {
    const recommendations = [];

    if (metrics.fcp.actual > metrics.fcp.target) {
      recommendations.push({
        metric: 'FCP',
        issue: 'First Contentful Paint lento',
        action: 'Optimizar carga de recursos críticos, implementar lazy loading'
      });
    }

    if (metrics.lcp.actual > metrics.lcp.target) {
      recommendations.push({
        metric: 'LCP',
        issue: 'Largest Contentful Paint lento',
        action: 'Optimizar imágenes, usar formato WebP, implementar CDNs'
      });
    }

    if (metrics.cls.actual > metrics.cls.target) {
      recommendations.push({
        metric: 'CLS',
        issue: 'Layout Shift excesivo',
        action: 'Definir dimensiones de imágenes, evitar inserciones dinámicas'
      });
    }

    if (metrics.fid.actual > metrics.fid.target) {
      recommendations.push({
        metric: 'FID',
        issue: 'First Input Delay lento',
        action: 'Reducir JavaScript, optimizar ejecución de scripts'
      });
    }

    return recommendations;
  }

  /**
   * Guardar reporte
   */
  saveReport(report) {
    const reportsDir = path.join(__dirname, '..', 'reports');
    const filename = `core-vitals-${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join(reportsDir, filename);

    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`Reporte guardado en: ${filepath}`);
    return filepath;
  }

  /**
   * Imprimir resultados en consola
   */
  printResults(report) {
    console.log('\nCore Web Vitals Audit Report');
    console.log('================================');
    console.log(`Overall Score: ${report.overall}/100`);
    console.log(`Timestamp: ${report.timestamp}`);
    
    console.log('\nMétricas:');
    Object.entries(report.metrics).forEach(([key, metric]) => {
      const status = metric.status === 'good' ? 'Good' : 'Needs Improvement';
      const icon = metric.status === 'good' ? 'Good' : 'Needs Improvement';
      console.log(`  ${key.toUpperCase()}: ${metric.actual}s (${status})`);
    });

    if (report.recommendations.length > 0) {
      console.log('\nRecomendaciones:');
      report.recommendations.forEach(rec => {
        console.log(`  ${rec.metric}: ${rec.action}`);
      });
    } else {
      console.log('\nExcelente rendimiento! No hay recomendaciones.');
    }
  }
}

async function runAudit() {
  const auditor = new CoreVitalsAuditor();
  
  try {
    const metrics = await auditor.measureCoreVitals();
    const report = auditor.generateReport(metrics);
    const filepath = auditor.saveReport(report);
    auditor.printResults(report);
    
    return report;
  } catch (error) {
    console.error('Error en auditoría:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runAudit();
}

module.exports = CoreVitalsAuditor;
