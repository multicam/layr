/**
 * Backend Server
 * Based on specs/backend-server.md
 * 
 * Informed by Hono framework patterns
 */

import { Hono } from 'hono';

const app = new Hono();

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Page routes
app.get('*', async (c) => {
  // TODO: Implement page matching and SSR
  return c.html('<html><body><h1>Layr</h1><p>Coming soon...</p></body></html>');
});

export default app;

// Start server when run directly
if (import.meta.main) {
  const port = Number(process.env.PORT) || 3000;
  
  console.log(`Server starting on http://localhost:${port}`);
  
  Bun.serve({
    port,
    fetch: app.fetch,
  });
}
