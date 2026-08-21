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
.related .tags{display:flex;flex-wrap:wrap;gap:8px}
.related a{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);padding:6px 14px;border-radius:999px;font-size:14px}
.back{display:inline-block;margin-bottom:28px;font-size:14px}
footer{margin-top:64px;padding-top:24px;border-top:1px solid rgba(255,255,255,.08);color:#6b7280;font-size:13px}
.hub h1{font-size:3rem}
.hub .intro{color:#a7b0bf;max-width:640px}
.fam{margin:48px 0}
.fam h2{font-size:1.5rem}
.gamelist{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px;margin-top:16px}
.gamelist a{display:block;padding:16px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);color:#e6e9ef;text-decoration:none}
.gamelist a:hover{border-color:#c9a84c}
.gamelist .n{font-weight:700;font-size:1.02rem}
.gamelist .d{font-size:12px;color:#8b93a1;margin-top:3px}
.live{display:inline-block;font-size:10px;color:#34d399;border:1px solid rgba(52,211,153,.4);padding:1px 7px;border-radius:999px;margin-left:6px;vertical-align:middle}
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
@media (max-width:640px){
  .wrap{padding:28px 18px 72px}
  h1{font-size:1.85rem}
  .hub h1{font-size:2.05rem}
  .lead{font-size:1.05rem}
  .play{padding:18px 16px}
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
