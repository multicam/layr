/**
 * Backend Server
 */

import { join } from 'path';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handlePage } from './routes/page';
import { listProjects } from './loader/project';
import { staticMiddleware } from './static/index';
import { escapeHtml } from '@layr/ssr';

const app = new Hono();

app.use('*', cors());

app.get('/health', (c) => c.json({ status: 'ok' }));

app.get('/api/projects', (c) => {
  const projects = listProjects();
  return c.json({ projects });
});

app.use('/_static/*', staticMiddleware(
  join(import.meta.dir, '..', '..', '..', '..', 'static')
));

app.get('/:projectId/*', async (c) => {
  const projectId = c.req.param('projectId');
  return handlePage(c, projectId);
});

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
