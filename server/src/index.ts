// --- This is the entry point of the server ---
// When you run `npm run dev`, Node.js starts HERE. This file:
//   1. Creates the Express app (the "web server")
//   2. Registers middleware (helper functions that run on every request)
//   3. Attaches our routes
//   4. Starts listening on a port number

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { initDb } from './db';
import itemsRouter  from './routes/items';
import lookupRouter from './routes/lookup';

dotenv.config();

const app  = express();
const PORT = process.env.PORT ?? 3001;

// --- Middleware ---
// "Middleware" is code that runs before your route handlers, on every request.

// cors() allows the frontend (running on a different port) to talk to this server.
// Without it, browsers block cross-origin requests for security reasons.
app.use(cors());

// express.json() tells Express to automatically parse JSON request bodies.
// Without this, req.body would be undefined.
app.use(express.json());

// Serve cached cover images from the images directory.
const imagesDir = path.resolve(process.env.IMAGES_DIR ?? './data/images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
app.use('/images', express.static(imagesDir));

// --- Routes ---
// When a request comes in for /items/..., hand it to itemsRouter.
// When a request comes in for /lookup/..., hand it to lookupRouter.
app.use('/items',  itemsRouter);
app.use('/lookup', lookupRouter);

// A simple health check endpoint — useful for verifying the server is running.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Media Vault server is running' });
});

// --- Start ---
async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`\n🎬 Media Vault server running at http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/health\n`);
  });
}

start();
