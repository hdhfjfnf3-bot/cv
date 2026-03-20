import { useEffect, useRef, useState, useCallback } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useInView,
  AnimatePresence,
} from "framer-motion";

/* ══════════════════════════════════════
   TYPES
══════════════════════════════════════ */
type SkillItem = { name: string; level: number };

/* ══════════════════════════════════════
   PARTICLE CANVAS
══════════════════════════════════════ */
function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    let id: number;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const pts = Array.from({ length: 60 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.5,
      hue: Math.random() > 0.5 ? 45 : 270,
    }));
    const tick = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      pts.forEach((p) => {
        p.x = (p.x + p.vx + c.width) % c.width;
        p.y = (p.y + p.vy + c.height) % c.height;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, 0.4)`;
        ctx.fill();
      });
      pts.forEach((a, i) => pts.slice(i + 1).forEach((b) => {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 130) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(232,201,109,${0.06 * (1 - d / 130)})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }));
      id = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", resize); };
  }, []);
  return (
    <canvas
      ref={ref}
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
    />
  );
}

/* ══════════════════════════════════════
   TYPEWRITER
══════════════════════════════════════ */
function Typewriter({ lines }: { lines: string[] }) {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState("");
  const [del, setDel] = useState(false);
  useEffect(() => {
    const cur = lines[idx];
    const t = setTimeout(() => {
      if (!del && text.length < cur.length) setText(cur.slice(0, text.length + 1));
      else if (!del && text.length === cur.length) { setTimeout(() => setDel(true), 2200); return; }
      else if (del && text.length > 0) setText(text.slice(0, -1));
      else { setDel(false); setIdx((i) => (i + 1) % lines.length); }
    }, del ? 35 : 80);
    return () => clearTimeout(t);
  }, [text, del, idx, lines]);
  return (
    <span>
      <span className="shimmer-text font-black">{text}</span>
      <span className="cursor text-yellow-400 font-thin">|</span>
    </span>
  );
}

/* ══════════════════════════════════════
   COUNTER
══════════════════════════════════════ */
function Counter({ to, suffix = "", label }: { to: number; suffix?: string; label: string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const dur = 1800;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      setN(Math.floor(p * p * to));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, to]);
  return (
    <div ref={ref} className="text-center">
      <div className="text-5xl font-black shimmer-text leading-none">{n}{suffix}</div>
      <div className="text-xs text-white/40 mt-2 font-medium tracking-widest uppercase">{label}</div>
    </div>
  );
}

/* ══════════════════════════════════════
   SKILL BAR
══════════════════════════════════════ */
function SkillBar({ name, level, delay = 0 }: SkillItem & { delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} className="mb-5">
      <div className="flex justify-between mb-1.5">
        <span className="text-sm font-semibold text-white/80">{name}</span>
        <span className="text-xs font-bold" style={{ color: "#e8c96d" }}>{level}%</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg, #7c3aed, #e8c96d, #f43f5e)" }}
          initial={{ width: 0, opacity: 0 }}
          animate={inView ? { width: `${level}%`, opacity: 1 } : {}}
          transition={{ duration: 1.6, delay, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   TILT CARD
══════════════════════════════════════ */
function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, glare: { x: 50, y: 50 } });
  const move = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 18;
    const y = ((e.clientY - r.top) / r.height - 0.5) * -18;
    const gx = ((e.clientX - r.left) / r.width) * 100;
    const gy = ((e.clientY - r.top) / r.height) * 100;
    setTilt({ x, y, glare: { x: gx, y: gy } });
  };
  const reset = () => setTilt({ x: 0, y: 0, glare: { x: 50, y: 50 } });
  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={move}
      onMouseLeave={reset}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
        transition: "transform 0.15s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glare */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at ${tilt.glare.x}% ${tilt.glare.y}%, rgba(255,255,255,0.08), transparent 60%)`,
          pointerEvents: "none",
          zIndex: 1,
          borderRadius: "inherit",
        }}
      />
      {children}
    </div>
  );
}

/* ══════════════════════════════════════
   SECTION REVEAL
══════════════════════════════════════ */
function Reveal({
  children,
  delay = 0,
  y = 60,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ══════════════════════════════════════
   SECTION HEADER
══════════════════════════════════════ */
function SectionHeader({ num, title, sub }: { num: string; title: string; sub?: string }) {
  return (
    <Reveal className="mb-14 relative">
      <div
        className="section-number"
        style={{
          fontSize: "7rem",
          fontWeight: 900,
          color: "rgba(232,201,109,0.04)",
          position: "absolute",
          top: -20,
          right: 0,
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        {num}
      </div>
      <div
        className="highlight-chip mb-4"
        style={{
          background: "rgba(124,58,237,0.15)",
          border: "1px solid rgba(124,58,237,0.35)",
          color: "#a78bfa",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#7c3aed",
            display: "inline-block",
          }}
        />
        {num}
      </div>
      <h2
        className="text-5xl font-black text-white leading-tight"
        style={{ letterSpacing: "-0.02em" }}
      >
        {title}
      </h2>
      {sub && <p className="text-white/40 mt-3 text-base">{sub}</p>}
      <div
        className="mt-5 h-px w-24"
        style={{
          background: "linear-gradient(90deg, #7c3aed, #e8c96d, transparent)",
        }}
      />
    </Reveal>
  );
}

/* ══════════════════════════════════════
   MARQUEE
══════════════════════════════════════ */
const MARQUEE_ITEMS = [
  "Meta Ads", "TikTok Ads", "Snapchat Ads", "ROAS Optimizer",
  "A/B Testing", "Data Analysis", "Pixel Setup", "Campaign Scaling",
  "CRO", "eCommerce", "Retargeting", "Performance Marketing",
  "Creative Testing", "Budget Optimization", "Audience Research",
];
function Marquee() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div
      style={{
        overflow: "hidden",
        borderTop: "1px solid rgba(232,201,109,0.08)",
        borderBottom: "1px solid rgba(232,201,109,0.08)",
        padding: "14px 0",
        background: "rgba(0,0,0,0.2)",
      }}
    >
      <div className="marquee-track gap-6" style={{ gap: 32 }}>
        {items.map((item, i) => (
          <span
            key={i}
            style={{
              whiteSpace: "nowrap",
              color: i % 3 === 0 ? "#e8c96d" : i % 3 === 1 ? "#a78bfa" : "rgba(255,255,255,0.4)",
              fontWeight: 600,
              fontSize: "0.85rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              display: "inline-flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            {item}
            <span style={{ color: "rgba(232,201,109,0.3)", fontSize: "0.6rem" }}>◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   PROFILE PHOTO (STICKY)
══════════════════════════════════════ */
function ProfilePhoto({ scrollY }: { scrollY: any }) {
  const floatY = useTransform(scrollY, [0, 2000], [0, -40]);
  const rotate = useTransform(scrollY, [0, 3000], [0, 8]);
  const scale = useTransform(scrollY, [0, 400, 1000], [1, 1.04, 0.97]);
  const shadowSpread = useTransform(scrollY, [0, 500], [40, 80]);

  const orbitDots = [
    { color: "#e8c96d", size: 9, radius: 130, duration: 6, start: 0 },
    { color: "#7c3aed", size: 7, radius: 140, duration: 9, start: 120 },
    { color: "#f43f5e", size: 6, radius: 125, duration: 12, start: 240 },
    { color: "#06b6d4", size: 5, radius: 145, duration: 15, start: 60 },
  ];

  return (
    <motion.div
      style={{ y: floatY, rotate, scale }}
      className="relative flex items-center justify-center"
      transition={{ type: "spring", stiffness: 60, damping: 20 }}
    >
      {/* Orbit dots */}
      {orbitDots.map((d, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            width: d.size,
            height: d.size,
            borderRadius: "50%",
            background: d.color,
            boxShadow: `0 0 12px ${d.color}`,
            top: "50%",
            left: "50%",
            marginTop: -d.size / 2,
            marginLeft: -d.size / 2,
          }}
          animate={{
            rotate: [d.start, d.start + 360],
            x: [
              Math.cos((d.start * Math.PI) / 180) * d.radius,
              Math.cos(((d.start + 360) * Math.PI) / 180) * d.radius,
            ],
            y: [
              Math.sin((d.start * Math.PI) / 180) * d.radius,
              Math.sin(((d.start + 360) * Math.PI) / 180) * d.radius,
            ],
          }}
          transition={{
            duration: d.duration,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}

      {/* Halo rings */}
      <motion.div
        style={{
          position: "absolute",
          width: 260,
          height: 310,
          borderRadius: "60% 40% 50% 50% / 50% 50% 60% 40%",
          border: "2px solid transparent",
          background:
            "conic-gradient(from 0deg, #e8c96d, #7c3aed, #f43f5e, #e8c96d) border-box",
          WebkitMask:
            "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "destination-out",
          maskComposite: "exclude",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        style={{
          position: "absolute",
          width: 290,
          height: 340,
          borderRadius: "50% 60% 40% 60% / 60% 40% 60% 40%",
          border: "1px solid transparent",
          background:
            "conic-gradient(from 180deg, #7c3aed, transparent, #e8c96d, transparent) border-box",
          WebkitMask:
            "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "destination-out",
          maskComposite: "exclude",
          opacity: 0.5,
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
      />

      {/* Glow behind */}
      <motion.div
        style={{
          position: "absolute",
          width: 220,
          height: 270,
          background: "radial-gradient(ellipse, rgba(124,58,237,0.5), rgba(232,201,109,0.2), transparent)",
          filter: "blur(30px)",
          borderRadius: "60% 40% 50% 50% / 50% 50% 60% 40%",
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Photo */}
      <div
        style={{
          width: 220,
          height: 270,
          borderRadius: "60% 40% 50% 50% / 50% 50% 60% 40%",
          overflow: "hidden",
          border: "2px solid rgba(232,201,109,0.6)",
          position: "relative",
          boxShadow:
            "0 0 50px rgba(124,58,237,0.4), 0 0 100px rgba(232,201,109,0.15)",
        }}
      >
        <img
          src="/profile.png"
          alt="Media Buyer"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
            filter: "brightness(1.05) contrast(1.08) saturate(1.1)",
          }}
        />
        {/* Overlay shimmer */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, rgba(232,201,109,0.08) 0%, transparent 50%, rgba(124,58,237,0.06) 100%)",
          }}
        />
      </div>

      {/* Status badge */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          right: -10,
          background: "rgba(10,6,20,0.9)",
          border: "1px solid rgba(74,222,128,0.5)",
          borderRadius: 100,
          padding: "5px 12px",
          display: "flex",
          alignItems: "center",
          gap: 7,
          backdropFilter: "blur(10px)",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#4ade80",
            display: "inline-block",
            boxShadow: "0 0 8px #4ade80",
            animation: "blink 2s ease-in-out infinite",
          }}
        />
        <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 700 }}>
          متاح الآن
        </span>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════
   PLATFORM CARD
══════════════════════════════════════ */
function PlatCard({
  icon,
  title,
  accent,
  skills,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  accent: string;
  skills: string[];
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40, scale: 0.93 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.7, delay: delay || 0, ease: [0.4, 0, 0.2, 1] }}
    >
      <TiltCard
        className="platform-card glass h-full"
        style={{ padding: 28 } as React.CSSProperties}
      >
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 16,
            background: accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
            boxShadow: `0 0 24px ${accent}80`,
          }}
        >
          {icon}
        </div>
        <h3
          style={{
            fontSize: "1.1rem",
            fontWeight: 800,
            color: "#fff",
            marginBottom: 12,
          }}
        >
          {title}
        </h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {skills.map((s, i) => (
            <li
              key={i}
              style={{
                fontSize: "0.8rem",
                color: "rgba(255,255,255,0.5)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: accent,
                  flexShrink: 0,
                  display: "inline-block",
                }}
              />
              {s}
            </li>
          ))}
        </ul>
      </TiltCard>
    </motion.div>
  );
}

/* ══════════════════════════════════════
   MAIN APP
══════════════════════════════════════ */
export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const springScrollY = useSpring(scrollY, { stiffness: 80, damping: 20 });

  // Nav transparency
  const navBg = useTransform(scrollY, [0, 100], ["rgba(8,6,18,0)", "rgba(8,6,18,0.92)"]);
  const navBorder = useTransform(scrollY, [0, 100], ["rgba(232,201,109,0)", "rgba(232,201,109,0.12)"]);

  // Hero text parallax
  const heroY = useTransform(springScrollY, [0, 600], [0, -80]);
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);

  // Horizontal scroll effect for stats
  const statsX = useTransform(springScrollY, [300, 800], [60, 0]);
  const statsOpacity = useTransform(scrollY, [300, 600], [0, 1]);

  return (
    <div
      ref={containerRef}
      style={{ minHeight: "100vh", position: "relative", background: "#080612" }}
    >
      {/* Background layers */}
      <div className="aurora-bg">
        <div className="aurora-orb aurora-orb-1" />
        <div className="aurora-orb aurora-orb-2" />
        <div className="aurora-orb aurora-orb-3" />
        <div className="aurora-orb aurora-orb-4" />
      </div>
      <div className="grid-overlay" />
      <div className="noise-overlay" />
      <Particles />

      {/* ── NAV ─────────────────────────────── */}
      <motion.nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: "16px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backdropFilter: "blur(16px)",
          background: navBg,
          borderBottom: "1px solid",
          borderColor: navBorder,
          transition: "all 0.3s ease",
        }}
        initial={{ y: -70 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #7c3aed, #e8c96d)",
              boxShadow: "0 0 12px #7c3aed",
            }}
          />
          <span
            className="gold-text"
            style={{ fontWeight: 900, fontSize: "1.05rem", letterSpacing: "-0.02em" }}
          >
            Media Buyer
          </span>
        </div>
        <div style={{ display: "flex", gap: 32 }}>
          {["Skills", "Experience", "Platforms", "Contact"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              style={{
                color: "rgba(255,255,255,0.45)",
                textDecoration: "none",
                fontSize: "0.82rem",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#e8c96d")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
            >
              {item}
            </a>
          ))}
        </div>
      </motion.nav>

      {/* ── HERO ────────────────────────────── */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          padding: "100px 5% 60px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            width: "100%",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 80,
            alignItems: "center",
          }}
        >
          {/* Text */}
          <motion.div style={{ y: heroY, opacity: heroOpacity }}>
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            >
              {/* Badge */}
              <motion.div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 18px",
                  borderRadius: 100,
                  border: "1px solid rgba(232,201,109,0.3)",
                  background: "rgba(232,201,109,0.06)",
                  marginBottom: 28,
                }}
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#4ade80",
                    display: "inline-block",
                    boxShadow: "0 0 10px #4ade80",
                    animation: "blink 2s ease-in-out infinite",
                  }}
                />
                <span
                  style={{ fontSize: "0.75rem", color: "#e8c96d", fontWeight: 700, letterSpacing: "0.1em" }}
                >
                  AVAILABLE FOR WORK
                </span>
              </motion.div>

              <h1
                style={{
                  fontSize: "clamp(3.5rem, 7vw, 6rem)",
                  fontWeight: 900,
                  color: "#fff",
                  lineHeight: 1.05,
                  letterSpacing: "-0.03em",
                  marginBottom: 20,
                }}
              >
                مشتري
                <br />
                <span className="gold-text" style={{ display: "block" }}>
                  إعلاني
                </span>
                <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "60%" }}>
                  محترف
                </span>
              </h1>

              <div
                style={{
                  fontSize: "1.2rem",
                  marginBottom: 28,
                  minHeight: 32,
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                <Typewriter
                  lines={[
                    "Media Buyer | eCommerce",
                    "Meta Ads Specialist",
                    "TikTok Campaign Manager",
                    "ROAS & CRO Optimizer",
                    "Data-Driven Advertiser",
                  ]}
                />
              </div>

              <p
                style={{
                  color: "rgba(255,255,255,0.4)",
                  lineHeight: 1.8,
                  fontSize: "0.95rem",
                  maxWidth: 460,
                  marginBottom: 40,
                }}
              >
                بحوّل الإعلانات لمبيعات حقيقية. بشتغل بالأرقام والبيانات على Meta
                و TikTok و Snapchat علشان أوصل لأفضل نتيجة ممكنة لبيزنسك.
              </p>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <motion.a
                  href="#contact"
                  className="glow-btn magnetic-btn"
                  style={{
                    padding: "14px 32px",
                    borderRadius: 12,
                    fontSize: "0.9rem",
                    textDecoration: "none",
                    display: "inline-block",
                  }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  تواصل معي الآن ✦
                </motion.a>
                <motion.a
                  href="#skills"
                  className="outline-btn"
                  style={{
                    padding: "14px 32px",
                    borderRadius: 12,
                    fontSize: "0.9rem",
                    textDecoration: "none",
                    display: "inline-block",
                  }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  شوف مهاراتي
                </motion.a>
              </div>
            </motion.div>
          </motion.div>

          {/* Profile — sticky behavior via position sticky on wrapper */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <ProfilePhoto scrollY={springScrollY} />
          </div>
        </div>

        {/* Scroll cue */}
        <motion.div
          style={{
            position: "absolute",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            color: "rgba(255,255,255,0.2)",
            fontSize: "0.7rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span>Scroll</span>
          <div
            style={{
              width: 1,
              height: 40,
              background: "linear-gradient(180deg, rgba(232,201,109,0.5), transparent)",
            }}
          />
        </motion.div>
      </section>

      {/* ── MARQUEE ─────────────────────────── */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <Marquee />
      </div>

      {/* ── STATS ───────────────────────────── */}
      <section style={{ padding: "80px 5%", position: "relative", zIndex: 1 }}>
        <motion.div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            x: statsX,
            opacity: statsOpacity,
          }}
        >
          <div
            className="glass-dark"
            style={{
              padding: "48px 40px",
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 32,
            }}
          >
            <Counter to={12} suffix="+" label="شهر خبرة" />
            <Counter to={50} suffix="+" label="حملة ناجحة" />
            <Counter to={3} label="منصة إعلانية" />
            <Counter to={95} suffix="%" label="رضا العملاء" />
          </div>
        </motion.div>
      </section>

      {/* ── MAIN CONTENT (SIDEBAR + CONTENT) ── */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 5% 100px",
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: 64,
          position: "relative",
          zIndex: 1,
          alignItems: "start",
        }}
      >
        {/* ── STICKY SIDEBAR ── */}
        <div className="profile-sticky">
          {/* Mini profile photo */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
              }}
            >
              {/* Floating profile image */}
              <motion.div
                style={{ position: "relative" }}
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                <div
                  style={{
                    width: 140,
                    height: 170,
                    borderRadius: "55% 45% 50% 50% / 50% 50% 55% 45%",
                    overflow: "hidden",
                    border: "2px solid rgba(232,201,109,0.5)",
                    boxShadow: "0 0 40px rgba(124,58,237,0.5), 0 0 80px rgba(232,201,109,0.1)",
                  }}
                >
                  <img
                    src="/profile.png"
                    alt="Profile"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center top",
                    }}
                  />
                </div>
                {/* Pulse ring */}
                <motion.div
                  style={{
                    position: "absolute",
                    inset: -10,
                    borderRadius: "60% 40% 55% 45% / 45% 55% 45% 55%",
                    border: "1px solid rgba(232,201,109,0.3)",
                  }}
                  animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
              </motion.div>

              {/* Name & title */}
              <div style={{ textAlign: "center" }}>
                <div
                  className="shimmer-text"
                  style={{ fontWeight: 800, fontSize: "1rem", marginBottom: 4 }}
                >
                  Media Buyer
                </div>
                <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em" }}>
                  Performance Marketing
                </div>
              </div>

              {/* Divider */}
              <div
                style={{
                  width: "100%",
                  height: 1,
                  background: "linear-gradient(90deg, transparent, rgba(232,201,109,0.2), transparent)",
                }}
              />

              {/* Quick info */}
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { icon: "📍", label: "المكان", val: "مصر" },
                  { icon: "📅", label: "خبرة منذ", val: "أبريل 2025" },
                  { icon: "💼", label: "النوع", val: "فريلانسر" },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <span style={{ fontSize: "0.9rem" }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
                        {item.val}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div
                style={{
                  width: "100%",
                  height: 1,
                  background: "linear-gradient(90deg, transparent, rgba(232,201,109,0.2), transparent)",
                }}
              />

              {/* Platform tags */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                {[
                  { label: "Meta", color: "#1877f2" },
                  { label: "TikTok", color: "#fe2c55" },
                  { label: "Snap", color: "#fffc00", text: "#000" },
                ].map((p) => (
                  <span
                    key={p.label}
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      padding: "3px 10px",
                      borderRadius: 100,
                      background: `${p.color}22`,
                      border: `1px solid ${p.color}55`,
                      color: p.text || p.color,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {p.label}
                  </span>
                ))}
              </div>

              {/* CTA button */}
              <motion.a
                href="#contact"
                className="glow-btn"
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "center",
                  padding: "12px 0",
                  borderRadius: 12,
                  fontSize: "0.82rem",
                  textDecoration: "none",
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                تواصل معي
              </motion.a>
            </div>
          </motion.div>
        </div>

        {/* ── MAIN SECTIONS ── */}
        <div id="skills" style={{ display: "flex", flexDirection: "column", gap: 80 }}>

          {/* SKILLS */}
          <section>
            <SectionHeader num="01" title="المهارات" sub="كل ما أتقنته في عالم الإعلانات الرقمية" />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <Reveal className="glass" style={{ padding: 28 } as React.CSSProperties}>
                <h3 className="gold-text" style={{ fontWeight: 800, marginBottom: 22, fontSize: "0.95rem", letterSpacing: "0.04em" }}>
                  المنصات الإعلانية
                </h3>
                <SkillBar name="Meta Ads (Facebook & Instagram)" level={92} delay={0.1} />
                <SkillBar name="TikTok Ads" level={85} delay={0.2} />
                <SkillBar name="Snapchat Ads" level={80} delay={0.3} />
                <SkillBar name="تحسين ROAS" level={91} delay={0.4} />
              </Reveal>

              <Reveal delay={0.15} className="glass" style={{ padding: 28 } as React.CSSProperties}>
                <h3 className="gold-text" style={{ fontWeight: 800, marginBottom: 22, fontSize: "0.95rem", letterSpacing: "0.04em" }}>
                  مهارات التحسين
                </h3>
                <SkillBar name="A/B Testing" level={88} delay={0.1} />
                <SkillBar name="Tracking & Pixel" level={87} delay={0.2} />
                <SkillBar name="Scaling الحملات" level={86} delay={0.3} />
                <SkillBar name="تحليل البيانات والتقارير" level={90} delay={0.4} />
              </Reveal>
            </div>

            {/* Skill Tags */}
            <Reveal delay={0.2} style={{ marginTop: 24 } as React.CSSProperties}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[
                  "Meta Ads Manager", "TikTok Business", "Snap Ads",
                  "A/B Testing", "ROAS", "Retargeting", "Lookalike",
                  "CRO", "Data Analysis", "Pixel Setup", "Campaign Scaling",
                  "Creative Testing", "Budget Management", "eCommerce",
                ].map((tag, i) => (
                  <motion.span
                    key={tag}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 100,
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      background: "rgba(124,58,237,0.08)",
                      border: "1px solid rgba(124,58,237,0.2)",
                      color: "rgba(167,139,250,0.8)",
                      cursor: "default",
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04 }}
                    whileHover={{
                      background: "rgba(124,58,237,0.2)",
                      borderColor: "rgba(124,58,237,0.5)",
                      scale: 1.06,
                    }}
                  >
                    {tag}
                  </motion.span>
                ))}
              </div>
            </Reveal>
          </section>

          {/* EXPERIENCE */}
          <section id="experience">
            <SectionHeader num="02" title="الخبرة" sub="مسيرتي المهنية في التسويق الرقمي" />

            <Reveal>
              <div
                style={{
                  position: "relative",
                  paddingLeft: 32,
                }}
              >
                <div className="timeline-line" />
                <div
                  style={{
                    position: "absolute",
                    left: -7,
                    top: 28,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #7c3aed, #e8c96d)",
                    boxShadow: "0 0 20px rgba(124,58,237,0.8)",
                    zIndex: 2,
                  }}
                />

                <div className="glass" style={{ padding: 32 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: 12,
                      marginBottom: 24,
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontSize: "1.4rem",
                          fontWeight: 900,
                          color: "#fff",
                          marginBottom: 4,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        Media Buyer
                      </h3>
                      <div style={{ color: "#e8c96d", fontWeight: 700, fontSize: "0.9rem" }}>
                        عمل حر — مصر
                      </div>
                    </div>
                    <div
                      className="glass-purple"
                      style={{ padding: "8px 18px", borderRadius: 100, fontSize: "0.78rem", color: "#a78bfa", fontWeight: 700 }}
                    >
                      أبريل 2025 — الآن
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      "إدارة حملات Meta (Facebook & Instagram) و TikTok و Snapchat",
                      "تجربة الـ Creatives والـ Audiences والـ Offers للوصول لأفضل نتائج",
                      "متابعة يومية للحملات واتخاذ قرارات مبنية على البيانات",
                      "تحسين معدل التحويل (CRO) وتقليل تكلفة النتيجة",
                      "تكبير الحملات الناجحة (Scaling) مع الحفاظ على الأداء",
                      "إعداد وتتبع الحملات باستخدام أدوات التتبع لدقة البيانات",
                      "تقديم تقارير واضحة مع توصيات عملية للتطوير",
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: "10px 14px",
                          borderRadius: 10,
                          background: "rgba(124,58,237,0.06)",
                          border: "1px solid rgba(124,58,237,0.12)",
                          fontSize: "0.8rem",
                          color: "rgba(255,255,255,0.6)",
                          lineHeight: 1.5,
                        }}
                        initial={{ opacity: 0, x: -16 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.08 }}
                        whileHover={{
                          background: "rgba(124,58,237,0.12)",
                          color: "rgba(255,255,255,0.85)",
                        }}
                      >
                        <span style={{ color: "#7c3aed", marginTop: 2, flexShrink: 0 }}>◆</span>
                        {item}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </section>

          {/* PLATFORMS */}
          <section id="platforms">
            <SectionHeader num="03" title="المنصات" sub="خبرتي على أقوى منصات الإعلان" />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
              <PlatCard
                title="Meta Ads"
                accent="linear-gradient(135deg, #1877f2, #0c52b3)"
                delay={0.0}
                icon={
                  <svg viewBox="0 0 24 24" fill="white" width="26" height="26">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                }
                skills={[
                  "Facebook & Instagram Ads",
                  "Custom Audiences",
                  "Lookalike Audiences",
                  "Retargeting",
                  "Pixel Setup",
                  "Campaign Scaling",
                ]}
              />
              <PlatCard
                title="TikTok Ads"
                accent="linear-gradient(135deg, #010101, #2d2d2d)"
                delay={0.1}
                icon={
                  <svg viewBox="0 0 24 24" fill="white" width="26" height="26">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" />
                  </svg>
                }
                skills={[
                  "In-Feed Ads",
                  "Spark Ads",
                  "TopView Campaigns",
                  "Creative Testing",
                  "TikTok Pixel",
                  "Gen Z Targeting",
                ]}
              />
              <PlatCard
                title="Snapchat Ads"
                accent="linear-gradient(135deg, #fffc00, #e6e300)"
                delay={0.2}
                icon={
                  <svg viewBox="0 0 24 24" fill="#000" width="26" height="26">
                    <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3 0 .677-.084 1.03-.189.097-.028.218-.044.316-.037.132.012.22.075.22.15.001.082-.1.176-.22.228-.18.077-.409.12-.62.12-.12 0-.24-.012-.36-.035.055.183.106.37.145.569.018.09.02.18.016.27-.004.15-.063.3-.16.413-.1.124-.253.211-.413.247-.088.02-.16.032-.228.032-.1 0-.177-.024-.26-.065-.225-.11-.45-.227-.82-.274-.18-.024-.359-.035-.54-.035-.358 0-.713.065-1.058.19-.45.16-.9.333-1.412.333-.512 0-.96-.173-1.412-.333-.345-.125-.7-.19-1.058-.19-.181 0-.36.011-.54.035-.37.047-.595.164-.82.274-.083.041-.16.065-.26.065-.068 0-.14-.012-.228-.032-.16-.036-.313-.123-.413-.247-.097-.113-.156-.263-.16-.413-.004-.09-.002-.18.016-.27.039-.199.09-.386.145-.569-.12.023-.24.035-.36.035-.211 0-.44-.043-.62-.12-.12-.052-.221-.146-.22-.228 0-.075.088-.138.22-.15.098-.007.219.009.316.037.353.105.73.189 1.03.189.198 0 .326-.045.4-.09-.008-.165-.017-.33-.03-.51l-.002-.06c-.104-1.628-.23-3.654.299-4.847C7.853 1.069 11.215.793 12.206.793z" />
                  </svg>
                }
                skills={[
                  "Story Ads",
                  "Collection Ads",
                  "Dynamic Ads",
                  "AR Lens",
                  "Snap Pixel",
                  "Gen Z Targeting",
                ]}
              />
            </div>
          </section>

          {/* SERVICES */}
          <section>
            <SectionHeader num="04" title="الخدمات" sub="ما أقدر أعمله لبيزنسك" />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { emoji: "🎯", title: "إدارة الحملات", desc: "إدارة كاملة لحملاتك على Meta و TikTok و Snapchat بأعلى كفاءة ممكنة", accent: "#7c3aed" },
                { emoji: "📊", title: "تحليل البيانات", desc: "تقارير يومية وأسبوعية وشهرية مع توصيات عملية لتحسين الأداء باستمرار", accent: "#e8c96d" },
                { emoji: "🚀", title: "Scaling للحملات", desc: "تكبير الحملات الناجحة بشكل تدريجي مع الحفاظ على الـ ROAS والأهداف", accent: "#f43f5e" },
                { emoji: "🔬", title: "A/B Testing", desc: "اختبار منهجي للـ Creatives والـ Audiences والـ Offers للأفضل تركيبة", accent: "#06b6d4" },
                { emoji: "📡", title: "Tracking Setup", desc: "إعداد دقيق للـ Pixel والتتبع لضمان بيانات صحيحة وقرارات مبنية عليها", accent: "#7c3aed" },
                { emoji: "💡", title: "استشارات تسويقية", desc: "استراتيجية إعلانية متكاملة تناسب نوع منتجك وجمهورك المستهدف بدقة", accent: "#e8c96d" },
              ].map((s, i) => (
                <Reveal key={s.title} delay={i * 0.08}>
                  <TiltCard className="glass" style={{ padding: 24, height: "100%", cursor: "default" } as React.CSSProperties}>
                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div
                        style={{
                          fontSize: "1.5rem",
                          width: 44,
                          height: 44,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 12,
                          background: `${s.accent}18`,
                          border: `1px solid ${s.accent}30`,
                          flexShrink: 0,
                        }}
                      >
                        {s.emoji}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: "#fff", fontSize: "0.9rem", marginBottom: 6 }}>
                          {s.title}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                          {s.desc}
                        </div>
                      </div>
                    </div>
                  </TiltCard>
                </Reveal>
              ))}
            </div>
          </section>

          {/* WHY ME */}
          <section>
            <SectionHeader num="05" title="ليه أنا؟" sub="ما يميزني عن غيري" />

            <Reveal>
              <div
                className="glass-dark gradient-border"
                style={{ padding: 40, borderRadius: 20, position: "relative", overflow: "hidden" }}
              >
                {/* BG decoration */}
                <div
                  style={{
                    position: "absolute",
                    right: -60,
                    top: -60,
                    width: 300,
                    height: 300,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(124,58,237,0.15), transparent)",
                    pointerEvents: "none",
                  }}
                />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, position: "relative", zIndex: 1 }}>
                  <div>
                    <p
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: 300,
                        color: "rgba(255,255,255,0.6)",
                        lineHeight: 1.8,
                        marginBottom: 28,
                      }}
                    >
                      مش بشتغل بالتخمين — بشتغل بالبيانات. كل قرار بقوم بيه مبني على
                      أرقام حقيقية من الحملات، وبتابع كل تفصيلة بشكل يومي.
                    </p>

                    {[
                      { label: "قرارات مبنية على البيانات", color: "#7c3aed" },
                      { label: "متابعة يومية وتحسين مستمر", color: "#e8c96d" },
                      { label: "شفافية كاملة في النتائج", color: "#f43f5e" },
                      { label: "تركيز على الـ ROI الحقيقي", color: "#06b6d4" },
                    ].map((p, i) => (
                      <motion.div
                        key={p.label}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          marginBottom: 12,
                        }}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.12 }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: `${p.color}20`,
                            border: `1.5px solid ${p.color}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.7rem",
                            fontWeight: 900,
                            color: p.color,
                            flexShrink: 0,
                          }}
                        >
                          ✓
                        </div>
                        <span style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
                          {p.label}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Animated data visual */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ position: "relative", width: 180, height: 180 }}>
                      {/* Central icon */}
                      <div
                        style={{
                          position: "absolute",
                          inset: "50%",
                          transform: "translate(-50%, -50%)",
                          width: 70,
                          height: 70,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, #7c3aed, #e8c96d)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.8rem",
                          boxShadow: "0 0 40px rgba(124,58,237,0.6)",
                        }}
                      >
                        📈
                      </div>
                      {/* Orbiting icons */}
                      {["🎯", "💰", "📊", "🚀"].map((icon, i) => (
                        <motion.div
                          key={i}
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            width: 38,
                            height: 38,
                            marginTop: -19,
                            marginLeft: -19,
                            borderRadius: "50%",
                            background: "rgba(255,255,255,0.06)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1rem",
                          }}
                          animate={{
                            x: Math.cos((i * Math.PI) / 2) * 80,
                            y: Math.sin((i * Math.PI) / 2) * 80,
                            rotate: [0, 360],
                          }}
                          transition={{
                            x: { duration: 8, repeat: Infinity, ease: "linear" },
                            y: { duration: 8, repeat: Infinity, ease: "linear" },
                            rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                          }}
                        >
                          {icon}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </section>

          {/* CONTACT */}
          <section id="contact">
            <SectionHeader num="06" title="تواصل معي" sub="جاهز أبدأ معك في أي وقت" />

            <Reveal>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
                {[
                  { icon: "💬", label: "واتساب", val: "تواصل الآن", color: "#25D366", href: "https://wa.me/201234567890" },
                  { icon: "📧", label: "إيميل", val: "media@buyer.pro", color: "#e8c96d", href: "mailto:media@buyer.pro" },
                  { icon: "📱", label: "تيليجرام", val: "@mediabuyerpro", color: "#2AABEE", href: "https://t.me/mediabuyerpro" },
                ].map((c, i) => (
                  <motion.a
                    key={i}
                    href={c.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass"
                    style={{
                      padding: 24,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 10,
                      textDecoration: "none",
                      borderRadius: 16,
                      cursor: "pointer",
                    }}
                    whileHover={{ scale: 1.04, boxShadow: `0 0 30px ${c.color}30` }}
                    whileTap={{ scale: 0.97 }}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <span style={{ fontSize: "1.8rem" }}>{c.icon}</span>
                    <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em" }}>
                      {c.label}
                    </span>
                    <span style={{ fontSize: "0.82rem", color: c.color, fontWeight: 700 }}>{c.val}</span>
                  </motion.a>
                ))}
              </div>

              {/* Final CTA */}
              <motion.div
                className="glass-purple"
                style={{
                  padding: 40,
                  textAlign: "center",
                  borderRadius: 20,
                  position: "relative",
                  overflow: "hidden",
                }}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                whileHover={{ boxShadow: "0 0 60px rgba(124,58,237,0.3)" }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "radial-gradient(ellipse at 50% 0%, rgba(232,201,109,0.08), transparent 60%)",
                    pointerEvents: "none",
                  }}
                />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <p style={{ fontSize: "1.5rem", fontWeight: 900, color: "#fff", marginBottom: 8 }}>
                    هل أنت جاهز تكبّر بيزنسك؟
                  </p>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", marginBottom: 28 }}>
                    دعني أحوّل إعلاناتك إلى مبيعات حقيقية
                  </p>
                  <motion.a
                    href="https://wa.me/201234567890"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glow-btn"
                    style={{
                      display: "inline-block",
                      padding: "16px 48px",
                      borderRadius: 14,
                      fontSize: "1rem",
                      textDecoration: "none",
                    }}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    ابدأ الآن 🚀
                  </motion.a>
                </div>
              </motion.div>
            </Reveal>
          </section>

          {/* FOOTER */}
          <div
            style={{
              paddingTop: 40,
              borderTop: "1px solid rgba(232,201,109,0.06)",
              textAlign: "center",
              color: "rgba(255,255,255,0.2)",
              fontSize: "0.75rem",
            }}
          >
            © 2025 Media Buyer Pro — مصنوع بشغف لأفضل النتائج
          </div>
        </div>
      </div>
    </div>
  );
}
