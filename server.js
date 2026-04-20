/**
 * CARCHINA.LTD - Vehicle Upload API Server
 * 本地 AI 车辆上传接口
 * 
 * 使用方法:
 *   node server.js
 * 
 * API 端点:
 *   GET  /api/vehicles     - 获取所有车�? *   POST /api/vehicles     - 添加车辆 (AI 调用)
 *   GET  /api/vehicles/:id - 获取单个车辆
 *   DELETE /api/vehicles/:id - 删除车辆
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data', 'vehicles.json');

// 确保数据目录存在
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 初始化数据文�?if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([
        {
            id: 1,
            brand: "Toyota",
            model: "Camry Hybrid",
            year: 2022,
            price: 22500,
            mileage: 30000,
            bodyType: "sedan",
            fuel: "hybrid",
            transmission: "automatic",
            image: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=600",
            featured: true,
            status: "available",
            createdAt: new Date().toISOString()
        },
        {
            id: 2,
            brand: "BMW",
            model: "530Li",
            year: 2023,
            price: 45000,
            mileage: 15000,
            bodyType: "sedan",
            fuel: "petrol",
            transmission: "automatic",
            image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600",
            featured: true,
            status: "available",
            createdAt: new Date().toISOString()
        },
        {
            id: 3,
            brand: "BYD",
            model: "Han EV",
            year: 2024,
            price: 32000,
            mileage: 5000,
            bodyType: "sedan",
            fuel: "electric",
            transmission: "automatic",
            image: "https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=600",
            featured: true,
            status: "available",
            createdAt: new Date().toISOString()
        }
    ], null, 2));
}

// 读取车辆数据
function getVehicles() {
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    } catch (e) {
        return [];
    }
}

// 保存车辆数据
function saveVehicles(vehicles) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(vehicles, null, 2));
}

// 生成静态网站数�?(�?Vercel 读取)
function generateStaticData() {
    const vehicles = getVehicles();
    const staticDataPath = path.join(__dirname, 'public', 'data', 'vehicles.json');
    const publicDataDir = path.dirname(staticDataPath);
    
    if (!fs.existsSync(publicDataDir)) {
        fs.mkdirSync(publicDataDir, { recursive: true });
    }
    
    fs.writeFileSync(staticDataPath, JSON.stringify(vehicles, null, 2));
    console.log('📁 Static data generated: public/data/vehicles.json');
}

// HTTP 服务�?const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;

    // GET /api/vehicles - 获取所有车�?    if (pathname === '/api/vehicles' && req.method === 'GET') {
        const vehicles = getVehicles();
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, count: vehicles.length, vehicles }));
        return;
    }

    // POST /api/vehicles - 添加车辆 (AI 上传)
    if (pathname === '/api/vehicles' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                
                // 验证必需字段
                if (!data.brand || !data.model || !data.year || !data.price) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ 
                        success: false, 
                        error: 'Missing required fields: brand, model, year, price' 
                    }));
                    return;
                }

                const vehicles = getVehicles();
                const newVehicle = {
                    id: Date.now(),
                    brand: data.brand,
                    model: data.model,
                    year: parseInt(data.year),
                    price: parseInt(data.price),
                    mileage: parseInt(data.mileage) || 0,
                    bodyType: data.bodyType || 'sedan',
                    fuel: data.fuel || 'petrol',
                    transmission: data.transmission || 'automatic',
                    image: data.image || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600',
                    description: data.description || '',
                    featured: data.featured || false,
                    status: data.status || 'available',
                    createdAt: new Date().toISOString()
                };

                vehicles.push(newVehicle);
                saveVehicles(vehicles);
                generateStaticData();

                console.log(`�?Vehicle added: ${newVehicle.brand} ${newVehicle.model} ($${newVehicle.price})`);
                
                res.writeHead(201);
                res.end(JSON.stringify({ 
                    success: true, 
                    message: 'Vehicle added successfully',
                    vehicle: newVehicle 
                }));
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        });
        return;
    }

    // DELETE /api/vehicles/:id - 删除车辆
    const deleteMatch = pathname.match(/^\/api\/vehicles\/(\d+)$/);
    if (deleteMatch && req.method === 'DELETE') {
        const id = parseInt(deleteMatch[1]);
        let vehicles = getVehicles();
        const index = vehicles.findIndex(v => v.id === id);
        
        if (index === -1) {
            res.writeHead(404);
            res.end(JSON.stringify({ success: false, error: 'Vehicle not found' }));
            return;
        }

        const deleted = vehicles.splice(index, 1)[0];
        saveVehicles(vehicles);
        generateStaticData();

        console.log(`🗑�?Vehicle deleted: ${deleted.brand} ${deleted.model}`);
        
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, message: 'Vehicle deleted', deleted }));
        return;
    }

    // GET /api/seo/analyze - SEO 分析 (可�?
    if (pathname === '/api/seo/analyze' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { keywords } = JSON.parse(body);
                const vehicles = getVehicles();
                
                // 简�?SEO 建议生成
                const suggestions = [];
                if (vehicles.length < 5) suggestions.push('增加更多车辆以提高搜索可见�?);
                if (!vehicles.some(v => v.featured)) suggestions.push('标记一些精选车�?);
                
                const seoScore = Math.min(100, vehicles.length * 10 + 40);
                
                res.writeHead(200);
                res.end(JSON.stringify({
                    success: true,
                    score: seoScore,
                    vehicleCount: vehicles.length,
                    suggestions,
                    keywords: keywords || []
                }));
            } catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        });
        return;
    }

    // 根路�?- API 文档
    if (pathname === '/' && req.method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({
            name: "CARCHINA.LTD Vehicle API",
            version: "1.0.0",
            endpoints: [
                { method: "GET", path: "/api/vehicles", description: "Get all vehicles" },
                { method: "POST", path: "/api/vehicles", description: "Add new vehicle (AI upload)" },
                { method: "DELETE", path: "/api/vehicles/:id", description: "Delete vehicle" },
                { method: "POST", path: "/api/seo/analyze", description: "SEO analysis" }
            ],
            example: {
                addVehicle: {
                    method: "POST",
                    url: "http://localhost:3001/api/vehicles",
                    body: {
                        brand: "Toyota",
                        model: "Land Cruiser",
                        year: 2023,
                        price: 55000,
                        mileage: 10000,
                        bodyType: "suv",
                        fuel: "petrol",
                        transmission: "automatic",
                        image: "https://example.com/car.jpg"
                    }
                }
            }
        }));
        return;
    }

    // 404
    res.writeHead(404);
    res.end(JSON.stringify({ success: false, error: 'Not found' }));
});

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
�?    CARCHINA.LTD Vehicle API Server                  �?╠════════════════════════════════════════════════════════╣
�? URL: http://localhost:${PORT}                         �?�? Data: ${DATA_FILE}
�?                                                       �?�? AI Upload Example:                                   �?�? POST /api/vehicles                                   �?�? {                                                    �?�?   "brand": "Toyota",                                 �?�?   "model": "Land Cruiser",                          �?�?   "year": 2023,                                     �?�?   "price": 55000,                                   �?�?   "image": "https://..."                             �?�? }                                                    �?╚════════════════════════════════════════════════════════╝
    `);
    generateStaticData();
});

