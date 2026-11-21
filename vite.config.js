import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Public address of the site, used for canonical links, social previews and the sitemap.
// Netlify sets URL automatically during its builds (it becomes your custom domain once you add one).
// If you build locally and drag-and-drop the dist folder, set SITE_URL or change the fallback below.
const SITE_URL = (process.env.SITE_URL || process.env.URL || 'https://aim-range.netlify.app').replace(/\/+$/, '');

function seo() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    name: 'seo',
    transformIndexHtml(html) {
      return html.replaceAll('%SITE_URL%', SITE_URL);
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), viteSingleFile(), seo()],
});
