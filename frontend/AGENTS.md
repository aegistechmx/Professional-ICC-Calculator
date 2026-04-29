# Frontend Conventions

<linting>
- Run `npm run lint` from this directory before finishing changes.
- Auto-fix first with `npm run lint -- --fix` when possible.
- Resolve all `react-hooks/exhaustive-deps` warnings — do not silence them.
- Never leave lint warnings unresolved.
</linting>

<code_organization>
- Imports must be ordered: external libs → internal modules → relative imports.
- Remove unused imports and variables automatically.
- Component files should match their export name (PascalCase).
</code_organization>

<component_standards>
- All component props must be validated with PropTypes (or migrate to TypeScript).
- Use functional components with hooks.
- Follow React best practices for state management.
</component_standards>
