/**
 * Backend Server
 * Based on specs/backend-server.md
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handlePage } from './routes/page';
import { listProjects } from './loader/project';

const app = new Hono();

// CORS middleware
app.use('*', cors());

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// List projects
app.get('/api/projects', (c) => {
  const projects = listProjects();
  return c.json({ projects });
});

// Static assets (placeholder)
app.get('/_static/*', (c) => {
  return c.text('Static assets not yet implemented', 501);
});

// Project pages
app.get('/:projectId/*', async (c) => {
  const projectId = c.req.param('projectId');
  return handlePage(c, projectId);
});

// Root redirect
app.get('/', (c) => {
  const projects = listProjects();
  if (projects.length === 1) {
    return c.redirect(`/${projects[0]}/`);
  }
  return c.html(`
    <html>
      <body>
        <h1>Layr</h1>
        <p>Available projects:</p>
        <ul>
          ${projects.map(p => `<li><a href="/${p}/">${p}</a></li>`).join('')}
        </ul>
      </body>
    </html>
  `);
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
