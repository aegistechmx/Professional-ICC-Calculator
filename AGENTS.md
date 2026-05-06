# Project Conventions

<project_overview>
- This is a JavaScript/Node.js project with React frontend and Express backend
- Use 2-space indentation throughout the codebase
- Prefer named exports over default exports
- All async functions must include error handling with try/catch
</project_overview>

<linting_strategy>
- Linting rules are handled by directory-specific AGENTS.md files
- Backend: run `npm run lint` from backend/ directory
- Frontend: run `npm run lint` from frontend/ directory
- Always fix lint errors before completing tasks
</linting_strategy>

<environment_configuration>
- Commands Auto Execution: SAFE (prevents loops and uncontrolled executions)
- Model: Claude (for complex electrical logic)
- Web Search: Disabled (faster responses)
- Terminal Completion: Enabled (for npm/node/scripts)
- Autocomplete Speed: FAST
- Browser Previews: Disabled
- Auto-open Edited Files: Disabled
- Configuration file: `.windsurf/settings.json`
</environment_configuration>

<icc_development_rules>
- Backend First: All heavy calculations in Node.js backend
- Frontend Role: Visualization only, no heavy logic
- Calculation Trigger: Manual "Calculate" button or debounced inputs
- Debug Logging: Use clear console.log() for ICC INPUT and RESULT
- Example: `console.log("ICC INPUT:", data)` and `console.log("ICC RESULT:", result)`
- Avoid: Auto-recalculation on every input, aggressive watchers
</icc_development_rules>
