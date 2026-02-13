/**
 * Backend Server
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handlePage } from './routes/page';
import { listProjects } from './loader/project';

const app = new Hono();

app.use('*', cors());

app.get('/health', (c) => c.json({ status: 'ok' }));

app.get('/api/projects', (c) => {
  const projects = listProjects();
  return c.json({ projects });
});

app.get('/_static/*', (c) => {
  return c.text('Static assets not yet implemented', 501);
});

app.get('/:projectId/*', async (c) => {
  const projectId = c.req.param('projectId');
  return handlePage(c, projectId);
});

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

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
          ${projects.map(p => {
            const safe = escapeHtml(p);
            return `<li><a href="/${encodeURIComponent(p)}/">${safe}</a></li>`;
          }).join('')}
        </ul>
      </body>
    </html>
  `);
});

const port = Number(process.env.PORT) || 3000;

console.log(`Server starting on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
