import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useInView,
  useDragControls,
} from "framer-motion";

/* ══════════════════════════════════════════════════
   MOBILE HOOK
══════════════════════════════════════════════════ */
function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

/* ══════════════════════════════════════════════════
   FLOATING PHOTO — circle, smart side, 90fps
══════════════════════════════════════════════════ */
function FloatingPhoto() {
  const isMobile = useIsMobile();
  const SIZE = isMobile ? 96 : 116;

  const selfRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [hint, setHint] = useState(false);
  const heroInViewRef = useRef(true);
  const timer1 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const timer2 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [anim, setAnim] = useState({ x: 0, y: 0, scale: 0 as number, opacity: 0 as number });

  const getHeroCenter = () => {
    const el = document.getElementById("hero-photo-anchor");
    if (!el) return { x: window.innerWidth * 0.5 - SIZE / 2, y: window.innerHeight * 0.35 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - SIZE / 2, y: r.top + r.height / 2 - SIZE / 2 };
  };

  /* Picks the emptiest horizontal half (left vs right),
     then finds the least-crowded y in that column. */
  const findSmartSpot = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const NAV_H = 68;
    const PAD = isMobile ? 12 : 22;
    const self = selfRef.current;

    let leftScore = 0, rightScore = 0;
    const pts = 12;
    for (let i = 0; i < pts; i++) {
      const ty = NAV_H + (i / (pts - 1)) * (h - NAV_H - 60);
      for (const tx of [w * 0.12, w * 0.22]) {
        for (const e of document.elementsFromPoint(tx, ty)) {
          if (self && (e === self || self.contains(e))) continue;
          if (e.tagName === "BODY" || e.tagName === "HTML") continue;
          if (getComputedStyle(e).position === "fixed") continue;
          leftScore++;
        }
      }
      for (const tx of [w * 0.78, w * 0.88]) {
        for (const e of document.elementsFromPoint(tx, ty)) {
          if (self && (e === self || self.contains(e))) continue;
          if (e.tagName === "BODY" || e.tagName === "HTML") continue;
          if (getComputedStyle(e).position === "fixed") continue;
          rightScore++;
        }
      }
    }

    const useRight = rightScore <= leftScore;
    const targetX = useRight
      ? Math.min(w - SIZE - PAD, w * 0.83)
      : Math.max(PAD, w * 0.03);

    const ROWS = 6;
    let bestY = h * 0.45, bestYScore = Infinity;
    for (let row = 0; row < ROWS; row++) {
      const ty = NAV_H + PAD + row * (h - NAV_H - 2 * PAD - SIZE) / Math.max(ROWS - 1, 1);
      let score = 0;
      for (const [px, py] of [
        [targetX + SIZE / 2, ty + SIZE / 2],
        [targetX + SIZE / 2, ty + SIZE * 0.15],
        [targetX + SIZE / 2, ty + SIZE * 0.85],
      ] as [number, number][]) {
        if (px < 0 || py < 0 || px > w || py > h) { score += 20; continue; }
        for (const e of document.elementsFromPoint(px, py)) {
          if (self && (e === self || self.contains(e))) continue;
          if (e.tagName === "BODY" || e.tagName === "HTML") continue;
          if (getComputedStyle(e).position === "fixed") continue;
          score++;
        }
      }
      if (score < bestYScore) { bestYScore = score; bestY = ty; }
    }

    return {
      x: Math.max(PAD, Math.min(targetX, w - SIZE - PAD)),
      y: Math.max(NAV_H + PAD, Math.min(bestY, h - SIZE - PAD)),
    };
  };

  const clearTimers = () => {
    clearTimeout(timer1.current);
    clearTimeout(timer2.current);
    clearTimeout(scrollTimer.current);
  };

  useEffect(() => {
    const anchor = document.getElementById("hero-photo-anchor");
    if (!anchor) return;

    const hc = getHeroCenter();
    setAnim({ x: hc.x, y: hc.y, scale: 0, opacity: 0 });

    const obs = new IntersectionObserver(([entry]) => {
      const inView = entry.isIntersecting;
      if (inView === heroInViewRef.current) return;
      heroInViewRef.current = inView;
      clearTimers();

      if (!inView) {
        const hc2 = getHeroCenter();
        setAnim({ x: hc2.x, y: hc2.y, scale: 0, opacity: 0 });
        timer1.current = setTimeout(() => {
          setAnim(p => ({ ...p, scale: 1, opacity: 1 }));
          setHint(true);
          setTimeout(() => setHint(false), 2200);
        }, 30);
        timer2.current = setTimeout(() => {
          const spot = findSmartSpot();
          setAnim(p => ({ ...p, x: spot.x, y: spot.y }));
        }, 280);
      } else {
        if (draggingRef.current) return;
        setHint(false);
        const hc2 = getHeroCenter();
        setAnim(p => ({ ...p, x: hc2.x, y: hc2.y }));
        timer1.current = setTimeout(() => {
          setAnim(p => ({ ...p, scale: 0, opacity: 0 }));
        }, 320);
      }
    }, { threshold: 0.15 });

    obs.observe(anchor);

    const onScroll = () => {
      if (heroInViewRef.current || draggingRef.current) return;
      clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => {
        const spot = findSmartSpot();
        setAnim(p => ({ ...p, x: spot.x, y: spot.y }));
      }, 160);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => { obs.disconnect(); window.removeEventListener("scroll", onScroll); clearTimers(); };
  }, [isMobile]);

  return (
    <motion.div
      ref={selfRef}
      drag
      dragMomentum={false}
      dragElastic={0.08}
      onDragStart={() => { draggingRef.current = true; setDragging(true); setHint(false); }}
      onDragEnd={() => { draggingRef.current = false; setDragging(false); }}
      animate={dragging ? undefined : anim}
      transition={dragging ? undefined : {
        x: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
        y: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
        scale: { duration: 0.22, ease: [0.34, 1.56, 0.64, 1] },
        opacity: { duration: 0.18 },
      }}
      initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
      style={{
        position: "fixed", width: SIZE, height: SIZE, zIndex: 55,
        cursor: dragging ? "grabbing" : "grab",
        touchAction: "none", userSelect: "none",
      }}
      whileDrag={{ scale: 1.1 }}
    >
      {/* Outer pulse glow */}
      <motion.div
        animate={{ opacity: [0.3, 0.65, 0.3], scale: [1, 1.18, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", inset: -18,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.4), rgba(232,201,109,0.12), transparent 70%)",
          filter: "blur(8px)",
          pointerEvents: "none",
        }}
      />

      {/* Spinning dashed ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute", inset: -7,
          borderRadius: "50%",
          border: "1.5px dashed rgba(232,201,109,0.38)",
          pointerEvents: "none",
        }}
      />

      {/* Counter-rotation ring */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute", inset: -14,
          borderRadius: "50%",
          border: "1px solid rgba(124,58,237,0.2)",
          pointerEvents: "none",
        }}
      />

      {/* Circle photo */}
      <div style={{
        width: SIZE, height: SIZE,
        borderRadius: "50%",
        overflow: "hidden",
        border: "2.5px solid rgba(232,201,109,0.75)",
        boxShadow: dragging
          ? "0 0 36px 8px rgba(232,201,109,0.65), 0 0 70px rgba(124,58,237,0.5), 0 12px 40px rgba(0,0,0,0.7)"
          : "0 0 22px 5px rgba(124,58,237,0.55), 0 0 44px rgba(232,201,109,0.15), 0 8px 32px rgba(0,0,0,0.6)",
        background: "#1a0f2e",
        transition: "box-shadow 0.12s",
        position: "relative",
      }}>
        <img
          src="/profile.png"
          alt="Profile"
          draggable={false}
          style={{
            width: "100%", height: "100%",
            objectFit: "cover", objectPosition: "center top",
            pointerEvents: "none",
            filter: "brightness(1.06) contrast(1.08) saturate(1.12)",
          }}
        />
        {/* Inner glow overlay */}
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: "50%",
          background: "linear-gradient(135deg, rgba(232,201,109,0.08) 0%, transparent 50%, rgba(124,58,237,0.06) 100%)",
          pointerEvents: "none",
        }} />
      </div>

      {/* Drag hint */}
      {hint && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          style={{
            position: "absolute", bottom: -30, left: "50%", transform: "translateX(-50%)",
            background: "rgba(8,6,18,0.88)",
            border: "1px solid rgba(232,201,109,0.45)",
            borderRadius: 20, padding: "3px 10px", fontSize: 9, color: "#e8c96d",
            whiteSpace: "nowrap", pointerEvents: "none",
            backdropFilter: "blur(8px)",
          }}>
          drag me ✦
        </motion.div>
      )}
    </motion.div>
  );
}


/* --------------------------------------------------
   PARTICLES
-------------------------------------------------- */
function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    let id: number;
    let w = c.width = window.innerWidth;
    let h = c.height = window.innerHeight;
    
    // Fewer particles on mobile for performance
    const count = w < 768 ? 20 : 45;
    
    const resize = () => { w = c.width = window.innerWidth; h = c.height = window.innerHeight; };
    window.addEventListener("resize", resize);
    
    const pts = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.4 + 0.4,
      hue: Math.random() > 0.5 ? 45 : 270,
    }));
    
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < count; i++) {
        const p = pts[i];
        p.x = (p.x + p.vx + w) % w;
        p.y = (p.y + p.vy + h) % h;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},80%,70%,0.4)`;
        ctx.fill();
        
        // Lines
        for (let j = i + 1; j < count; j++) {
          const b = pts[j];
          const dx = p.x - b.x;
          if (dx > 110 || dx < -110) continue;
          const dy = p.y - b.y;
          if (dy > 110 || dy < -110) continue;
          
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 110) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(232,201,109,${0.07 * (1 - d / 110)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

/* --------------------------------------------------
   TYPEWRITER
-------------------------------------------------- */
function Typewriter({ lines }: { lines: string[] }) {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [del, setDel] = useState(false);
  useEffect(() => {
    const cur = lines[idx];
    const t = setTimeout(() => {
      if (!del && text.length < cur.length) setText(cur.slice(0, text.length + 1));
      else if (!del && text.length === cur.length) { setTimeout(() => setDel(true), 1200); return; }
      else if (del && text.length > 0) setText(text.slice(0, -1));
      else { setDel(false); setIdx((i) => (i + 1) % lines.length); }
    }, del ? 15 : 40);
    return () => clearTimeout(t);
  }, [text, del, idx, lines]);
  return (
    <span>
      <span className="shimmer-text" style={{ fontWeight: 800 }}>{text}</span>
      <span className="cursor" style={{ color: "#e8c96d", fontWeight: 300 }}>|</span>
    </span>
  );
}

/* --------------------------------------------------
   COUNTER
-------------------------------------------------- */
function Counter({ to, suffix = "", label }: { to: number; suffix?: string; label: string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const dur = 800;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      setN(Math.floor(p * p * to));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, to]);
  return (
    <div ref={ref} style={{ textAlign: "center" }}>
      <div className="shimmer-text" style={{ fontSize: "2.4rem", fontWeight: 900, lineHeight: 1 }}>{n}{suffix}</div>
      <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", marginTop: 6, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

/* --------------------------------------------------
   SKILL BAR
-------------------------------------------------- */
function SkillBar({ name, level, delay = 0 }: { name: string; level: number; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{name}</span>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#e8c96d" }}>{level}%</span>
      </div>
      <div style={{ height: 4, borderRadius: 4, background: "rgba(255,255,255,0.06)" }}>
        <motion.div
          style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg, #7c3aed, #e8c96d, #f43f5e)" }}
          initial={{ width: 0, opacity: 0 }}
          animate={inView ? { width: `${level}%`, opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: delay * 0.5, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
    </div>
  );
}

/* --------------------------------------------------
   TILT CARD
-------------------------------------------------- */
function TiltCard({ children, style = {}, className = "" }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  const isMobile = useIsMobile();
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, gx: 50, gy: 50 });
  const move = (e: React.MouseEvent) => {
    if (isMobile) return;
    const r = ref.current!.getBoundingClientRect();
    setTilt({ x: ((e.clientX - r.left) / r.width - 0.5) * 16, y: ((e.clientY - r.top) / r.height - 0.5) * -16, gx: ((e.clientX - r.left) / r.width) * 100, gy: ((e.clientY - r.top) / r.height) * 100 });
  };
  const reset = () => setTilt({ x: 0, y: 0, gx: 50, gy: 50 });
  return (
    <div ref={ref} className={className} onMouseMove={move} onMouseLeave={reset}
      style={{ ...style, transform: `perspective(1000px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`, transition: "transform 0.05s ease", position: "relative", overflow: "hidden" }}>
      {!isMobile && <div style={{ position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none", zIndex: 1, background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.07), transparent 60%)` }} />}
      {children}
    </div>
  );
}

/* --------------------------------------------------
   REVEAL
-------------------------------------------------- */
function Reveal({ children, delay = 0, y = 50, style = {}, className = "" }: { children: React.ReactNode; delay?: number; y?: number; style?: React.CSSProperties; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} className={className} style={style} initial={{ opacity: 0, y }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.4, delay: delay * 0.5, ease: [0.4, 0, 0.2, 1] }}>
      {children}
    </motion.div>
  );
}

/* --------------------------------------------------
   SECTION HEADER
-------------------------------------------------- */
function SectionHeader({ num, title, sub }: { num: string; title: string; sub?: string }) {
  const isMobile = useIsMobile();
  return (
    <Reveal style={{ marginBottom: 40, position: "relative" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 14px", borderRadius: 100, marginBottom: 14, background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#7c3aed", display: "inline-block" }} />{num}
      </div>
      <h2 style={{ fontSize: isMobile ? "2rem" : "2.8rem", fontWeight: 900, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 8 }}>{title}</h2>
      {sub && <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.88rem" }}>{sub}</p>}
      <div style={{ marginTop: 14, height: 2, width: 64, borderRadius: 2, background: "linear-gradient(90deg, #7c3aed, #e8c96d, transparent)" }} />
    </Reveal>
  );
}

/* --------------------------------------------------
   MARQUEE
-------------------------------------------------- */
const TAGS = ["Meta Ads","TikTok Ads","Snapchat Ads","ROAS Optimizer","A/B Testing","Data Analysis","Pixel Setup","Campaign Scaling","CRO","eCommerce","Retargeting","Performance Marketing","Creative Testing","Budget Optimization","Audience Research"];
function Marquee() {
  const items = [...TAGS, ...TAGS];
  return (
    <div style={{ overflow: "hidden", borderTop: "1px solid rgba(232,201,109,0.07)", borderBottom: "1px solid rgba(232,201,109,0.07)", padding: "12px 0", background: "rgba(0,0,0,0.25)" }}>
      <div className="marquee-track" style={{ gap: 28 }}>
        {items.map((item, i) => (
          <span key={i} style={{ whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 12, color: i % 3 === 0 ? "#e8c96d" : i % 3 === 1 ? "#a78bfa" : "rgba(255,255,255,0.3)", fontWeight: 600, fontSize: "0.78rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {item}<span style={{ color: "rgba(232,201,109,0.25)", fontSize: "0.5rem" }}>?</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------
   PROFILE PHOTO HERO
-------------------------------------------------- */
function ProfileHero({ scrollY }: { scrollY: any }) {
  const isMobile = useIsMobile();
  const floatY = useTransform(scrollY, [0, 600], [0, isMobile ? -20 : -50]);
  const scale = useTransform(scrollY, [0, 500], [1, isMobile ? 0.95 : 0.94]);
  const orbitDots = [
    { color: "#e8c96d", size: 8, r: 120, dur: 3, start: 0 },
    { color: "#7c3aed", size: 6, r: 130, dur: 4.5, start: 120 },
    { color: "#f43f5e", size: 5, r: 115, dur: 6, start: 240 },
    { color: "#06b6d4", size: 4, r: 135, dur: 7.5, start: 60 },
  ];
  const photoW = isMobile ? 180 : 220;
  const photoH = isMobile ? 218 : 268;
  return (
    <motion.div style={{ y: floatY, scale, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      {orbitDots.map((d, i) => (
        <motion.div key={i} style={{ position: "absolute", top: "50%", left: "50%", width: d.size, height: d.size, marginTop: -d.size / 2, marginLeft: -d.size / 2, borderRadius: "50%", background: d.color, boxShadow: `0 0 10px ${d.color}` }}
          animate={{ x: [Math.cos(d.start * Math.PI / 180) * d.r, Math.cos((d.start + 360) * Math.PI / 180) * d.r], y: [Math.sin(d.start * Math.PI / 180) * d.r, Math.sin((d.start + 360) * Math.PI / 180) * d.r] }}
          transition={{ duration: d.dur, repeat: Infinity, ease: "linear" }} />
      ))}
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        style={{ position: "absolute", width: photoW + 40, height: photoH + 40, borderRadius: "60% 40% 50% 50% / 50% 50% 60% 40%", border: "2px solid transparent", background: "conic-gradient(from 0deg, #e8c96d, #7c3aed, #f43f5e, transparent, #e8c96d) border-box", WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "destination-out", maskComposite: "exclude" }} />
      <motion.div animate={{ rotate: -360 }} transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
        style={{ position: "absolute", width: photoW + 68, height: photoH + 68, borderRadius: "50% 60% 40% 60% / 60% 40% 60% 40%", border: "1px solid rgba(124,58,237,0.3)", opacity: 0.6 }} />
      <motion.div animate={{ scale: [1, 1.18, 1], opacity: [0.45, 0.85, 0.45] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", width: photoW, height: photoH, background: "radial-gradient(ellipse, rgba(124,58,237,0.55), rgba(232,201,109,0.18), transparent)", filter: "blur(28px)", borderRadius: "60% 40% 50% 50% / 50% 50% 60% 40%" }} />
      <div style={{ width: photoW, height: photoH, borderRadius: "60% 40% 50% 50% / 50% 50% 60% 40%", overflow: "hidden", position: "relative", border: "2px solid rgba(232,201,109,0.55)", boxShadow: "0 0 50px rgba(124,58,237,0.45), 0 0 100px rgba(232,201,109,0.1)" }}>
        <img src="/profile.png" alt="Media Buyer" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", filter: "brightness(1.05) contrast(1.08) saturate(1.1)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(232,201,109,0.07), transparent 50%, rgba(124,58,237,0.05))" }} />
      </div>
      <div style={{ position: "absolute", bottom: 10, right: isMobile ? -6 : -14, background: "rgba(10,6,20,0.92)", border: "1px solid rgba(74,222,128,0.45)", borderRadius: 100, padding: "5px 12px", display: "flex", alignItems: "center", gap: 6, backdropFilter: "blur(12px)" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", display: "inline-block", boxShadow: "0 0 8px #4ade80" }} />
        <span style={{ fontSize: "0.68rem", color: "#4ade80", fontWeight: 700 }}>Open to Work</span>
      </div>
      {!isMobile && (
        <>
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 1.75, repeat: Infinity }}
            style={{ position: "absolute", left: -70, top: "15%", background: "rgba(10,6,20,0.85)", border: "1px solid rgba(232,201,109,0.2)", borderRadius: 12, padding: "8px 14px", backdropFilter: "blur(12px)" }}>
            <div style={{ fontSize: "0.7rem", color: "#e8c96d", fontWeight: 800 }}>Meta Ads</div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)" }}>Expert</div>
          </motion.div>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2.25, repeat: Infinity, delay: 0.5 }}
            style={{ position: "absolute", right: -64, top: "35%", background: "rgba(10,6,20,0.85)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: 12, padding: "8px 14px", backdropFilter: "blur(12px)" }}>
            <div style={{ fontSize: "0.7rem", color: "#a78bfa", fontWeight: 800 }}>ROAS</div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)" }}>Optimizer</div>
          </motion.div>
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity, delay: 0.25 }}
            style={{ position: "absolute", left: -60, bottom: "18%", background: "rgba(10,6,20,0.85)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: 12, padding: "8px 14px", backdropFilter: "blur(12px)" }}>
            <div style={{ fontSize: "0.7rem", color: "#f87171", fontWeight: 800 }}>TikTok</div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)" }}>Campaigns</div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}

/* --------------------------------------------------
   SIDEBAR MINI PROFILE
-------------------------------------------------- */
function SidebarProfile() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <motion.div style={{ position: "relative" }} animate={{ y: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
        <div style={{ width: 120, height: 148, borderRadius: "55% 45% 50% 50% / 50% 50% 55% 45%", overflow: "hidden", border: "2px solid rgba(232,201,109,0.45)", boxShadow: "0 0 36px rgba(124,58,237,0.5), 0 0 70px rgba(232,201,109,0.08)" }}>
          <img src="/profile.png" alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
        </div>
        <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}
          style={{ position: "absolute", inset: -8, borderRadius: "60% 40% 55% 45% / 45% 55% 45% 55%", border: "1px solid rgba(232,201,109,0.25)" }} />
      </motion.div>
      <div style={{ textAlign: "center" }}>
        <div className="shimmer-text" style={{ fontWeight: 800, fontSize: "0.88rem", marginBottom: 3 }}>Media Buyer</div>
        <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.07em" }}>Performance Marketing</div>
      </div>
      <div style={{ width: "100%", height: 1, background: "linear-gradient(90deg, transparent, rgba(232,201,109,0.18), transparent)" }} />
      {[{ icon: "📍", label: "Location", val: "Cairo, Al-Maadi" }, { icon: "🎂", label: "Birthday", val: "28 Aug 2003" }, { icon: "💼", label: "Work Type", val: "Freelancer" }].map((item) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 11px", width: "100%", borderRadius: 10, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <span style={{ fontSize: "0.85rem" }}>{item.icon}</span>
          <div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.28)", letterSpacing: "0.06em" }}>{item.label}</div>
            <div style={{ fontSize: "0.74rem", color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{item.val}</div>
          </div>
        </div>
      ))}
      <div style={{ width: "100%", height: 1, background: "linear-gradient(90deg, transparent, rgba(232,201,109,0.18), transparent)" }} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
        {[{ label: "Meta", color: "#1877f2" }, { label: "TikTok", color: "#fe2c55" }, { label: "Snap", color: "#fffc00", text: "#000" }].map((p) => (
          <span key={p.label} style={{ fontSize: "0.62rem", fontWeight: 800, padding: "3px 9px", borderRadius: 100, background: `${p.color}1a`, border: `1px solid ${p.color}44`, color: (p as any).text || p.color, letterSpacing: "0.05em" }}>{p.label}</span>
        ))}
      </div>
      <motion.a href="#contact" className="glow-btn" style={{ display: "block", width: "100%", textAlign: "center", padding: "11px 0", borderRadius: 11, fontSize: "0.78rem", textDecoration: "none" }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>Contact Me</motion.a>
    </div>
  );
}

/* --------------------------------------------------
   PLATFORM CARD
-------------------------------------------------- */
function PlatCard({ icon, title, accent, skills, delay }: { icon: React.ReactNode; title: string; accent: string; skills: string[]; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 36, scale: 0.94 }} animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}} transition={{ duration: 0.35, delay: (delay || 0) * 0.5, ease: [0.4, 0, 0.2, 1] }}>
      <TiltCard className="glass" style={{ padding: 24, height: "100%", cursor: "default" }}>
        <div style={{ width: 50, height: 50, borderRadius: 14, background: accent, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, boxShadow: `0 0 20px ${accent.includes(",") ? "rgba(0,0,0,0.3)" : accent + "66"}` }}>{icon}</div>
        <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", marginBottom: 10 }}>{title}</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {skills.map((s, i) => (
            <li key={i} style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#7c3aed", display: "inline-block", flexShrink: 0 }} />{s}
            </li>
          ))}
        </ul>
      </TiltCard>
    </motion.div>
  );
}

/* --------------------------------------------------
   MAIN APP
-------------------------------------------------- */
export default function App() {
  const isMobile = useIsMobile();
  const { scrollY } = useScroll();
  const springY = useSpring(scrollY, { stiffness: 120, damping: 22 });
  const navBg = useTransform(scrollY, [0, 80], ["rgba(8,6,18,0)", "rgba(8,6,18,0.92)"]);
  const navBorder = useTransform(scrollY, [0, 80], ["rgba(232,201,109,0)", "rgba(232,201,109,0.1)"]);
  const heroOpacity = useTransform(scrollY, [0, 450], [1, 0]);
  const heroY = useTransform(springY, [0, 600], [0, isMobile ? -40 : -80]);
  const [navOpen, setNavOpen] = useState(false);
  const NAV_LINKS = ["Skills", "Experience", "Platforms", "Contact"];

  return (
    <div style={{ minHeight: "100vh", background: "#080612", position: "relative" }}>
      <div className="aurora-bg">
        <div className="aurora-orb aurora-orb-1" />
        <div className="aurora-orb aurora-orb-2" />
        <div className="aurora-orb aurora-orb-3" />
        <div className="aurora-orb aurora-orb-4" />
        <div className="aurora-orb aurora-orb-5" />
      </div>
      <div className="grid-overlay" />
      <div className="noise-overlay" />
      <Particles />
      <FloatingPhoto />

      {/* NAV */}
      <motion.nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "14px 20px" : "16px 48px", backdropFilter: "blur(18px)", background: navBg, borderBottom: "1px solid", borderColor: navBorder }}
        initial={{ y: -70 }} animate={{ y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <motion.div animate={{ scale: [1, 1.25, 1], rotate: [0, 180, 360] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} style={{ width: 10, height: 10, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #e8c96d)", boxShadow: "0 0 14px #7c3aed" }} />
          <span className="gold-text" style={{ fontWeight: 900, fontSize: "0.95rem", letterSpacing: "-0.01em" }}>Media Buyer</span>
        </div>
        {isMobile ? (
          <button onClick={() => setNavOpen(!navOpen)} style={{ background: "none", border: "none", cursor: "pointer", color: "#e8c96d", padding: 4 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {navOpen ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
            </svg>
          </button>
        ) : (
          <div style={{ display: "flex", gap: 28 }}>
            {NAV_LINKS.map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="nav-link"
                style={{ color: "rgba(255,255,255,0.45)", textDecoration: "none", fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", transition: "color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#e8c96d")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}>{item}</a>
            ))}
          </div>
        )}
      </motion.nav>

      {isMobile && navOpen && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          style={{ position: "fixed", top: 56, left: 0, right: 0, zIndex: 99, background: "rgba(8,6,18,0.97)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(232,201,109,0.1)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV_LINKS.map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setNavOpen(false)}
              style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: "0.88rem", fontWeight: 600, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", letterSpacing: "0.04em" }}>{item}</a>
          ))}
        </motion.div>
      )}

      {/* HERO */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", padding: isMobile ? "100px 20px 60px" : "110px 6% 60px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", width: "100%", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 40 : 80, alignItems: "center" }}>
          <motion.div style={{ y: heroY, opacity: heroOpacity, order: isMobile ? 2 : 1 }} initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
            <motion.div animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 1.75, repeat: Infinity }}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 16px", borderRadius: 100, marginBottom: 24, border: "1px solid rgba(232,201,109,0.28)", background: "rgba(232,201,109,0.05)" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", display: "inline-block", boxShadow: "0 0 8px #4ade80" }} />
              <span style={{ fontSize: "0.7rem", color: "#e8c96d", fontWeight: 700, letterSpacing: "0.1em" }}>AVAILABLE FOR WORK</span>
            </motion.div>
            <h1 style={{ fontSize: isMobile ? "3.2rem" : "clamp(3.8rem, 7vw, 6rem)", fontWeight: 900, color: "#fff", lineHeight: 1.02, letterSpacing: "-0.035em", marginBottom: 18 }}>
              Digital<br /><span className="gold-text">Media</span><br />
              <span style={{ color: "rgba(255,255,255,0.18)", fontSize: "52%", letterSpacing: "-0.01em", background: "linear-gradient(90deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Buyer ?</span>
            </h1>
            <div style={{ fontSize: "1rem", marginBottom: 22, minHeight: 28, color: "rgba(255,255,255,0.55)" }}>
              <Typewriter lines={["Media Buyer | eCommerce", "Meta Ads Specialist", "TikTok Campaign Manager", "ROAS & CRO Optimizer", "Data-Driven Advertiser"]} />
            </div>
            <p style={{ color: "rgba(255,255,255,0.38)", lineHeight: 1.8, fontSize: "0.88rem", maxWidth: 440, marginBottom: 36 }}>
              I turn ad spend into real sales � not just clicks. I work data-first on Meta, TikTok & Snapchat to drive the best possible results for your business.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <motion.a href="#contact" className="glow-btn magnetic-btn" style={{ padding: "14px 30px", borderRadius: 12, fontSize: "0.88rem", textDecoration: "none", display: "inline-block", letterSpacing: "0.02em" }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>Contact Me Now ?</motion.a>
              <motion.a href="#skills" className="outline-btn" style={{ padding: "14px 30px", borderRadius: 12, fontSize: "0.88rem", textDecoration: "none", display: "inline-block" }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>View Skills ?</motion.a>
            </div>
          </motion.div>
          <div id="hero-photo-anchor" style={{ display: "flex", justifyContent: "center", order: isMobile ? 1 : 2, paddingTop: isMobile ? 20 : 0 }}>
            <ProfileHero scrollY={springY} />
          </div>
        </div>
        <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}
          style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.18)", fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>
          <span>Scroll</span>
          <div style={{ width: 1, height: 36, background: "linear-gradient(180deg, rgba(232,201,109,0.45), transparent)" }} />
        </motion.div>
      </section>

      <div style={{ position: "relative", zIndex: 1 }}><Marquee /></div>

      {/* STATS */}
      <section style={{ padding: isMobile ? "50px 20px" : "70px 6%", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <Reveal>
            <div className="glass-dark" style={{ padding: isMobile ? "28px 20px" : "44px 40px", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 28 : 32 }}>
              <Counter to={12} suffix="+" label="Months of Experience" />
              <Counter to={50} suffix="+" label="Successful Campaigns" />
              <Counter to={3} label="Ad Platforms" />
              <Counter to={95} suffix="%" label="Client Satisfaction" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* SIDEBAR + CONTENT */}
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: isMobile ? "0 20px 80px" : "0 6% 100px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "260px 1fr", gap: isMobile ? 0 : 60, position: "relative", zIndex: 1, alignItems: "start" }}>
        {!isMobile && (
          <div style={{ position: "sticky", top: 96, height: "fit-content" }}>
            <Reveal><div className="glass" style={{ padding: 24 }}><SidebarProfile /></div></Reveal>
          </div>
        )}

        <div id="skills" style={{ display: "flex", flexDirection: "column", gap: isMobile ? 60 : 80 }}>

          {/* SKILLS */}
          <section>
            <SectionHeader num="01" title="Skills" sub="Everything I master in digital advertising" />
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18, marginBottom: 18 }}>
              <Reveal className="glass" style={{ padding: 24 }}>
                <h3 className="gold-text" style={{ fontWeight: 800, fontSize: "0.85rem", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 20 }}>Ad Platforms</h3>
                <SkillBar name="Meta Ads (Facebook & Instagram)" level={92} delay={0.1} />
                <SkillBar name="TikTok Ads" level={85} delay={0.2} />
                <SkillBar name="Snapchat Ads" level={80} delay={0.3} />
                <SkillBar name="ROAS Optimization" level={91} delay={0.4} />
              </Reveal>
              <Reveal delay={0.12} className="glass" style={{ padding: 24 }}>
                <h3 className="gold-text" style={{ fontWeight: 800, fontSize: "0.85rem", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 20 }}>Growth Skills</h3>
                <SkillBar name="A/B Testing" level={88} delay={0.1} />
                <SkillBar name="Tracking & Pixel Setup" level={87} delay={0.2} />
                <SkillBar name="Campaign Scaling" level={86} delay={0.3} />
                <SkillBar name="Data Analysis & Reporting" level={90} delay={0.4} />
              </Reveal>
            </div>
            <Reveal style={{ marginTop: 4 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {["Meta Ads Manager","TikTok Business","Snap Ads","A/B Testing","ROAS","Retargeting","Lookalike Audiences","CRO","Data Analysis","Pixel Setup","Campaign Scaling","Creative Testing","Budget Management","eCommerce"].map((tag, i) => (
                  <motion.span key={tag} style={{ padding: "5px 12px", borderRadius: 100, fontSize: "0.7rem", fontWeight: 600, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", color: "rgba(167,139,250,0.8)", cursor: "default" }}
                    initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}
                    whileHover={{ background: "rgba(124,58,237,0.2)", borderColor: "rgba(124,58,237,0.5)", scale: 1.06 }}>{tag}</motion.span>
                ))}
              </div>
            </Reveal>
          </section>

          {/* EXPERIENCE */}
          <section id="experience">
            <SectionHeader num="02" title="Experience" sub="My professional journey in performance marketing" />
            <Reveal>
              <div style={{ position: "relative", paddingLeft: 24 }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: "linear-gradient(180deg, #7c3aed, #e8c96d, transparent)" }} />
                <div style={{ position: "absolute", left: -7, top: 24, width: 16, height: 16, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #e8c96d)", boxShadow: "0 0 18px rgba(124,58,237,0.8)", zIndex: 2 }} />
                <div className="glass" style={{ padding: isMobile ? 22 : 32 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 22 }}>
                    <div>
                      <h3 style={{ fontSize: isMobile ? "1.2rem" : "1.4rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", marginBottom: 4 }}>Media Buyer</h3>
                      <div style={{ color: "#e8c96d", fontWeight: 700, fontSize: "0.85rem" }}>Freelance — Cairo, Al-Maadi</div>
                    </div>
                    <div className="glass-purple" style={{ padding: "7px 16px", borderRadius: 100, fontSize: "0.74rem", color: "#a78bfa", fontWeight: 700, whiteSpace: "nowrap" }}>April 2025 � Present</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                    {["Managed ad campaigns on Meta (Facebook & Instagram), TikTok & Snapchat","Tested multiple Creatives, Audiences & Offers to find winning combinations","Daily campaign monitoring with data-driven decision making","Optimized Conversion Rate (CRO) and reduced cost per result","Scaled successful campaigns while maintaining strong ROAS","Set up and managed tracking tools for accurate data collection","Delivered clear performance reports with actionable recommendations"].map((item, i) => (
                      <motion.div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "10px 12px", borderRadius: 10, background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.1)", fontSize: "0.78rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}
                        initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                        whileHover={{ background: "rgba(124,58,237,0.12)", color: "rgba(255,255,255,0.82)" }}>
                        <span style={{ color: "#7c3aed", marginTop: 2, flexShrink: 0, fontSize: "0.65rem" }}>?</span>{item}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </section>

          {/* PLATFORMS */}
          <section id="platforms">
            <SectionHeader num="03" title="Platforms" sub="Where I drive results every day" />
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16 }}>
              <PlatCard title="Meta Ads" accent="linear-gradient(135deg,#1877f2,#0c52b3)" delay={0.0} icon={<svg viewBox="0 0 24 24" fill="white" width="24" height="24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>} skills={["Facebook & Instagram Ads","Custom Audiences","Lookalike Audiences","Retargeting Campaigns","Pixel Setup & Tracking","Campaign Scaling"]} />
              <PlatCard title="TikTok Ads" accent="linear-gradient(135deg,#010101,#2a2a2a)" delay={0.1} icon={<svg viewBox="0 0 24 24" fill="white" width="24" height="24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" /></svg>} skills={["In-Feed Ads","Spark Ads","TopView Campaigns","Creative Testing","TikTok Pixel Setup","Gen-Z Targeting"]} />
              <PlatCard title="Snapchat Ads" accent="linear-gradient(135deg,#fffc00,#e6e300)" delay={0.2} icon={<svg viewBox="0 0 24 24" fill="#000" width="24" height="24"><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3 0 .677-.084 1.03-.189.097-.028.218-.044.316-.037.132.012.22.075.22.15.001.082-.1.176-.22.228-.18.077-.409.12-.62.12-.12 0-.24-.012-.36-.035.055.183.106.37.145.569.018.09.02.18.016.27-.004.15-.063.3-.16.413-.1.124-.253.211-.413.247-.088.02-.16.032-.228.032-.1 0-.177-.024-.26-.065-.225-.11-.45-.227-.82-.274-.18-.024-.359-.035-.54-.035-.358 0-.713.065-1.058.19-.45.16-.9.333-1.412.333-.512 0-.96-.173-1.412-.333-.345-.125-.7-.19-1.058-.19-.181 0-.36.011-.54.035-.37.047-.595.164-.82.274-.083.041-.16.065-.26.065-.068 0-.14-.012-.228-.032-.16-.036-.313-.123-.413-.247-.097-.113-.156-.263-.16-.413-.004-.09-.002-.18.016-.27.039-.199.09-.386.145-.569-.12.023-.24.035-.36.035-.211 0-.44-.043-.62-.12-.12-.052-.221-.146-.22-.228 0-.075.088-.138.22-.15.098-.007.219.009.316.037.353.105.73.189 1.03.189.198 0 .326-.045.4-.09-.008-.165-.017-.33-.03-.51l-.002-.06c-.104-1.628-.23-3.654.299-4.847C7.853 1.069 11.215.793 12.206.793z" /></svg>} skills={["Story Ads","Collection Ads","Dynamic Ads","AR Lens Campaigns","Snap Pixel Setup","Youth Targeting"]} />
            </div>
          </section>

          {/* SERVICES */}
          <section>
            <SectionHeader num="04" title="Services" sub="What I can do for your business" />
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
              {[{ emoji: "🎯", title: "Campaign Management", desc: "Full management of your ad campaigns on Meta, TikTok & Snapchat with maximum efficiency.", accent: "#7c3aed" },{ emoji: "📊", title: "Data Analysis & Reports", desc: "Daily, weekly and monthly reports with clear insights and actionable recommendations.", accent: "#e8c96d" },{ emoji: "📈", title: "Campaign Scaling", desc: "Growing winning campaigns gradually while protecting your ROAS and performance targets.", accent: "#f43f5e" },{ emoji: "🧪", title: "A/B Testing", desc: "Systematic testing of Creatives, Audiences & Offers to find the best-performing combo.", accent: "#06b6d4" },{ emoji: "⚙️", title: "Tracking Setup", desc: "Accurate Pixel & tracking configuration to ensure clean data and confident decisions.", accent: "#7c3aed" },{ emoji: "💡", title: "Marketing Consulting", desc: "Full ad strategy tailored to your product type and target audience.", accent: "#e8c96d" }].map((s, i) => (
                <Reveal key={s.title} delay={i * 0.07}>
                  <TiltCard className="glass" style={{ padding: 22, height: "100%", cursor: "default" }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div style={{ fontSize: "1.4rem", width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 11, background: `${s.accent}16`, border: `1px solid ${s.accent}28`, flexShrink: 0 }}>{s.emoji}</div>
                      <div>
                        <div style={{ fontWeight: 800, color: "#fff", fontSize: "0.88rem", marginBottom: 5 }}>{s.title}</div>
                        <div style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.38)", lineHeight: 1.6 }}>{s.desc}</div>
                      </div>
                    </div>
                  </TiltCard>
                </Reveal>
              ))}
            </div>
          </section>

          {/* WHY ME */}
          <section>
            <SectionHeader num="05" title="Why Me?" sub="What sets me apart from the rest" />
            <Reveal>
              <div className="glass-dark gradient-border" style={{ padding: isMobile ? 26 : 38, borderRadius: 20, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", right: -50, top: -50, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.14), transparent)", pointerEvents: "none" }} />
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 28, position: "relative", zIndex: 1 }}>
                  <div>
                    <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.85, marginBottom: 24, fontWeight: 300 }}>I don't work on gut feelings � I work on data. Every decision I make is backed by real numbers from live campaigns, monitored daily.</p>
                    {[{ label: "Data-driven decisions, not guesswork", color: "#7c3aed" },{ label: "Daily monitoring & continuous optimization", color: "#e8c96d" },{ label: "Full transparency in results", color: "#f43f5e" },{ label: "Focus on real ROI, not vanity metrics", color: "#06b6d4" }].map((p, i) => (
                      <motion.div key={p.label} style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 11 }} initial={{ opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${p.color}1a`, border: `1.5px solid ${p.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 900, color: p.color, flexShrink: 0 }}>?</div>
                        <span style={{ fontSize: "0.84rem", color: "rgba(255,255,255,0.65)", fontWeight: 500 }}>{p.label}</span>
                      </motion.div>
                    ))}
                  </div>
                  {!isMobile && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ position: "relative", width: 160, height: 160 }}>
                        <div style={{ position: "absolute", inset: "50%", transform: "translate(-50%,-50%)", width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#e8c96d)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", boxShadow: "0 0 36px rgba(124,58,237,0.6)" }}>✨</div>
                        {["📱","💰","🛒","🚀"].map((icon, i) => (
                          <motion.div key={i} style={{ position: "absolute", top: "50%", left: "50%", width: 34, height: 34, marginTop: -17, marginLeft: -17, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}
                            animate={{ x: Math.cos(i * Math.PI / 2) * 72, y: Math.sin(i * Math.PI / 2) * 72, rotate: [0, 360] }}
                            transition={{ x: { duration: 8, repeat: Infinity, ease: "linear" }, y: { duration: 8, repeat: Infinity, ease: "linear" }, rotate: { duration: 8, repeat: Infinity, ease: "linear" } }}>{icon}</motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Reveal>
          </section>

          {/* CONTACT */}
          <section id="contact">
            <SectionHeader num="06" title="Contact" sub="Ready to start whenever you are" />
            <Reveal>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
                {[{ icon: "💬", label: "WhatsApp", val: "Chat Now", color: "#25D366", href: "https://wa.me/201234567890" },{ icon: "📧", label: "Email", val: "apdelrahman3rt@gmail.com", color: "#e8c96d", href: "mailto:apdelrahman3rt@gmail.com" },{ icon: "✈️", label: "Telegram", val: "@mediabuyerpro", color: "#2AABEE", href: "https://t.me/mediabuyerpro" }].map((c, i) => (
                  <motion.a key={i} href={c.href} target="_blank" rel="noopener noreferrer" className="glass"
                    style={{ padding: 22, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textDecoration: "none", borderRadius: 16, cursor: "pointer" }}
                    whileHover={{ scale: 1.04, boxShadow: `0 0 28px ${c.color}28` }} whileTap={{ scale: 0.97 }}
                    initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                    <span style={{ fontSize: "1.7rem" }}>{c.icon}</span>
                    <span style={{ fontSize: "0.66rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}>{c.label}</span>
                    <span style={{ fontSize: "0.78rem", color: c.color, fontWeight: 700 }}>{c.val}</span>
                  </motion.a>
                ))}
              </div>
              <motion.div className="glass-purple" style={{ padding: isMobile ? 28 : 40, textAlign: "center", borderRadius: 20, position: "relative", overflow: "hidden" }}
                initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} whileHover={{ boxShadow: "0 0 60px rgba(124,58,237,0.25)" }}>
                <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(232,201,109,0.07), transparent 60%)", pointerEvents: "none" }} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <p style={{ fontSize: isMobile ? "1.2rem" : "1.5rem", fontWeight: 900, color: "#fff", marginBottom: 8 }}>Ready to scale your business?</p>
                  <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.86rem", marginBottom: 26 }}>Let me turn your ad spend into real, measurable revenue</p>
                  <motion.a href="https://wa.me/201234567890" target="_blank" rel="noopener noreferrer" className="glow-btn"
                    style={{ display: "inline-block", padding: isMobile ? "13px 36px" : "16px 52px", borderRadius: 14, fontSize: "0.95rem", textDecoration: "none" }}
                    whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.97 }}>Start Now 🚀</motion.a>
                </div>
              </motion.div>
            </Reveal>
          </section>

          <div style={{ paddingTop: 32, borderTop: "1px solid rgba(232,201,109,0.06)", textAlign: "center", color: "rgba(255,255,255,0.18)", fontSize: "0.72rem" }}>
            � 2025 Media Buyer Pro � Crafted to convert
          </div>
        </div>
      </div>
    </div>
  );
}
