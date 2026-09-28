// 앱 아이콘 PNG 생성 (한 번만 실행하면 됨)
// 실행: NODE_PATH=$(npm root -g) node scripts/make-icons.js
const { chromium } = require("playwright");
const path = require("path");

const html = (size, pad) => `<!doctype html><html><body style="margin:0">
<div style="width:${size}px;height:${size}px;background:#c0392b;display:grid;place-items:center;
  ${pad ? "" : `border-radius:${size * 0.22}px;`}overflow:hidden">
  <div style="font-family:'Noto Sans SC','WenQuanYi Zen Hei',sans-serif;color:#fff;
    font-size:${size * (pad ? 0.42 : 0.56)}px;line-height:1;font-weight:700;margin-top:-${size * 0.03}px">汉</div>
</div></body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const out = (f) => path.join(__dirname, "../public/icons", f);
  const shots = [
    ["icon-192.png", 192, false, true],
    ["icon-512.png", 512, false, true],
    ["icon-512-maskable.png", 512, true, false],
    ["apple-touch-icon.png", 180, true, false],
  ];
  for (const [file, size, pad, transparent] of shots) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(html(size, pad));
    await page.screenshot({ path: out(file), omitBackground: transparent });
  }
  await browser.close();
  console.log("icons done");
})();
