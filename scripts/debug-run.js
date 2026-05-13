const { execSync } = require('child_process');
try {
  const out = execSync('npm test', {
    cwd: 'c:/Professional ICC Calculator/backend',
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  console.log('SUCCESS');
  console.log(out);
} catch (error) {
  console.error('ERROR');
  console.error(error.message);
  if (error.stdout) console.error('STDOUT:', error.stdout);
  if (error.stderr) console.error('STDERR:', error.stderr);
  process.exit(error.status || 1);
}
