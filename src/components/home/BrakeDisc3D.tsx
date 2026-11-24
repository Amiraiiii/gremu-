"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { ScrollTrigger } from "@/lib/gsap";
import { BrakeDisc } from "./BrakeDisc";
import { makeBadgeTexture, makeDiscTextures } from "./discTextures";

/**
 * Procedural 3D ventilated, cross-drilled brake disc with hub and caliper.
 * Spins slowly, leans toward the pointer and turns with scroll. Pauses off-screen.
 * Falls back to the SVG drawing when WebGL is unavailable.
 */
export function BrakeDisc3D({ className = "" }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      setFailed(true);
      return;
    }
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.display = "block";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 0, 6.2);

    // Lights: warm-cream key, teal rim from behind (logo colours)
    const key = new THREE.DirectionalLight(0xf3ead9, 2.2);
    key.position.set(-3, 4, 5);
    const rim = new THREE.DirectionalLight(0x7fd0dc, 3.2);
    rim.position.set(3, -1, -4);
    scene.add(key, rim, new THREE.AmbientLight(0x9fc3cc, 0.25));

    const disposables: { dispose: () => void }[] = [envTex, pmrem];
    const track = <T extends { dispose: () => void }>(o: T) => (disposables.push(o), o);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const tex = makeDiscTextures(Math.min(8, maxAniso));
    Object.values(tex).forEach((t) => track(t));

    // Turned cast-iron rotor face: colour, roughness and bump all carry the machining rings
    const rotorMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0xd3d9dc,
        map: tex.map,
        roughnessMap: tex.roughnessMap,
        bumpMap: tex.bumpMap,
        bumpScale: 1.6,
        metalness: 1,
        roughness: 1,
        envMapIntensity: 1.0,
      }),
    );
    const castIron = track(new THREE.MeshStandardMaterial({ color: 0x4a5257, metalness: 0.85, roughness: 0.62 }));
    const brightSteel = track(new THREE.MeshStandardMaterial({ color: 0xd2d7da, metalness: 1, roughness: 0.18 }));
    const paint = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x2b5965,
        metalness: 0.45,
        roughness: 0.38,
        clearcoat: 1,
        clearcoatRoughness: 0.07,
      }),
    );

    // --- Rotor: two drilled plates with curved vanes between them
    const plateShape = () => {
      const s = new THREE.Shape();
      s.absarc(0, 0, 1, 0, Math.PI * 2, false);
      const inner = new THREE.Path();
      inner.absarc(0, 0, 0.44, 0, Math.PI * 2, true);
      s.holes.push(inner);
      [0.62, 0.74, 0.86].forEach((r, ri) => {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + ri * 0.17 + 0.05;
          const h = new THREE.Path();
          h.absarc(Math.cos(a) * r, Math.sin(a) * r, 0.024, 0, Math.PI * 2, true);
          s.holes.push(h);
        }
      });
      return s;
    };
    const plateGeo = track(
      new THREE.ExtrudeGeometry(plateShape(), {
        depth: 0.05,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.01,
        bevelSegments: 3,
        curveSegments: 96,
      }),
    );
    const rotor = new THREE.Group();
    const front = new THREE.Mesh(plateGeo, rotorMat);
    front.position.z = 0.045;
    const back = new THREE.Mesh(plateGeo, rotorMat);
    back.rotation.y = Math.PI; // machined face outward on both sides
    back.position.z = -0.045;
    rotor.add(front, back);

    const vaneGeo = track(new THREE.BoxGeometry(0.44, 0.022, 0.07));
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const v = new THREE.Mesh(vaneGeo, castIron);
      v.position.set(Math.cos(a) * 0.73, Math.sin(a) * 0.73, 0);
      v.rotation.z = a + 0.42;
      rotor.add(v);
    }

    // --- Hat with machined face, centre bore and five wheel studs
    const hubShape = new THREE.Shape();
    hubShape.absarc(0, 0, 0.46, 0, Math.PI * 2, false);
    const bore = new THREE.Path();
    bore.absarc(0, 0, 0.13, 0, Math.PI * 2, true);
    hubShape.holes.push(bore);
    const lugs: [number, number][] = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      lugs.push([Math.cos(a) * 0.28, Math.sin(a) * 0.28]);
      const p = new THREE.Path();
      p.absarc(lugs[i][0], lugs[i][1], 0.042, 0, Math.PI * 2, true);
      hubShape.holes.push(p);
    }
    const hubGeo = track(
      new THREE.ExtrudeGeometry(hubShape, {
        depth: 0.18,
        bevelEnabled: true,
        bevelThickness: 0.035,
        bevelSize: 0.03,
        bevelSegments: 4,
        curveSegments: 72,
      }),
    );
    const hub = new THREE.Mesh(hubGeo, rotorMat);
    hub.position.z = 0.1;
    rotor.add(hub);

    const studGeo = track(new THREE.CylinderGeometry(0.03, 0.03, 0.26, 20));
    const studTipGeo = track(new THREE.ConeGeometry(0.03, 0.04, 20));
    const hubFront = 0.1 + 0.18 + 0.035;
    lugs.forEach(([x, y]) => {
      const stud = new THREE.Mesh(studGeo, brightSteel);
      stud.rotation.x = Math.PI / 2;
      stud.position.set(x, y, hubFront + 0.11);
      const tip = new THREE.Mesh(studTipGeo, brightSteel);
      tip.rotation.x = Math.PI / 2;
      tip.position.set(x, y, hubFront + 0.26);
      rotor.add(stud, tip);
    });

    // --- Caliper: rounded painted body straddling the rim (does not spin)
    const a0 = Math.PI * 0.07;
    const a1 = Math.PI * 0.51;
    const span = a1 - a0;
    const calShape = new THREE.Shape();
    calShape.absarc(0, 0, 1.14, a0, a1, false);
    calShape.absarc(0, 0, 0.7, a1, a0, true);
    const calDepth = 0.5;
    const calGeo = track(
      new THREE.ExtrudeGeometry(calShape, {
        depth: calDepth,
        bevelEnabled: true,
        bevelThickness: 0.07,
        bevelSize: 0.06,
        bevelSegments: 8,
        curveSegments: 64,
      }),
    );
    const caliper = new THREE.Group();
    const body = new THREE.Mesh(calGeo, paint);
    body.position.z = -0.28;
    caliper.add(body);
    const face = -0.28 + calDepth + 0.07;

    const at = (t: number, r: number) => {
      const a = a0 + span * t;
      return [Math.cos(a) * r, Math.sin(a) * r, a] as const;
    };

    // Piston bosses
    const bossGeo = track(new THREE.CylinderGeometry(0.115, 0.125, 0.045, 48));
    [0.24, 0.76].forEach((t) => {
      const [x, y] = at(t, 0.93);
      const boss = new THREE.Mesh(bossGeo, paint);
      boss.rotation.x = Math.PI / 2;
      boss.position.set(x, y, face + 0.018);
      caliper.add(boss);
    });

    // Mounting bolts (hex heads) near both ends
    const boltGeo = track(new THREE.CylinderGeometry(0.042, 0.042, 0.05, 6));
    [0.06, 0.94].forEach((t) => {
      const [x, y] = at(t, 1.03);
      const bolt = new THREE.Mesh(boltGeo, brightSteel);
      bolt.rotation.x = Math.PI / 2;
      bolt.position.set(x, y, face + 0.02);
      caliper.add(bolt);
    });

    // Bleed nipple on the outer edge
    const nippleGeo = track(new THREE.CylinderGeometry(0.018, 0.024, 0.09, 16));
    {
      const [x, y, a] = at(0.82, 1.2);
      const n = new THREE.Mesh(nippleGeo, brightSteel);
      n.position.set(x, y, 0.05);
      n.rotation.z = a - Math.PI / 2;
      caliper.add(n);
    }

    // GREMU lettering between the bosses
    const badgeTex = track(makeBadgeTexture());
    const badgeMat = track(
      new THREE.MeshStandardMaterial({ map: badgeTex, transparent: true, roughness: 0.45, metalness: 0.1 }),
    );
    const badgeGeo = track(new THREE.PlaneGeometry(0.36, 0.09));
    {
      const [x, y, a] = at(0.5, 0.925);
      const badge = new THREE.Mesh(badgeGeo, badgeMat);
      badge.position.set(x, y, face + 0.004);
      badge.rotation.z = a - Math.PI / 2;
      caliper.add(badge);
    }

    const assembly = new THREE.Group();
    assembly.add(rotor, caliper);
    const stage = new THREE.Group();
    stage.add(assembly);
    scene.add(stage);

    // Layout: right on wide screens, top on narrow
    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${w}px`;
      renderer.domElement.style.height = `${h}px`;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const wide = w / h > 1.1;
      // Wide: upper right, behind the glass cards and clear of the heading. Narrow: top, above the text.
      const tablet = !wide && w >= 700;
      stage.position.set(wide ? 1.3 : 0.15, wide ? 0.3 : tablet ? 0.72 : 0.78, 0);
      stage.scale.setScalar(wide ? 0.92 : tablet ? 0.6 : 0.44);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // Pointer + scroll input
    const pointer = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    let scrollP = 0;
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom top",
      onUpdate: (self) => (scrollP = self.progress),
    });

    // Intro: the disc rolls in once
    let intro = reduce ? 1 : 0;
    const startedAt = performance.now();
    const baseTilt = { x: -0.42, y: -0.55 };
    const tilt = { x: baseTilt.x, y: baseTilt.y };

    let raf = 0;
    let visible = true;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!reduce) {
        intro = Math.min((now - startedAt) / 1800, 1);
        const e = 1 - Math.pow(1 - intro, 3);
        rotor.rotation.z -= dt * (0.35 + scrollP * 2.2) + (1 - e) * dt * 6;
        const tx = baseTilt.x + pointer.y * 0.22 - scrollP * 0.5;
        const ty = baseTilt.y + pointer.x * 0.32 + scrollP * 1.1;
        tilt.x += (tx - tilt.x) * 0.06;
        tilt.y += (ty - tilt.y) * 0.06;
        assembly.rotation.set(tilt.x, tilt.y, 0);
        assembly.position.y = Math.sin(now / 1400) * 0.04 - scrollP * 0.6;
        assembly.position.x = (1 - e) * 2.4;
        assembly.scale.setScalar(0.85 + e * 0.15);
      } else {
        assembly.rotation.set(baseTilt.x, baseTilt.y, 0);
      }
      renderer.render(scene, camera);
      if (visible && !reduce) raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reduce) {
        last = performance.now();
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(frame);
      }
    });
    io.observe(el);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      st.kill();
      window.removeEventListener("pointermove", onPointer);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div ref={host} className={className}>
      {failed && <BrakeDisc className="h-full w-full text-cream/25" />}
    </div>
  );
}
