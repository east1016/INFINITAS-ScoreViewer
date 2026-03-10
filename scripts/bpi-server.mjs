import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '../src/data/customBpi.json');
const PORT = 3001;

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /api/bpi - Get all custom BPI data
  if (req.method === 'GET' && req.url === '/api/bpi') {
    try {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to read data file' }));
    }
    return;
  }

  // POST /api/bpi - Save BPI data
  if (req.method === 'POST' && req.url === '/api/bpi') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { mode, id, difficulty, wr, avg } = JSON.parse(body);

        if (!mode || !id || !difficulty || wr === undefined || avg === undefined) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing required fields' }));
          return;
        }

        // Read existing data
        let data = { SP: {}, DP: {} };
        try {
          data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        } catch (e) {
          // File doesn't exist or is invalid, use default
        }

        // Create key
        const key = `${id}_${difficulty}`;

        // Update data
        if (!data[mode]) data[mode] = {};
        data[mode][key] = {
          wr: Number(wr),
          avg: Number(avg),
          updatedAt: new Date().toISOString().split('T')[0]
        };

        // Write back
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, key, data: data[mode][key] }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to save data', details: err.message }));
      }
    });
    return;
  }

  // DELETE /api/bpi - Delete BPI data
  if (req.method === 'DELETE' && req.url?.startsWith('/api/bpi')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { mode, id, difficulty } = JSON.parse(body);

        if (!mode || !id || !difficulty) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing required fields' }));
          return;
        }

        let data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        const key = `${id}_${difficulty}`;

        if (data[mode] && data[mode][key]) {
          delete data[mode][key];
          fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to delete data' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`BPI Server running at http://localhost:${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
