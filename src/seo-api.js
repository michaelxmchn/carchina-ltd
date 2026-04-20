/**
 * SEO Analysis API Module
 * 本地 AI SEO 分析接口
 * 
 * 使用方法:
 *   node seo-api.js
 *   POST http://localhost:3001/api/seo/analyze
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3001;

// 加载语言文件
function loadLocales() {
  const locales = {};
  const localesDir = path.join(__dirname, 'src', 'locales');
  ['en', 'cn', 'ru', 'ar'].forEach(lang => {
    try {
      locales[lang] = JSON.parse(fs.readFileSync(path.join(localesDir, `${lang}.json`), 'utf-8'));
    } catch (e) {
      locales[lang] = {};
    }
  });
  return locales;
}

const locales = loadLocales();

// SEO 评分算法
function analyzeSEO(content, lang = 'en') {
  const t = locales[lang]?.seo || locales['en'].seo;
  const text = content.toLowerCase();
  const words = text.split(/\s+/);
  
  // 关键词分析
  const keywords = t.keywords.split(',').map(k => k.trim().toLowerCase());
  const keywordMatches = keywords.filter(k => text.includes(k));
  
  // 计算各维度得分
  const scores = {
    title: content.includes('<title>') ? 20 : 0,
    metaDescription: /meta.*description/.test(content) ? 15 : 0,
    keywords: /meta.*keywords/.test(content) ? 10 : 0,
    h1: (content.match(/<h1/g) || []).length > 0 ? 15 : 0,
    h2: (content.match(/<h2/g) || []).length > 0 ? 10 : 0,
    images: (content.match(/<img/g) || []).length,
    altTags: (content.match(/alt="/g) || []).length,
    links: (content.match(/<a /g) || []).length,
    keywordDensity: keywordMatches.length / keywords.length * 20
  };
  
  // 总分
  const totalScore = Math.min(100, Object.values(scores).reduce((a, b) => typeof b === 'number' ? a + b : a, 0));
  
  // 建议
  const suggestions = [];
  if (!content.includes('<title>')) suggestions.push('添加 <title> 标签');
  if (!/meta.*description/.test(content)) suggestions.push('添加 meta description');
  if ((content.match(/<h1/g) || []).length === 0) suggestions.push('添加 H1 标题');
  if ((content.match(/<img/g) || []).length > 0 && (content.match(/alt="/g) || []).length === 0) {
    suggestions.push('为所有图片添加 alt 属性');
  }
  if (!/lang="ar"/.test(content)) suggestions.push('添加语言切换支持');
  if (scores.keywordDensity < 0.3) suggestions.push('增加关键词密度');
  
  return {
    score: totalScore,
    breakdown: scores,
    keywordMatches,
    suggestions,
    lang,
    timestamp: new Date().toISOString()
  };
}

// HTTP 服务器
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/api/seo/analyze' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { url, content, lang } = JSON.parse(body);
        let result;
        
        if (url && !content) {
          // 从 URL 获取内容分析
          https.get(url, (apiRes) => {
            let data = '';
            apiRes.on('data', chunk => data += chunk);
            apiRes.on('end', () => {
              result = analyzeSEO(data, lang || 'en');
              res.writeHead(200);
              res.end(JSON.stringify(result));
            });
          }).on('error', () => {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Failed to fetch URL' }));
          });
        } else if (content) {
          result = analyzeSEO(content, lang || 'en');
          res.writeHead(200);
          res.end(JSON.stringify(result));
        } else {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'URL or content required' }));
        }
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else if (req.url === '/api/seo/locales') {
    // 返回支持的语言列表
    res.writeHead(200);
    res.end(JSON.stringify({
      languages: ['en', 'cn', 'ru', 'ar'],
      locales: Object.keys(locales)
    }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   SEO Analysis API Server                 ║
╠════════════════════════════════════════════╣
║   URL: http://localhost:${PORT}              ║
║                                            ║
║   Endpoints:                               ║
║   POST /api/seo/analyze                    ║
║   GET  /api/seo/locales                   ║
╚════════════════════════════════════════════╝
  `);
});
