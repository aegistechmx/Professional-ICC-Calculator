---
description: Run comprehensive linting and fix issues
---

1. Run frontend linting with auto-fix
   ```bash
   cd frontend && npm run lint -- --fix
   ```

2. Run backend linting with auto-fix  
   ```bash
   cd backend && npm run lint -- --fix
   ```

3. Check for any remaining errors manually
4. Run tests to ensure nothing broke
   ```bash
   npm run test
   ```

5. Commit only if all checks pass
