/**
 * CARCHINA.LTD - Vehicle Upload API Server
 * Local AI vehicle upload interface
 * 
 * Usage:
 *   node server.js
 * 
 * API endpoints:
 *   GET  /api/vehicles     - Get all vehicles
 *   POST /api/vehicles     - Add vehicle (AI upload)
 *   GET  /api/vehicles/:id - Get vehicle by ID
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data', 'vehicles.json');

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize data file if not exists
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ vehicles: [] }, null, 2));
}

function loadVehicles() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { vehicles: [] };
    }
}

function saveVehicles(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function sendJSON(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // GET /api/vehicles
    if (req.method === 'GET' && pathname === '/api/vehicles') {
        const id = url.searchParams.get('id');
        const data = loadVehicles();
        
        if (id) {
            const vehicle = data.vehicles.find(v => v.id === parseInt(id));
            if (vehicle) {
                sendJSON(res, 200, vehicle);
            } else {
                sendJSON(res, 404, { error: 'Vehicle not found' });
            }
        } else {
            sendJSON(res, 200, data);
        }
        return;
    }

    // POST /api/vehicles
    if (req.method === 'POST' && pathname === '/api/vehicles') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const vehicle = JSON.parse(body);
                const data = loadVehicles();
                
                // Generate ID
                vehicle.id = data.vehicles.length > 0 
                    ? Math.max(...data.vehicles.map(v => v.id)) + 1 
                    : 1;
                vehicle.addedAt = new Date().toISOString();
                
                data.vehicles.push(vehicle);
                saveVehicles(data);
                
                console.log(`[${new Date().toISOString()}] Vehicle added: ${vehicle.brand} ${vehicle.model} (ID: ${vehicle.id})`);
                
                sendJSON(res, 201, { success: true, vehicle });
            } catch (e) {
                sendJSON(res, 400, { error: 'Invalid JSON' });
            }
        });
        return;
    }

    // GET /api/health
    if (req.method === 'GET' && pathname === '/api/health') {
        sendJSON(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
        return;
    }

    // 404
    sendJSON(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════╗
║   CARCHINA.LTD Vehicle API Server            ║
║   Running on http://localhost:${PORT}              ║
╚═══════════════════════════════════════════════╝
    `);
});
