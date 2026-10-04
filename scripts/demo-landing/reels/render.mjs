// Renderiza os Reels quadro a quadro (30 qps). Uso: node render.mjs 1 [amostra 1.5,4.3,...]
import { mkdirSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const { chromium } = createRequire(path.resolve("../package.json"))("playwright");

const reel = process.argv[2] ?? "1";
const amostra = process.argv[3]?.split(",").map(Number);
const FPS = 30, D = 15;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await p.goto(pathToFileURL(path.resolve("reel.html")).href + `?r=${reel}`, { waitUntil: "networkidle" });
await p.evaluate(() => window.pronto);
await p.waitForTimeout(500);

if (amostra) {
  mkdirSync("amostras", { recursive: true });
  for (const t of amostra) {
    await p.evaluate((t) => window.seek(t), t);
    await p.screenshot({ path: `amostras/r${reel}-${t}.jpg`, type: "jpeg", quality: 85 });
  }
} else {
  const dir = `quadros-${reel}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir);
  for (let i = 0; i < FPS * D; i++) {
    await p.evaluate((t) => window.seek(t), i / FPS);
    await p.screenshot({ path: `${dir}/${String(i).padStart(4, "0")}.jpg`, type: "jpeg", quality: 95 });
  }
  await b.close();
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", `${dir}/%04d.jpg`, "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart", `reel-${reel}.mp4`]);
  console.log("vídeo:", `reel-${reel}.mp4`);
}
await b.close().catch(() => {});
