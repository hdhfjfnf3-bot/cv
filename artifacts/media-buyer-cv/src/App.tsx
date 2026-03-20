import { useEffect, useRef, useState } from "react";
import { motion, useInView, useAnimation, AnimatePresence } from "framer-motion";

const PROFILE_IMG = "/profile.png";

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; color: string;
    }> = [];

    const colors = ["rgba(246,211,101,", "rgba(253,160,133,", "rgba(255,255,255,"];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.6 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + p.opacity + ")";
        ctx.fill();
      });

      particles.forEach((p, i) => {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = p.x - particles[j].x;
          const dy = p.y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(246,211,101,${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      });

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} id="particles-canvas" />;
}

function TypewriterText({ texts }: { texts: string[] }) {
  const [idx, setIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = texts[idx];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && displayed.length < current.length) {
      timeout = setTimeout(() => setDisplayed(current.slice(0, displayed.length + 1)), 80);
    } else if (!deleting && displayed.length === current.length) {
      timeout = setTimeout(() => setDeleting(true), 2000);
    } else if (deleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 40);
    } else if (deleting && displayed.length === 0) {
      setDeleting(false);
      setIdx((i) => (i + 1) % texts.length);
    }

    return () => clearTimeout(timeout);
  }, [displayed, deleting, idx, texts]);

  return (
    <span>
      <span className="gold-text font-bold">{displayed}</span>
      <span className="cursor-blink text-yellow-400">|</span>
    </span>
  );
}

function StatCounter({ value, label, suffix = "" }: { value: number; label: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, value]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl font-black gold-text glow-text">
        {count}{suffix}
      </div>
      <div className="text-sm text-yellow-200/60 mt-1 font-medium">{label}</div>
    </div>
  );
}

function SkillBar({ name, level, delay = 0 }: { name: string; level: number; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-semibold text-yellow-100">{name}</span>
        <span className="text-xs text-yellow-400 font-bold">{level}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: "linear-gradient(90deg, #f6d365, #fda085)",
            boxShadow: "0 0 10px rgba(246,211,101,0.5)",
          }}
          initial={{ width: 0 }}
          animate={inView ? { width: `${level}%` } : { width: 0 }}
          transition={{ duration: 1.5, delay, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 15;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -15;
    setTilt({ x, y });
  };

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
        transition: "transform 0.1s ease",
      }}
    >
      {children}
    </div>
  );
}

function PlatformCard({ icon, name, color, skills, glowClass }: {
  icon: React.ReactNode;
  name: string;
  color: string;
  skills: string[];
  glowClass: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <TiltCard className="glass-card p-6 cursor-default h-full">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${glowClass}`} style={{ background: color }}>
          {icon}
        </div>
        <h3 className="text-lg font-bold text-white mb-3">{name}</h3>
        <ul className="space-y-1">
          {skills.map((s, i) => (
            <li key={i} className="text-sm text-yellow-200/60 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-yellow-400 inline-block" />
              {s}
            </li>
          ))}
        </ul>
      </TiltCard>
    </motion.div>
  );
}

function RevealSection({ children, className = "", delay = 0 }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const parallaxPhoto = scrollY * 0.15;

  return (
    <div className="min-h-screen animated-bg grid-lines relative">
      <ParticleCanvas />

      {/* Navigation */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 glass-card rounded-none border-l-0 border-r-0 border-t-0"
        style={{ borderRadius: 0 }}
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-black text-lg gold-text">Media Buyer Pro</span>
          <div className="hidden md:flex gap-6 text-sm text-yellow-200/70">
            {["About", "Skills", "Experience", "Platforms", "Contact"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="hover:text-yellow-400 transition-colors cursor-pointer"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </motion.nav>

      {/* HERO SECTION */}
      <section id="about" className="relative min-h-screen flex items-center justify-center px-6 pt-20">
        <div className="max-w-6xl mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Text Side */}
            <div className="relative z-10 order-2 lg:order-1">
              <motion.div
                initial={{ opacity: 0, x: -60 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
              >
                <motion.div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                  style={{
                    background: "rgba(246,211,101,0.1)",
                    border: "1px solid rgba(246,211,101,0.3)",
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm text-yellow-300 font-medium">Available for Work</span>
                </motion.div>

                <h1 className="text-5xl lg:text-7xl font-black text-white leading-tight mb-4">
                  مشتري
                  <br />
                  <span className="gold-text glow-text">إعلاني</span>
                  <br />
                  محترف
                </h1>

                <div className="text-xl lg:text-2xl text-yellow-200/70 mb-6 h-8">
                  <TypewriterText texts={[
                    "Media Buyer | eCommerce",
                    "Meta Ads Expert",
                    "TikTok Campaign Manager",
                    "ROAS Optimizer",
                    "Snapchat Advertiser",
                  ]} />
                </div>

                <p className="text-yellow-100/60 text-base leading-relaxed mb-8 max-w-lg">
                  بحوّل الإعلانات لمبيعات حقيقية مش مجرد زيارات. بشتغل بالبيانات والأرقام 
                  لأوصل لأفضل نتيجة ممكنة على Meta و TikTok و Snapchat.
                </p>

                <div className="flex flex-wrap gap-4">
                  <motion.a
                    href="#contact"
                    className="px-8 py-3 rounded-xl font-bold text-sm cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg, #f6d365, #fda085)",
                      color: "#0a0e1a",
                      boxShadow: "0 0 30px rgba(246,211,101,0.4)",
                    }}
                    whileHover={{ scale: 1.05, boxShadow: "0 0 50px rgba(246,211,101,0.6)" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    تواصل معي الآن
                  </motion.a>
                  <motion.a
                    href="#skills"
                    className="px-8 py-3 rounded-xl font-bold text-sm cursor-pointer"
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(246,211,101,0.5)",
                      color: "#f6d365",
                    }}
                    whileHover={{ scale: 1.05, background: "rgba(246,211,101,0.1)" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    شوف مهاراتي
                  </motion.a>
                </div>
              </motion.div>
            </div>

            {/* Photo Side */}
            <div className="relative z-10 order-1 lg:order-2 flex justify-center">
              <motion.div
                className="relative"
                initial={{ opacity: 0, scale: 0.7, rotateY: 30 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                style={{ transform: `translateY(${-parallaxPhoto}px)` }}
              >
                {/* Outer rotating ring */}
                <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: -1 }}>
                  <div
                    className="w-80 h-80 rounded-full"
                    style={{
                      background: "conic-gradient(from 0deg, #f6d365, #fda085, transparent, #f6d365)",
                      animation: "rotateBorder 8s linear infinite",
                      padding: "2px",
                    }}
                  />
                </div>

                {/* Middle glow ring */}
                <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: -1 }}>
                  <div
                    className="w-72 h-72 rounded-full"
                    style={{
                      background: "radial-gradient(circle, rgba(246,211,101,0.2) 0%, transparent 70%)",
                      animation: "rotateBorder 12s linear infinite reverse",
                    }}
                  />
                </div>

                {/* Pulse rings */}
                <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: -1 }}>
                  <div
                    className="w-64 h-64 rounded-full border border-yellow-400/30"
                    style={{ animation: "pulseRing 3s ease-out infinite" }}
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: -1 }}>
                  <div
                    className="w-64 h-64 rounded-full border border-yellow-400/20"
                    style={{ animation: "pulseRing 3s ease-out infinite 1s" }}
                  />
                </div>

                {/* Photo */}
                <motion.div
                  className="float-anim relative"
                  style={{
                    width: 280,
                    height: 340,
                    borderRadius: "40% 60% 60% 40% / 60% 40% 60% 40%",
                    overflow: "hidden",
                    border: "3px solid rgba(246,211,101,0.6)",
                    boxShadow: "0 0 60px rgba(246,211,101,0.4), 0 0 120px rgba(246,211,101,0.15), inset 0 0 40px rgba(246,211,101,0.05)",
                  }}
                >
                  <img
                    src={PROFILE_IMG}
                    alt="Media Buyer"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center top",
                      filter: "brightness(1.05) contrast(1.05) saturate(1.1)",
                    }}
                  />
                  {/* Shimmer overlay */}
                  <div className="absolute inset-0 shimmer opacity-30" />
                </motion.div>

                {/* Floating badges */}
                <motion.div
                  className="absolute -left-12 top-8 glass-card px-3 py-2 rounded-xl text-xs"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="text-yellow-400 font-bold">Meta Ads</div>
                  <div className="text-white/60">Expert</div>
                </motion.div>

                <motion.div
                  className="absolute -right-10 top-1/3 glass-card px-3 py-2 rounded-xl text-xs"
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                >
                  <div className="text-yellow-400 font-bold">ROAS</div>
                  <div className="text-white/60">Optimizer</div>
                </motion.div>

                <motion.div
                  className="absolute -left-8 bottom-8 glass-card px-3 py-2 rounded-xl text-xs"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                >
                  <div className="text-yellow-400 font-bold">TikTok</div>
                  <div className="text-white/60">Campaigns</div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-xs text-yellow-400/50">Scroll</span>
          <div className="w-5 h-8 rounded-full border border-yellow-400/30 flex justify-center pt-1">
            <div className="w-1 h-2 bg-yellow-400 rounded-full" style={{ animation: "float 2s ease-in-out infinite" }} />
          </div>
        </motion.div>
      </section>

      {/* STATS SECTION */}
      <section className="relative z-10 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="glass-card p-8 grid grid-cols-2 lg:grid-cols-4 gap-8">
            <StatCounter value={12} label="شهر خبرة" suffix="+" />
            <StatCounter value={50} label="حملة ناجحة" suffix="+" />
            <StatCounter value={3} label="منصة إعلانية" suffix="" />
            <StatCounter value={95} label="معدل رضا العملاء" suffix="%" />
          </div>
        </div>
      </section>

      {/* PLATFORMS SECTION */}
      <section id="platforms" className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <RevealSection className="text-center mb-14">
            <h2 className="text-4xl font-black text-white mb-4">
              المنصات الإعلانية
            </h2>
            <div className="w-24 h-1 mx-auto rounded-full" style={{ background: "linear-gradient(90deg, #f6d365, #fda085)" }} />
            <p className="text-yellow-200/50 mt-4">خبرتي على أقوى منصات الإعلان الرقمي</p>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-6">
            <PlatformCard
              name="Meta Ads"
              color="linear-gradient(135deg, #1877f2, #0c52b3)"
              glowClass="meta-glow"
              icon={
                <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              }
              skills={[
                "Facebook & Instagram Ads",
                "Custom & Lookalike Audiences",
                "Retargeting Campaigns",
                "A/B Testing",
                "Pixel Setup & Tracking",
                "Campaign Scaling",
              ]}
            />
            <PlatformCard
              name="TikTok Ads"
              color="linear-gradient(135deg, #010101, #010101)"
              glowClass="tiktok-glow"
              icon={
                <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.17 8.17 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" />
                </svg>
              }
              skills={[
                "In-Feed Ads",
                "TopView Campaigns",
                "Spark Ads",
                "Creative Testing",
                "TikTok Pixel Setup",
                "Youth Audience Targeting",
              ]}
            />
            <PlatformCard
              name="Snapchat Ads"
              color="linear-gradient(135deg, #FFFC00, #e6e300)"
              glowClass="snap-glow"
              icon={
                <svg viewBox="0 0 24 24" fill="#0a0e1a" width="28" height="28">
                  <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3 0 .677-.084 1.03-.189.097-.028.218-.044.316-.037.132.012.22.075.22.15.001.082-.1.176-.22.228-.18.077-.409.12-.62.12-.12 0-.24-.012-.36-.035.055.183.106.37.145.569.018.09.02.18.016.27-.004.15-.063.3-.16.413-.1.124-.253.211-.413.247-.088.02-.16.032-.228.032-.1 0-.177-.024-.26-.065-.225-.11-.45-.227-.82-.274-.18-.024-.359-.035-.54-.035-.358 0-.713.065-1.058.19-.45.16-.9.333-1.412.333-.512 0-.96-.173-1.412-.333-.345-.125-.7-.19-1.058-.19-.181 0-.36.011-.54.035-.37.047-.595.164-.82.274-.083.041-.16.065-.26.065-.068 0-.14-.012-.228-.032-.16-.036-.313-.123-.413-.247-.097-.113-.156-.263-.16-.413-.004-.09-.002-.18.016-.27.039-.199.09-.386.145-.569-.12.023-.24.035-.36.035-.211 0-.44-.043-.62-.12-.12-.052-.221-.146-.22-.228 0-.075.088-.138.22-.15.098-.007.219.009.316.037.353.105.73.189 1.03.189.198 0 .326-.045.4-.09-.008-.165-.017-.33-.03-.51l-.002-.06c-.104-1.628-.23-3.654.299-4.847C7.853 1.069 11.215.793 12.206.793z" />
                </svg>
              }
              skills={[
                "Story Ads",
                "Collection Ads",
                "Dynamic Ads",
                "AR Lens Campaigns",
                "Snap Pixel Setup",
                "Gen Z Targeting",
              ]}
            />
          </div>
        </div>
      </section>

      {/* SKILLS SECTION */}
      <section id="skills" className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <RevealSection className="text-center mb-14">
            <h2 className="text-4xl font-black text-white mb-4">المهارات</h2>
            <div className="w-24 h-1 mx-auto rounded-full" style={{ background: "linear-gradient(90deg, #f6d365, #fda085)" }} />
          </RevealSection>

          <div className="grid lg:grid-cols-2 gap-12">
            <RevealSection delay={0.1}>
              <div className="glass-card p-8">
                <h3 className="text-xl font-bold gold-text mb-6">المهارات التقنية</h3>
                <SkillBar name="إدارة حملات Meta" level={92} delay={0.1} />
                <SkillBar name="TikTok Ads" level={85} delay={0.2} />
                <SkillBar name="Snapchat Ads" level={80} delay={0.3} />
                <SkillBar name="تحسين ROAS" level={90} delay={0.4} />
                <SkillBar name="A/B Testing" level={88} delay={0.5} />
                <SkillBar name="Tracking & Pixel" level={85} delay={0.6} />
              </div>
            </RevealSection>

            <RevealSection delay={0.2}>
              <div className="glass-card p-8">
                <h3 className="text-xl font-bold gold-text mb-6">مهارات النمو</h3>
                <SkillBar name="تحليل البيانات" level={88} delay={0.1} />
                <SkillBar name="Scaling الحملات" level={85} delay={0.2} />
                <SkillBar name="تحسين معدل التحويل (CRO)" level={82} delay={0.3} />
                <SkillBar name="إعداد التقارير" level={90} delay={0.4} />
                <SkillBar name="Creative Testing" level={87} delay={0.5} />
                <SkillBar name="Budget Optimization" level={86} delay={0.6} />
              </div>
            </RevealSection>
          </div>

          {/* Skill Tags */}
          <RevealSection delay={0.3} className="mt-10">
            <div className="flex flex-wrap gap-3 justify-center">
              {[
                "Meta Ads Manager", "TikTok Business Center", "Snap Ads Manager",
                "Google Analytics", "Facebook Pixel", "TikTok Pixel",
                "A/B Testing", "ROAS Optimization", "Retargeting",
                "Lookalike Audiences", "CRO", "Data Analysis",
                "Campaign Scaling", "eCommerce", "Performance Marketing",
              ].map((tag, i) => (
                <motion.span
                  key={tag}
                  className="px-4 py-2 rounded-full text-xs font-semibold cursor-default"
                  style={{
                    background: "rgba(246,211,101,0.08)",
                    border: "1px solid rgba(246,211,101,0.25)",
                    color: "#f6d365",
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{
                    background: "rgba(246,211,101,0.2)",
                    scale: 1.05,
                    boxShadow: "0 0 20px rgba(246,211,101,0.3)",
                  }}
                >
                  {tag}
                </motion.span>
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* EXPERIENCE SECTION */}
      <section id="experience" className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <RevealSection className="text-center mb-14">
            <h2 className="text-4xl font-black text-white mb-4">الخبرة</h2>
            <div className="w-24 h-1 mx-auto rounded-full" style={{ background: "linear-gradient(90deg, #f6d365, #fda085)" }} />
          </RevealSection>

          <RevealSection>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-px" style={{ background: "linear-gradient(180deg, #f6d365, transparent)" }} />

              <div className="glass-card p-8 ml-16 relative">
                {/* Timeline dot */}
                <div className="absolute -left-[2.75rem] top-8 w-5 h-5 rounded-full" style={{ background: "linear-gradient(135deg, #f6d365, #fda085)", boxShadow: "0 0 20px rgba(246,211,101,0.6)" }} />

                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-white">Media Buyer</h3>
                    <p className="text-yellow-400 font-semibold mt-1">عمل حر – مصر</p>
                  </div>
                  <div className="glass-card px-4 py-2 rounded-xl">
                    <span className="text-yellow-300 text-sm font-bold">أبريل 2025 – الآن</span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    "إدارة الحملات الإعلانية على Meta (Facebook & Instagram) و TikTok و Snapchat",
                    "تجربة أكثر من فكرة (Creatives / Audiences / Offers) للوصول لأفضل النتائج",
                    "متابعة أداء الحملات بشكل يومي واتخاذ قرارات بناءً على البيانات",
                    "تحسين معدل التحويل (Conversion Rate) وتقليل تكلفة النتيجة",
                    "تكبير الحملات الناجحة (Scaling) مع الحفاظ على الأداء",
                    "إعداد وتتبع الحملات باستخدام أدوات التتبع لضمان دقة البيانات",
                    "تقديم تقارير واضحة عن الأداء مع توصيات للتطوير",
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-xl"
                      style={{ background: "rgba(246,211,101,0.05)" }}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ background: "rgba(246,211,101,0.1)" }}
                    >
                      <span className="text-yellow-400 mt-0.5 shrink-0">◆</span>
                      <span className="text-yellow-100/70 text-sm leading-relaxed">{item}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <RevealSection className="text-center mb-14">
            <h2 className="text-4xl font-black text-white mb-4">الخدمات</h2>
            <div className="w-24 h-1 mx-auto rounded-full" style={{ background: "linear-gradient(90deg, #f6d365, #fda085)" }} />
            <p className="text-yellow-200/50 mt-4">ما أقدر أوفره لبيزنسك</p>
          </RevealSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: "🎯",
                title: "إدارة الحملات الإعلانية",
                desc: "إدارة كاملة لحملاتك الإعلانية على Meta و TikTok و Snapchat بأعلى كفاءة",
              },
              {
                icon: "📊",
                title: "تحليل البيانات والتقارير",
                desc: "تقارير يومية وأسبوعية وشهرية مع توصيات عملية لتحسين الأداء",
              },
              {
                icon: "🚀",
                title: "Scaling للحملات",
                desc: "تكبير الحملات الناجحة بشكل تدريجي مع الحفاظ على الـ ROAS",
              },
              {
                icon: "🔬",
                title: "A/B Testing",
                desc: "اختبار منهجي للـ Creatives والـ Audiences والـ Offers للوصول لأفضل تركيبة",
              },
              {
                icon: "📡",
                title: "Tracking & Pixel Setup",
                desc: "إعداد وتتبع دقيق للبيانات لضمان قرارات مبنية على معلومات صحيحة",
              },
              {
                icon: "💡",
                title: "استشارات التسويق الرقمي",
                desc: "استراتيجية إعلانية متكاملة تناسب نوع منتجك وجمهورك المستهدف",
              },
            ].map((service, i) => (
              <RevealSection key={i} delay={i * 0.1}>
                <TiltCard className="glass-card p-6 h-full cursor-default group">
                  <motion.div
                    className="text-4xl mb-4"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                  >
                    {service.icon}
                  </motion.div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-yellow-100/50 text-sm leading-relaxed">{service.desc}</p>
                </TiltCard>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* WHY ME SECTION */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <RevealSection>
            <div className="glass-card p-10 relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full opacity-20"
                style={{ background: "radial-gradient(circle, #f6d365, transparent)" }} />

              <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-4xl font-black text-white mb-6">
                    ليه تختارني؟
                  </h2>
                  <p className="text-yellow-100/60 leading-relaxed mb-6">
                    بشتغل بالأرقام، وأفهم إيه اللي شغال وإيه لأ، وبعدها أطور الحملات خطوة بخطوة
                    لحد ما توصل لأفضل أداء. مش بتكل على الحظ، بتكل على البيانات.
                  </p>
                  <div className="space-y-3">
                    {[
                      "قرارات مبنية على البيانات مش على التخمين",
                      "متابعة يومية وتحسين مستمر",
                      "شفافية كاملة في التقارير والنتائج",
                      "تركيز على الـ ROI وتحقيق الأهداف التجارية",
                    ].map((point, i) => (
                      <motion.div
                        key={i}
                        className="flex items-center gap-3"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.15 }}
                      >
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: "linear-gradient(135deg, #f6d365, #fda085)" }}>
                          <span className="text-xs font-black text-gray-900">✓</span>
                        </div>
                        <span className="text-yellow-100/70 text-sm">{point}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="relative w-56 h-56">
                    {/* Orbiting elements */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-24 h-24 rounded-full flex items-center justify-center"
                        style={{
                          background: "linear-gradient(135deg, #f6d365, #fda085)",
                          boxShadow: "0 0 40px rgba(246,211,101,0.5)",
                        }}>
                        <span className="text-3xl font-black text-gray-900">📈</span>
                      </div>
                    </div>
                    {[
                      { icon: "🎯", delay: "0s", color: "#1877f2" },
                      { icon: "💰", delay: "2s", color: "#fda085" },
                      { icon: "📊", delay: "4s", color: "#69db7c" },
                      { icon: "🚀", delay: "6s", color: "#da77f2" },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="absolute inset-0 flex items-center justify-center"
                        style={{
                          animation: `orbit ${8 + i * 2}s linear infinite`,
                          animationDelay: item.delay,
                        }}
                      >
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                          style={{
                            background: item.color,
                            boxShadow: `0 0 15px ${item.color}80`,
                            marginLeft: 100 + i * 10,
                          }}>
                          {item.icon}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* CONTACT SECTION */}
      <section id="contact" className="relative z-10 py-20 px-6 pb-32">
        <div className="max-w-4xl mx-auto text-center">
          <RevealSection>
            <h2 className="text-4xl font-black text-white mb-4">تواصل معي</h2>
            <div className="w-24 h-1 mx-auto rounded-full mb-6" style={{ background: "linear-gradient(90deg, #f6d365, #fda085)" }} />
            <p className="text-yellow-200/50 mb-12 text-lg">
              جاهز أشتغل على بيزنسك وأوصل بحملاتك لأفضل نتيجة
            </p>
          </RevealSection>

          <RevealSection delay={0.2}>
            <div className="grid md:grid-cols-3 gap-4 mb-10">
              {[
                { icon: "💬", label: "واتساب", value: "تواصل الآن", color: "#25D366", href: "https://wa.me/201234567890" },
                { icon: "📧", label: "البريد الإلكتروني", value: "media@buyer.pro", color: "#f6d365", href: "mailto:media@buyer.pro" },
                { icon: "📱", label: "تيليجرام", value: "@mediabuyerpro", color: "#2AABEE", href: "https://t.me/mediabuyerpro" },
              ].map((contact, i) => (
                <motion.a
                  key={i}
                  href={contact.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-card p-6 rounded-2xl flex flex-col items-center gap-3 group cursor-pointer no-underline"
                  whileHover={{ scale: 1.05, boxShadow: `0 0 30px ${contact.color}40` }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-3xl">{contact.icon}</span>
                  <span className="text-sm text-yellow-200/50">{contact.label}</span>
                  <span className="font-bold" style={{ color: contact.color }}>{contact.value}</span>
                </motion.a>
              ))}
            </div>
          </RevealSection>

          <RevealSection delay={0.4}>
            <motion.div
              className="p-8 rounded-2xl text-center"
              style={{
                background: "linear-gradient(135deg, rgba(246,211,101,0.1), rgba(253,160,133,0.1))",
                border: "1px solid rgba(246,211,101,0.3)",
              }}
              whileHover={{ boxShadow: "0 0 50px rgba(246,211,101,0.2)" }}
            >
              <p className="text-2xl font-black text-white mb-2">هل أنت جاهز تكبّر بيزنسك؟</p>
              <p className="text-yellow-200/60 mb-6">دعنا نحوّل إعلاناتك إلى مبيعات حقيقية</p>
              <motion.a
                href="https://wa.me/201234567890"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-10 py-4 rounded-xl font-black text-base no-underline"
                style={{
                  background: "linear-gradient(135deg, #f6d365, #fda085)",
                  color: "#0a0e1a",
                  boxShadow: "0 0 40px rgba(246,211,101,0.5)",
                }}
                whileHover={{ scale: 1.05, boxShadow: "0 0 60px rgba(246,211,101,0.7)" }}
                whileTap={{ scale: 0.98 }}
              >
                ابدأ الآن 🚀
              </motion.a>
            </motion.div>
          </RevealSection>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 text-center py-6 border-t border-yellow-400/10">
        <p className="text-yellow-200/30 text-sm">
          © 2025 Media Buyer Pro — مصنوع بـ ❤️ لتحقيق أفضل النتائج
        </p>
      </footer>
    </div>
  );
}
