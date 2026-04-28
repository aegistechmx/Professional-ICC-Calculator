/**
 * Economic Dispatch Module
 * 
 * Optimizes generator dispatch to minimize operating costs
 * while meeting load demand and system constraints
 */

/**
 * Economic Dispatch Class
 */
class EconomicDispatch {
  constructor() {
    this.generators = [];
    this.load = 0;
    this.costFunctions = [];
  }

  /**
   * Add generator with cost function
   */
  addGenerator(generator) {
    this.generators.push({
      id: generator.id,
      bus: generator.bus,
      Pmin: generator.Pmin || 0,
      Pmax: generator.Pmax || 100,
      a: generator.a || 0, // Cost coefficient a (quadratic term)
      b: generator.b || 0, // Cost coefficient b (linear term)
      c: generator.c || 0, // Cost coefficient c (constant term)
      currentP: 0
    });
    return this;
  }

  /**
   * Set total load demand
   */
  setLoad(loadMW) {
    this.load = loadMW;
    return this;
  }

  /**
   * Calculate marginal cost for a generator
   * MC = 2aP + b
   */
  calculateMarginalCost(generator, P) {
    return 2 * generator.a * P + generator.b;
  }

  /**
   * Calculate total cost for a generator
   * Cost = aP^2 + bP + c
   */
  calculateCost(generator, P) {
    return generator.a * P * P + generator.b * P + generator.c;
  }

  /**
   * Solve economic dispatch using lambda iteration method
   */
  solveEconomicDispatch(tolerance = 0.01, maxIterations = 100) {
    // Check if total capacity meets demand
    const totalCapacity = this.generators.reduce((sum, g) => sum + g.Pmax, 0);
    if (totalCapacity < this.load) {
      return {
        success: false,
        error: 'Insufficient generation capacity',
        totalCapacity,
        demand: this.load
      };
    }

    // Initial lambda (marginal cost)
    let lambda = this.calculateInitialLambda();
    
    for (let iter = 0; iter < maxIterations; iter++) {
      // Calculate generator outputs for current lambda
      const outputs = this.generators.map(gen => {
        const P = (lambda - gen.b) / (2 * gen.a);
        const clampedP = Math.max(gen.Pmin, Math.min(gen.Pmax, P));
        gen.currentP = clampedP;
        return clampedP;
      });
      
      const totalGeneration = outputs.reduce((sum, P) => sum + P, 0);
      
      // Check convergence
      const error = Math.abs(totalGeneration - this.load);
      if (error < tolerance) {
        break;
      }
      
      // Adjust lambda
      if (totalGeneration < this.load) {
        lambda += 0.1; // Increase lambda to increase generation
      } else {
        lambda -= 0.1; // Decrease lambda to decrease generation
      }
    }
    
    // Calculate final costs
    const totalCost = this.generators.reduce((sum, gen) => {
      return sum + this.calculateCost(gen, gen.currentP);
    }, 0);
    
    return {
      success: true,
      lambda: lambda,
      totalGeneration: this.generators.reduce((sum, g) => sum + g.currentP, 0),
      totalCost: totalCost,
      generators: this.generators.map(gen => ({
        id: gen.id,
        bus: gen.bus,
        P: gen.currentP,
        marginalCost: this.calculateMarginalCost(gen, gen.currentP),
        cost: this.calculateCost(gen, gen.currentP)
      }))
    };
  }

  /**
   * Calculate initial lambda estimate
   */
  calculateInitialLambda() {
    // Use average marginal cost at mid-point
    const avgP = this.load / this.generators.length;
    const avgLambda = this.generators.reduce((sum, gen) => {
      return sum + (2 * gen.a * avgP + gen.b);
    }, 0) / this.generators.length;
    
    return avgLambda;
  }

  /**
   * Solve optimal power flow (includes transmission constraints)
   */
  solveOptimalPowerFlow(Ybus, tolerance = 0.01) {
    // This would integrate with power flow solver
    // For now, return economic dispatch without network constraints
    const dispatchResult = this.solveEconomicDispatch(tolerance);
    
    return {
      ...dispatchResult,
      networkConstraints: false,
      losses: 0
    };
  }

  /**
   * Calculate transmission losses (simplified)
   */
  calculateLosses(flows) {
    let totalLosses = 0;
    
    flows.forEach(flow => {
      // Loss = I^2 * R
      const I = flow.current || 0;
      const R = flow.resistance || 0;
      totalLosses += I * I * R;
    });
    
    return totalLosses;
  }

  /**
   * Generate dispatch report
   */
  generateReport(dispatchResult) {
    return {
      summary: {
        totalDemand: this.load,
        totalGeneration: dispatchResult.totalGeneration,
        totalCost: dispatchResult.totalCost,
        marginalCost: dispatchResult.lambda
      },
      generators: dispatchResult.generators,
      recommendations: this.getRecommendations(dispatchResult)
    };
  }

  /**
   * Get recommendations based on dispatch results
   */
  getRecommendations(dispatchResult) {
    const recommendations = [];
    
    // Check for generators at limits
    dispatchResult.generators.forEach(gen => {
      if (gen.P >= this.generators.find(g => g.id === gen.id).Pmax) {
        recommendations.push(`Generator ${gen.id} at maximum capacity, consider expansion`);
      }
      if (gen.P <= this.generators.find(g => g.id === gen.id).Pmin) {
        recommendations.push(`Generator ${gen.id} at minimum, consider unit commitment`);
      }
    });
    
    // Check for high marginal cost
    const highCostGenerators = dispatchResult.generators.filter(g => g.marginalCost > 100);
    if (highCostGenerators.length > 0) {
      recommendations.push('Consider adding more efficient generation units');
    }
    
    return recommendations;
  }
}

module.exports = EconomicDispatch;
