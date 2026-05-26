import { Page, Theme } from '../types';
import { getBlockDef } from '../blocks/blockDefs';
import JSZip from 'jszip';

const FONT_IMPORTS: Record<string, string> = {
  Inter: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap",
  Poppins: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap",
  'Space Grotesk': "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap",
  Outfit: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap",
  'Plus Jakarta Sans': "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
  Nunito: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap",
  'DM Sans': "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap",
  Raleway: "https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700;800&display=swap",
  Sora: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap",
  'Bricolage Grotesque': "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&display=swap",
};

export function exportPageToHtml(page: Page, theme?: Theme): string {
  const bodyContent = page.blocks
    .filter((block) => !block.hidden)
    .map((block) => {
      const def = getBlockDef(block.type);
      return def ? def.exportHtml(block.data) : '';
    })
    .join('\n');

  const fontName = theme?.font || 'Inter';
  const fontUrl = FONT_IMPORTS[fontName] || FONT_IMPORTS['Inter'];
  const fontStack = `'${fontName}', system-ui, -apple-system, sans-serif`;

  const spacingScale = theme?.spacing === 'compact' ? 0.7 : theme?.spacing === 'spacious' ? 1.35 : 1;
  const spacingCss = spacingScale !== 1
    ? `section, header, footer, nav { --spacing-scale: ${spacingScale}; }
    section[style*="padding:80px"], section[style*="padding:96px"], section[style*="padding:112px"] { padding-top: calc(var(--val, 80px) * ${spacingScale}) !important; padding-bottom: calc(var(--val, 80px) * ${spacingScale}) !important; }`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${page.title}</title>
  <meta name="description" content="${page.description || page.title}" />
  <meta property="og:title" content="${page.title}" />
  <meta property="og:description" content="${page.description || page.title}" />
  ${page.ogImageUrl ? `<meta property="og:image" content="${page.ogImageUrl}" />` : ''}
  ${page.faviconUrl ? `<link rel="icon" href="${page.faviconUrl}" />` : ''}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="${fontUrl}" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: ${fontStack}; line-height: 1.6; -webkit-font-smoothing: antialiased; color: #111827; }
    img { max-width: 100%; display: block; }
    a { text-decoration: none; }
    a { cursor: pointer; }
    button { cursor: pointer; }
    a:hover, button:hover { opacity: 0.9; }
    @media (max-width: 768px) {
      h1 { font-size: 2.25rem !important; }
      h2 { font-size: 1.875rem !important; }
      [style*="grid-template-columns:repeat(3"] { grid-template-columns: 1fr !important; }
      [style*="grid-template-columns:repeat(4"] { grid-template-columns: repeat(2,1fr) !important; }
      [style*="display:flex"][style*="min-width:260px"] { flex-direction: column !important; }
      [style*="display:flex"][style*="min-width:280px"] { flex-direction: column !important; }
      [style*="padding:80px 32px"] { padding: 60px 20px !important; }
      [style*="padding:96px 32px"] { padding: 72px 20px !important; }
      [style*="padding:112px 32px"] { padding: 80px 20px !important; }
    }
    .reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.65s cubic-bezier(.16,1,.3,1), transform 0.65s cubic-bezier(.16,1,.3,1); }
    .reveal.visible { opacity: 1; transform: translateY(0); }
    details summary::-webkit-details-marker { display: none; }
    ${spacingCss}
    ${page.customCss ? page.customCss : ''}
  </style>
  ${page.trackingCode ? page.trackingCode : ''}
</head>
<body>
${bodyContent}
<script>
(function(){
  // Scroll reveal
  var els = document.querySelectorAll('section, footer, header, nav');
  if (!('IntersectionObserver' in window)) {
    els.forEach(function(el){ el.classList.add('visible'); });
    return;
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.06 });
  els.forEach(function(el, i){
    el.classList.add('reveal');
    el.style.transitionDelay = (i === 0 ? 0 : Math.min(i * 0.05, 0.2)) + 's';
    io.observe(el);
  });

  // FAQ accordion
  document.querySelectorAll('details').forEach(function(d){
    d.addEventListener('toggle', function(){
      if(d.open) document.querySelectorAll('details').forEach(function(o){ if(o!==d) o.open=false; });
    });
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var href = a.getAttribute('href');
      if (!href || href === '#') return;
      var target = document.querySelector(href);
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

  // Animated number counter for stats
  function animateCounter(el) {
    var text = el.textContent;
    var num = parseFloat(text.replace(/[^0-9.]/g, ''));
    if (isNaN(num) || num === 0) return;
    var suffix = text.replace(/[0-9.]/g, '');
    var start = 0;
    var duration = 1800;
    var startTime = null;
    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = start + (num - start) * eased;
      el.textContent = (Number.isInteger(num) ? Math.round(current) : current.toFixed(1)) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counterObserver = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){
        e.target.querySelectorAll('[data-counter]').forEach(animateCounter);
        counterObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('section').forEach(function(s){ counterObserver.observe(s); });
})();
</script>
</body>
</html>`;
}

export function downloadHtml(page: Page, theme?: Theme): void {
  const html = exportPageToHtml(page, theme);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${page.title.toLowerCase().replace(/\s+/g, '-')}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function copyHtml(page: Page, theme?: Theme): void {
  const html = exportPageToHtml(page, theme);
  navigator.clipboard.writeText(html);
}

export function previewInNewTab(page: Page, theme?: Theme): void {
  const html = exportPageToHtml(page, theme);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export async function downloadZip(page: Page, theme?: Theme): Promise<void> {
  const html = exportPageToHtml(page, theme);
  const zip = new JSZip();

  // Find all uploaded image URLs (/uploads/...) in the page blocks
  const pageJson = JSON.stringify(page.blocks);
  const uploadedUrls = [...new Set(pageJson.match(/\/uploads\/[^"]+/g) || [])];

  // Rewrite HTML to use relative assets/ paths
  let finalHtml = html;
  const assetMap: Record<string, string> = {};
  for (const url of uploadedUrls) {
    const filename = url.split('/').pop()!;
    assetMap[url] = `assets/${filename}`;
    finalHtml = finalHtml.split(url).join(`assets/${filename}`);
  }

  zip.file('index.html', finalHtml);

  // Include robots.txt and sitemap.xml
  zip.file('robots.txt', `User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n`);
  const today = new Date().toISOString().split('T')[0];
  zip.file('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);

  // Fetch and bundle uploaded images
  if (uploadedUrls.length > 0) {
    const assetsFolder = zip.folder('assets')!;
    await Promise.all(uploadedUrls.map(async (url) => {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const filename = url.split('/').pop()!;
        assetsFolder.file(filename, blob);
      } catch {}
    }));
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${page.title.toLowerCase().replace(/\s+/g, '-')}.zip`;
  link.click();
  URL.revokeObjectURL(link.href);
}
