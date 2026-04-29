---
auto_execution_mode: 2
---
debug
Debug System Initialization Flow
1a
Debug System Init
index.js:17
function init(enabled) {
Set DEBUG_MODE flag
1b
Clear Previous Logs
index.js:21
DebugLogger.clearLogs();
1c
Log Initialization
index.js:22
DebugLogger.logStep("DEBUG_INIT", { enabled: DEBUG_MODE }, "info");
1d
Initialize UI Panel
index.js:140
if (typeof DebugPanel !== 'undefined') { DebugPanel.init(false); }
Global window object setup
window.DebugSystem = DebugSystem
window.showDebug() shortcut
window.clearDebug() shortcut
window.exportDebug() shortcut
Debug Log Request Flow
DebugSystem.log() call
checks DEBUG_MODE flag
2a
Log Entry Creation
logger.js:14
function logStep(step, data, level) {
2b
Immutable Log Data
logger.js:17
var entry = { time: new Date().toISOString(), step: step, level: level, data: data ? JSON.parse(JSON.stringify(data)) : {} };
JSON.parse(JSON.stringify())
2c
Console Output
logger.js:26
if (level === "error") { console.error(prefix, entry); }
error → console.error()
warn → console.warn()
info/debug → console.log()
2d
In-Memory Storage
logger.js:39
window.__DEBUG_LOGS__.push(entry);
window.__DEBUG_LOGS__ array
limits to 1000 entries
Returns log entry object

Function Tracing System
3a
Function Wrapper
tracer.js:14
function traceStep(name, fn) {
Log function START event
3b
Log Function Start
tracer.js:19
DebugLogger.logStep(name + ":START", { args: args }, "info");
Start performance timing
3c
Start Timing
tracer.js:21
var start = performance.now();
Execute original function
try/catch error handling
Handle success or error
On success: log END event
3d
Error Logging
tracer.js:42
DebugLogger.logStep(name + ":ERROR", { duration: duration, message: error.message, stack: error.stack }, "error");
Include stack trace & duration
Return wrapped function
Ready for execution tracing

Debug UI Panel System
4d
Button Handler
panel.js:213
btn.addEventListener('click', togglePanel);
togglePanel() function called
if panel visible -> hidePanel()
4a
Panel Toggle
panel.js:89
function togglePanel() {
createPanel() if not exists
Panel HTML created with buttons
User clicks "Logs" button
4b
Fetch Logs
panel.js:102
var logs = DebugLogger.getLogs();
DebugLogger.getLogs() fetch
4c
Render Logs
panel.js:109
content.innerHTML = logs.map(function(log) {
Color-coded log entries
Panel status updates
Refresh log count and mode

SimulationLogger System
Constructor initialization
5b
Event Storage
SimulationLogger.js:59
this.events = []
this.startTime = null
this.sessionId = generateSessionId()
Event logging flow
5c
Event Logging
SimulationLogger.js:121
logEvent(event, level = LogLevel.INFO) {
Check minimum log level
Create structured logEntry
Push to events array
5d
Console Output
SimulationLogger.js:151
this.consoleLog(logEntry)
Format with colors
logger.debug() output
Specialized logging methods
logRelayTrip()
logBreakerOperation()
logFaultDetected()

Debug Visual Pro System
6d
UI Integration
index.html:521
onclick="DebugVisualPro.toggleDebug(); if(DebugVisualPro.isDebugMode()) App.calculate();
6a
Debug Mode Toggle
debug_visual_pro.js:13
function toggleDebug() {
DEBUG_MODE = !DEBUG_MODE
console.log debug state
Debug Mode Active Flow
logCDT() called with etapa/data
6c
Grouped Console Output
debug_visual_pro.js:25
console.group('📊 CDT: ' + etapa);
console.table(data)
console.groupEnd()
App.calculate() triggered
generarDebugNode() execution
6b
CDT Debug Calculation
debug_visual_pro.js:70
var cdtDebug = AmpacidadReal.debugCDT(load, cable, config);
load/cable/config setup
CDT calculation execution
debug data population
Integration Points
DebugVisualPro module loaded
6d
UI Integration