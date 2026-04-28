---
auto_execution_mode: 3
description: AD
---

.windsurf/workflows/*.md


---
name: deploy-to-production
description: Guides the deployment process to production with safety checks
---

## Pre-deployment Checklist
1. Run all tests
2. Check for uncommitted changes
3. Verify environment variables

## Deployment Steps
Follow these steps to deploy safely...

[Reference supporting files in this directory as needed]
/run-tests-and-fix
Run or add unit or end-to-end tests and fix the errors automatically to ensure code quality before committing, merging, or deploying.

Backend Debug Startup Flow
npm run dev command execution
1a
Nodemon Debug Script
package.json:6
"dev": "nodemon src/server.js"
Server.js initialization
1b
Environment Configuration
server.js:1
require('dotenv').config();
1c
App Module Import
server.js:2
const app = require('./app');
1d
Server Start
server.js:4
app.listen(process.env.PORT, () => {
Express app module (app.js)
CORS middleware setup
JSON parser middleware
API routes registration
Error handlers configuration

Standalone Calculator Debug Flow
HTML Document Load
4a
CDN Dependencies
index.html:80
<script src="https://cdn.tailwindcss.com"></script>
Script Loading Sequence
4b
Main App Script
index.html:576
<script src="js/app.js?v=35"></script>
App Initialization
4c
App Module Pattern
app.js:4
var App = (function() {
estado object setup
Dependency Verification
4d
Dependency Check
app.js:48
function verificarDependencias() {
Checks required modules
