
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

async function createServer() {
  const app = express();
  const port = process.env.PORT || 3000;
  const isProduction = process.env.NODE_ENV === 'production';
  const distPath = path.join(projectRoot, 'dist');
  const distExists = fs.existsSync(distPath);

  console.log(`[Server] Starting...`);
  console.log(`[Server] Project Root: ${projectRoot}`);
  console.log(`[Server] NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`[Server] Dist Folder Exists: ${distExists}`);

  let vite;

  if (!isProduction) {
    console.log('[Server] Mode: Development (Vite Middleware)');
    // --- DEVELOPMENT MODE ---
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('[Server] Mode: Production (Static Serving)');
    // --- PRODUCTION MODE ---
    
    // 1. Serve built assets from 'dist' FIRST
    if (distExists) {
        app.use(express.static(distPath));
    } else {
        console.warn('[Server] WARNING: Production mode enabled but "dist" folder is missing. Did you run "npm run build"?');
    }
    
    // 2. Fallback for static assets in root (like /thumbnails)
    // EXCLUDE index.html to prevent infinite loops or serving source html
    app.use(express.static(projectRoot, {
        index: false 
    }));
  }

  // Handle SPA routing
  app.get('*', async (req, res, next) => {
    try {
      const url = req.originalUrl;

      if (!isProduction && vite) {
         // In Dev, use Vite to transform index.html
         let template = fs.readFileSync(path.resolve(projectRoot, 'index.html'), 'utf-8');
         template = await vite.transformIndexHtml(url, template);
         res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } else {
         // In Prod, serve dist/index.html
         if (distExists) {
             res.sendFile(path.join(distPath, 'index.html'));
         } else {
             res.status(500).send('Server Error: Production build not found. Please ensure "npm run build" runs before start.');
         }
      }
    } catch (e) {
      if (!isProduction && vite) {
        vite.ssrFixStacktrace(e);
      }
      next(e);
    }
  });

  app.listen(port, () => {
    console.log(`[Server] Running at http://localhost:${port}`);
  });
}

createServer();
