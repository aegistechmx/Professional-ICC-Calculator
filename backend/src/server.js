const http = require('http');

// Simple test server - for full API use Express app (app.js)
const server = http.createServer((req, res) => {
  if (req.url === '/icc') {
    const V = 220;
    const Z = 0.05;
    const Icc = V / Z;

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });

    res.end(JSON.stringify({ Icc }));
  } else {
    res.end('API ICC funcionando - Puerto 3001');
  }
});

server.listen(3001, () => console.log('Servidor ICC en puerto 3001'));