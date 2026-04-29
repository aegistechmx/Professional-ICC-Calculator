---
trigger: glob
globs: **/*.{js,jsx,ts,tsx}
---

# Electrical Engineering Calculation Guidelines

<calculation_precision>
- Use appropriate precision for electrical calculations (minimum 6 decimal places)
- Implement proper rounding according to IEEE standards
- Handle floating-point arithmetic errors with tolerance checks
- Use BigDecimal or similar libraries for critical financial calculations
- Document precision requirements for each calculation type
</calculation_precision>

<unit_validation>
- Validate input units before calculations (V, A, kVA, etc.)
- Implement unit conversion functions with proper error handling
- Use SI units internally, convert for display as needed
- Validate ranges for electrical parameters (voltage levels, current limits)
- Handle complex numbers for AC calculations properly
</unit_validation>

<electrical_standards>
- Follow IEEE and IEC standards for calculations
- Implement standard formulas for short circuit calculations
- Use proper safety factors and margins
- Follow local electrical code requirements
- Document which standards are applied in each calculation
</electrical_standards>

<error_handling>
- Validate input parameters before calculations
- Handle division by zero and mathematical errors
- Provide meaningful error messages for calculation failures
- Log calculation errors with full context
- Implement fallback calculations for critical systems
</error_handling>

<performance_optimization>
- Cache expensive calculations when appropriate
- Use efficient algorithms for matrix operations
- Implement parallel processing for large-scale calculations
- Optimize Y-bus and impedance matrix calculations
- Use web workers for heavy computational tasks
</performance_optimization>

<testing_calculations>
- Test calculations with known reference values
- Implement regression tests for calculation accuracy
- Test edge cases and boundary conditions
- Validate results against industry-standard software
- Include performance tests for calculation speed
</testing_calculations>

<documentation>
- Document all calculation algorithms and formulas
- Include examples of calculation usage
- Document assumptions and limitations
- Provide references to standards and literature
- Include troubleshooting guides for calculation issues
</documentation>
