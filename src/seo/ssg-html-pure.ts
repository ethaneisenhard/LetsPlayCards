/** Shared HTML helpers for pre-rendered SEO pages (glossary + history). */

export const SSG_CSS = `
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#0a0f1a;color:#e6e9ef;line-height:1.65;-webkit-font-smoothing:antialiased}
a{color:#c9a84c;text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:760px;margin:0 auto;padding:40px 24px 80px}
.crumb{font-size:13px;color:#6b7280;margin-bottom:24px}
.crumb a{color:#8b93a1}
h1{font-size:2.4rem;line-height:1.15;margin:0 0 8px;letter-spacing:-.02em}
.lead{font-size:1.15rem;color:#a7b0bf;margin:0 0 32px}
.meta{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:40px}
.pill{font-size:13px;color:#cbd2dc;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);padding:4px 12px;border-radius:999px}
section{margin-bottom:36px}
h2{font-size:1.35rem;margin:0 0 10px;color:#fff;border-bottom:1px solid rgba(255,255,255,.08);padding-bottom:8px}
p{margin:0;color:#c3cad5}
section p+p{margin-top:14px}
.faq{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:20px 22px;margin-bottom:14px}
.faq h3{font-size:1rem;margin:0 0 6px;color:#fff}
.faq p{margin:0;font-size:.95rem}
.play{margin:48px 0;padding:22px 26px;border-radius:16px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;text-align:center}
.play a{color:#fff;font-weight:700;font-size:1.05rem;text-decoration:none}
.related{margin-top:40px}
.back{display:inline-block;margin-bottom:28px;font-size:14px}
footer{margin-top:64px;padding-top:24px;border-top:1px solid rgba(255,255,255,.08);color:#6b7280;font-size:13px}
.hub h1{font-size:3rem}
.hub .intro{color:#a7b0bf;max-width:640px}
.fam{margin:48px 0}
.fam h2{font-size:1.5rem}
.game-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,160px),1fr));gap:10px;margin-top:16px}
.game-tile{position:relative;display:flex;flex-direction:column;align-items:flex-start;padding:14px;border-radius:16px;border:1px solid rgba(255,255,255,.1);color:#e6e9ef;min-height:8.5rem;background-color:#111827;background-size:cover}
.game-tile .tile-emoji{display:block;font-size:1.75rem;line-height:1;margin-bottom:8px}
.game-tile .n{display:block;font-weight:700;font-size:.95rem;line-height:1.25;color:#fff}
.game-tile .d{display:block;font-size:.72rem;line-height:1.4;color:rgba(255,255,255,.5);margin-top:4px}
.game-tile .tile-foot{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;width:100%;margin-top:auto;padding-top:8px}
.game-tile .tile-players{font-size:10px;color:rgba(255,255,255,.3)}
.game-tile .tile-links{display:flex;gap:6px;flex-shrink:0}
.game-tile .tile-rules{padding:4px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.25);color:rgba(255,255,255,.8);font-size:10px;font-weight:600;letter-spacing:.02em;text-decoration:none}
.game-tile .tile-rules:hover{border-color:rgba(201,168,76,.5);color:#c9a84c;text-decoration:none}
.game-tile .tile-play{padding:4px 8px;border-radius:8px;background:#059669;color:#fff;font-size:10px;font-weight:700;letter-spacing:.02em;text-decoration:none}
.game-tile .tile-play:hover{background:#10b981;text-decoration:none}
.history-banner{display:block;margin:28px 0 8px;padding:18px 20px;border-radius:14px;background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.28);color:#e6e9ef;text-decoration:none}
.history-banner:hover{border-color:#c9a84c;text-decoration:none}
.history-banner .k{font-size:12px;color:#c9a84c;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
.history-banner .t{font-weight:700;font-size:1.05rem}
.toc{margin:0 0 36px;padding:18px 20px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08)}
.toc h2{font-size:0.95rem;border:0;padding:0;margin:0 0 10px;color:#a7b0bf;font-weight:600}
.toc ol{margin:0;padding-left:1.2rem;color:#c3cad5}
.toc li{margin:4px 0}
.origin{padding:18px 20px;border-radius:14px;background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.2)}
.origin h2{border:0;padding:0}
.note{font-size:.9rem;color:#8b93a1}
.hist-fig{margin:18px 0 0;padding:0}
.hist-fig img{display:block;width:100%;height:auto;border-radius:12px;background:#111827;border:1px solid rgba(255,255,255,.08)}
.hist-fig.hero{margin:8px 0 28px}
.hist-fig.hero img{max-height:min(56vh,420px);object-fit:contain}
.marks-grid{display:flex;gap:14px;overflow-x:auto;padding:4px 0 12px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
.marks-grid .hist-fig{flex:0 0 min(78vw,280px);scroll-snap-align:start;margin:0}
.marks-grid .hist-fig.wide{flex-basis:min(92vw,420px)}
.marks-grid .hist-fig img{height:220px;object-fit:contain}
.hist-fig figcaption{margin-top:10px;font-size:.92rem;color:#c3cad5}
.hist-fig figcaption strong{display:block;color:#fff;font-size:.95rem;margin-bottom:4px}
.fig-kind{display:inline-block;font-size:11px;color:#c9a84c;border:1px solid rgba(201,168,76,.35);padding:1px 8px;border-radius:999px;margin:0 0 8px}
.hist-fig .cap{display:block}
.hist-fig .credit{display:block;margin-top:8px;font-size:12px;color:#8b93a1}
.century-strip{display:flex;gap:14px;overflow-x:auto;padding:4px 0 12px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
.century-strip .hist-fig{flex:0 0 min(78vw,280px);scroll-snap-align:start;margin:0}
.century-strip .hist-fig.wide{flex-basis:min(92vw,420px)}
.century-strip .hist-fig img{height:220px;object-fit:contain}
@media (min-width:720px){
  .century-strip,.marks-grid{display:grid;grid-template-columns:1fr 1fr;overflow:visible;scroll-snap-type:none}
  .century-strip .hist-fig,.century-strip .hist-fig.wide,.marks-grid .hist-fig,.marks-grid .hist-fig.wide{flex:none}
  .century-strip .hist-fig.wide,.marks-grid .hist-fig.wide{grid-column:1/-1}
  .century-strip .hist-fig img,.marks-grid .hist-fig img{height:auto;max-height:420px;object-fit:contain}
}
@media (max-width:640px){
  .wrap{padding:28px 18px 72px}
  h1{font-size:1.85rem}
  .hub h1{font-size:2.05rem}
  .lead{font-size:1.05rem}
  .play{padding:18px 16px}
  .game-tiles{grid-template-columns:1fr 1fr;gap:10px}
  .game-tile{padding:14px;min-height:0}
}
`;

export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function jsonLdScript(data: unknown): string {
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}
