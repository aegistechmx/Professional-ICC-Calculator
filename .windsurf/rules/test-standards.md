---
trigger: glob
globs: **/*.test.{js,jsx,ts,tsx,py}
---

# Test Standards

<structure>
- Use `describe`/`it` blocks for JavaScript/TypeScript tests
- Use `unittest` or `pytest` for Python tests
- Group related tests in logical suites
</structure>

<mocking>
- Mock all external API calls and services
- Use dependency injection for better testability
- Mock database operations in unit tests
</mocking>

<coverage>
- Aim for minimum 80% code coverage
- Test both happy path and error scenarios
- Include integration tests for critical workflows
</coverage>
