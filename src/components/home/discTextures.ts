import * as THREE from "three";

/**
 * Procedural textures for a machined brake rotor, drawn on canvases.
 * Extrude cap UVs equal shape coordinates (-1..1), so every texture is mapped with
 * repeat 0.5 / offset 0.5 and radius r lands at 512 + r * 512 px.
 */
const SIZE = 1024;
const C = SIZE / 2;

function canvas() {
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  return c;
}

// Small seeded random so the pattern is identical on every load
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const ring = (ctx: CanvasRenderingContext2D, r: number, w: number, style: string) => {
  ctx.beginPath();
  ctx.arc(C, C, r * C, 0, Math.PI * 2);
  ctx.lineWidth = w;
  ctx.strokeStyle = style;
  ctx.stroke();
};

const disc = (ctx: CanvasRenderingContext2D, r: number, style: string | CanvasGradient) => {
  ctx.beginPath();
  ctx.arc(C, C, r * C, 0, Math.PI * 2);
  ctx.fillStyle = style;
  ctx.fill();
};

/** Curved slots across the friction band (shared by colour and bump). */
function slots(ctx: CanvasRenderingContext2D, style: string, width: number) {
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * Math.PI * 2 + 0.3;
    ctx.beginPath();
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const r = 0.56 + t * 0.36;
      const a = a0 + t * 0.55;
      const x = C + Math.cos(a) * r * C;
      const y = C + Math.sin(a) * r * C;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function texture(c: HTMLCanvasElement, srgb: boolean, anisotropy: number) {
  const t = new THREE.CanvasTexture(c);
  t.repeat.set(0.5, 0.5);
  t.offset.set(0.5, 0.5);
  t.anisotropy = anisotropy;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

export function makeDiscTextures(anisotropy: number) {
  const rand = rng(7);

  // ---------- colour
  const cc = canvas();
  const c = cc.getContext("2d")!;
  c.fillStyle = "#666e72";
  c.fillRect(0, 0, SIZE, SIZE);
  // hat / centre zone, machined darker
  disc(c, 0.47, "#737b7f");
  for (let r = 0.05; r < 0.47; r += 0.004) ring(c, r, 1, `rgba(${rand() > 0.5 ? "255,255,255" : "0,0,0"},${0.04 + rand() * 0.06})`);
  // friction band, bright and turned
  disc(c, 0.985, "#b4bbbe");
  disc(c, 0.47, "#737b7f");
  for (let r = 0.47; r < 0.985; r += 0.0022) {
    const l = 165 + Math.floor(rand() * 45);
    ring(c, r, 1 + rand() * 1.4, `rgba(${l},${l + 6},${l + 9},0.55)`);
  }
  // heat tint near the inner edge of the swept area (blue → straw)
  const heat = c.createRadialGradient(C, C, 0.47 * C, C, C, 0.66 * C);
  heat.addColorStop(0, "rgba(96,86,140,0.28)");
  heat.addColorStop(0.45, "rgba(150,120,80,0.16)");
  heat.addColorStop(1, "rgba(150,120,80,0)");
  c.globalCompositeOperation = "multiply";
  disc(c, 0.66, heat);
  c.globalCompositeOperation = "source-over";
  disc(c, 0.47, "#6f777b");
  for (let r = 0.05; r < 0.47; r += 0.005) ring(c, r, 1, `rgba(255,255,255,${0.03 + rand() * 0.05})`);
  // unswept lip + chamfer
  ring(c, 0.477, 7, "#7d8589");
  ring(c, 0.99, 10, "#8a9295");
  slots(c, "rgba(60,66,70,0.85)", 9);

  // ---------- roughness (green channel is read)
  const rc = canvas();
  const r = rc.getContext("2d")!;
  r.fillStyle = "rgb(150,150,150)";
  r.fillRect(0, 0, SIZE, SIZE);
  disc(r, 0.985, "rgb(70,70,70)");
  for (let k = 0.47; k < 0.985; k += 0.0022) {
    const v = 50 + Math.floor(rand() * 50);
    ring(r, k, 1 + rand(), `rgb(${v},${v},${v})`);
  }
  disc(r, 0.47, "rgb(130,130,130)");
  ring(r, 0.99, 10, "rgb(110,110,110)");
  slots(r, "rgb(170,170,170)", 9);

  // ---------- bump (light = raised)
  const bc = canvas();
  const b = bc.getContext("2d")!;
  b.fillStyle = "rgb(128,128,128)";
  b.fillRect(0, 0, SIZE, SIZE);
  for (let k = 0.05; k < 0.985; k += 0.003) {
    const v = 110 + Math.floor(rand() * 40);
    ring(b, k, 1.2, `rgb(${v},${v},${v})`);
  }
  ring(b, 0.477, 6, "rgb(90,90,90)");
  ring(b, 0.99, 10, "rgb(80,80,80)");
  slots(b, "rgb(40,40,40)", 9);

  return {
    map: texture(cc, true, anisotropy),
    roughnessMap: texture(rc, false, anisotropy),
    bumpMap: texture(bc, false, anisotropy),
  };
}

/** Cream "GREMU" lettering for the caliper face. */
export function makeBadgeTexture() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-montserrat").trim() || "Arial";
  ctx.font = `800 190px ${family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#efe6d6";
  ctx.letterSpacing = "18px";
  ctx.fillText("GREMU", 512, 138);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
