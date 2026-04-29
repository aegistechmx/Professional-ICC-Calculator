# Backend Conventions

<logging>
- Do not use `console.*` in production code. Use the logger in `src/utils/logger.js` instead.
- Use structured logging with appropriate log levels (error, warn, info, debug).
</logging>

<code_quality>
- Remove unused imports, variables, and parameters. Do not silence with `eslint-disable`.
- API endpoints must validate input with express-validator or zod.
- Use async/await for all database operations.
- Error responses must follow standard format: `{ error: string, details?: object }`.
</code_quality>

<linting>
- Run `npm run lint` from this directory before finishing changes and ensure 0 warnings.
- Auto-fix first with `npm run lint -- --fix` when possible.
- Never leave lint warnings unresolved.
</linting>
