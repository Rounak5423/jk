import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import {
  Building2, User, Mail, Lock, Phone, MapPin,
  AlertCircle, ArrowRight, ArrowLeft,
  Truck, Shield, BarChart3, Disc,
} from 'lucide-react';
import { motion } from 'framer-motion';
import jkLogo      from '../../assets/jk-logo.png';
import tyreAnim    from '../../assets/tyre-aimation vedio.gif';

/* ══════════════════════════════════════════════════════════════════════════
   CUSTOM ILLUSTRATED SCENE  — dark road + isometric tyre + floating cards
   100% SVG + CSS — no external image needed
══════════════════════════════════════════════════════════════════════════ */

/* ── Floating metric card (rendered as SVG foreignObject) ── */
const MetricCard: React.FC<{
  x: number; y: number; label: string; value: string;
  accent: string; delay: number;
}> = ({ x, y, label, value, accent, delay }) => (
  <motion.g
    initial={{ opacity: 0, y: -16 }}
    animate={{ opacity: 1, y: [0, -6, 0] }}
    transition={{
      opacity: { delay, duration: 0.55 },
      y: { delay: delay + 0.5, duration: 3.5 + delay * 0.4, repeat: Infinity, ease: 'easeInOut' },
    }}
  >
    <foreignObject x={x} y={y} width="130" height="56" style={{ overflow: 'visible' }}>
      <div
        style={{
          background: 'rgba(15,18,30,0.82)',
          border: `1px solid ${accent}44`,
          borderRadius: 12,
          padding: '8px 12px',
          backdropFilter: 'blur(10px)',
          boxShadow: `0 4px 24px ${accent}22`,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 900, color: accent, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{label}</div>
      </div>
    </foreignObject>
  </motion.g>
);

/* ── Real tyre animation — GIF rendered inside SVG via foreignObject ── */
const SceneTyre: React.FC<{ cx: number; cy: number; r: number; delay?: number }> = ({ cx, cy, r }) => {
  const size = r * 2.1; // slightly larger than tyre radius so the animation fills well
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.4, duration: 0.8, ease: [0.34, 1.2, 0.64, 1] }}
      style={{ transformOrigin: `${cx}px ${cy}px` }}
    >
      <foreignObject
        x={cx - size / 2}
        y={cy - size / 2}
        width={size}
        height={size}
        style={{ overflow: 'visible' }}
      >
        <img
          src={tyreAnim}
          alt="Tyre animation"
          style={{
            width:  '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            filter: 'drop-shadow(0 12px 40px rgba(56,189,248,0.45)) drop-shadow(0 4px 16px rgba(0,0,0,0.6))',
          }}
        />
      </foreignObject>
    </motion.g>
  );
};

/* ── The full illustrated scene ── */
const RegisterScene: React.FC = () => (
  <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
    <svg
      viewBox="0 0 520 680"
      width="100%" height="100%"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', inset: 0 }}
    >
      <defs>
        {/* Background — blue-tinted slate */}
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#f0f7ff" />
          <stop offset="35%"  stopColor="#e8f4ff" />
          <stop offset="70%"  stopColor="#dbeafe" />
          <stop offset="100%" stopColor="#bfdbfe" />
        </linearGradient>

        {/* Road gradient */}
        <linearGradient id="roadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        {/* Rubber — dark blue-tinted */}
        <radialGradient id="rubberFill" cx="38%" cy="32%" r="68%">
          <stop offset="0%"   stopColor="#1a2035" />
          <stop offset="60%"  stopColor="#0d1220" />
          <stop offset="100%" stopColor="#050810" />
        </radialGradient>

        {/* Rim — blue-steel */}
        <radialGradient id="rimFillBlue" cx="35%" cy="30%" r="70%">
          <stop offset="0%"   stopColor="#3a5a8a" />
          <stop offset="45%"  stopColor="#1a2e50" />
          <stop offset="100%" stopColor="#080f1e" />
        </radialGradient>

        {/* Blade spoke fill */}
        <linearGradient id="bladeFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#3a6090" />
          <stop offset="50%"  stopColor="#1a3060" />
          <stop offset="100%" stopColor="#0d1830" />
        </linearGradient>

        {/* Hub fill — deep blue */}
        <radialGradient id="hubFillBlue" cx="40%" cy="35%" r="65%">
          <stop offset="0%"   stopColor="#2a4a7a" />
          <stop offset="100%" stopColor="#080f1e" />
        </radialGradient>

        {/* Blue sidewall glow ring */}
        <radialGradient id="blueSidewall" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#38bdf8" stopOpacity="0" />
          <stop offset="80%"  stopColor="#38bdf8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
        </radialGradient>

        {/* Blue orbital ring gradient */}
        <linearGradient id="blueRing1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#38bdf8" stopOpacity="0.1" />
          <stop offset="50%"  stopColor="#38bdf8" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="blueRing2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#7dd3fc" stopOpacity="0.1" />
          <stop offset="50%"  stopColor="#7dd3fc" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.1" />
        </linearGradient>

        {/* Gold ground ring */}
        <linearGradient id="goldRing" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#EAB308" stopOpacity="0" />
          <stop offset="30%"  stopColor="#EAB308" stopOpacity="1" />
          <stop offset="70%"  stopColor="#FCD34D" stopOpacity="1" />
          <stop offset="100%" stopColor="#EAB308" stopOpacity="0" />
        </linearGradient>

        {/* Floor reflection */}
        <radialGradient id="floorReflect" cx="50%" cy="30%" r="60%">
          <stop offset="0%"   stopColor="#38bdf8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0"   />
        </radialGradient>

        {/* Contact glow */}
        <radialGradient id="glowEllipse" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#EAB308" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#EAB308" stopOpacity="0"   />
        </radialGradient>

        {/* Road centre strip gradient */}
        <linearGradient id="stripGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#EAB308" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#EAB308" stopOpacity="0"   />
        </linearGradient>

        {/* Left-side white-to-transparent fade (the seamless merge) */}
        <linearGradient id="mergeLeft" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"  stopColor="#ffffff" stopOpacity="1" />
          <stop offset="28%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        {/* Card glow filter */}
        <filter id="cardGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#EAB308" floodOpacity="0.18" />
        </filter>
        <filter id="tyreShadow">
          <feDropShadow dx="6" dy="12" stdDeviation="14" floodColor="#000" floodOpacity="0.6" />
        </filter>
      </defs>

      {/* ── Scene background ── */}
      <rect width="520" height="680" fill="url(#bgGrad)" />

      {/* ── Abstract road / track sweeping from bottom-right ── */}
      <ellipse cx="420" cy="560" rx="280" ry="95" fill="url(#roadGrad)" opacity="0.85" />
      <ellipse cx="420" cy="560" rx="240" ry="78" fill="none" stroke="#334155" strokeWidth="1.5" opacity="0.4" />
      {/* Lane markings */}
      {[0, 30, 60, 90, 120].map((offset, i) => (
        <motion.line key={i}
          x1={260 + offset} y1="560" x2={290 + offset} y2="555"
          stroke="url(#stripGrad)" strokeWidth="2" strokeLinecap="round"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.25, ease: 'easeInOut' }}
        />
      ))}

      {/* ── Grid lines (subtle, like a data grid / HUD) ── */}
      {[100, 180, 260, 340, 420, 500].map((y) => (
        <line key={y} x1="0" y1={y} x2="520" y2={y}
          stroke="#e2e8f0" strokeWidth="0.5" opacity="0.6" />
      ))}
      {[80, 160, 240, 320, 400, 480].map((x) => (
        <line key={x} x1={x} y1="0" x2={x} y2="680"
          stroke="#e2e8f0" strokeWidth="0.5" opacity="0.6" />
      ))}

      {/* ── Large background tyre (faint, decorative) ── */}
      <motion.g
        initial={{ opacity: 0 }} animate={{ opacity: 0.07 }}
        transition={{ delay: 0.3, duration: 1 }}>
        <circle cx="430" cy="220" r="175" fill="none" stroke="#0f172a" strokeWidth="28" />
        <circle cx="430" cy="220" r="120" fill="none" stroke="#0f172a" strokeWidth="6"  />
        <circle cx="430" cy="220" r="60"  fill="none" stroke="#0f172a" strokeWidth="4"  />
      </motion.g>

      {/* ── Floating dots pattern ── */}
      {[
        [40, 80], [90, 140], [150, 60], [200, 110], [460, 80], [480, 160],
        [350, 50], [410, 130], [60, 300], [100, 380], [460, 320], [490, 400],
      ].map(([x, y], i) => (
        <motion.circle key={i} cx={x} cy={y} r="3" fill="#EAB308"
          animate={{ opacity: [0.15, 0.6, 0.15], scale: [1, 1.5, 1] }}
          transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
          style={{ transformOrigin: `${x}px ${y}px` }}
        />
      ))}

      {/* ── Main tyre (large, centred-right) ── */}
      <g filter="url(#tyreShadow)">
        <SceneTyre cx={310} cy={400} r={150} delay={0.2} />
      </g>

      {/* ── Small secondary tyre (bottom-left, partially clipped) ── */}
      <g opacity="0.55">
        <SceneTyre cx={60} cy={560} r={90} delay={0.8} />
      </g>

      {/* ── Floating metric cards ── */}
      <MetricCard x={32}  y={80}  label="Fleets Enrolled"    value="1,200+"  accent="#EAB308" delay={0.6} />
      <MetricCard x={360} y={60}  label="Tyres Monitored"    value="48k+"    accent="#38bdf8" delay={0.8} />
      <MetricCard x={32}  y={240} label="Trips Analysed"     value="3.2M+"   accent="#34d399" delay={1.0} />
      <MetricCard x={370} y={220} label="Uptime"             value="99.7%"   accent="#a78bfa" delay={1.2} />

      {/* ── Connecting lines from cards to tyre ── */}
      {[
        { x1: 162, y1: 108, x2: 260, y2: 310, c: '#EAB308' },
        { x1: 360, y1: 88,  x2: 330, y2: 260, c: '#38bdf8' },
        { x1: 162, y1: 268, x2: 250, y2: 350, c: '#34d399' },
        { x1: 370, y1: 248, x2: 360, y2: 300, c: '#a78bfa' },
      ].map((l, i) => (
        <motion.line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={l.c} strokeWidth="0.8" strokeDasharray="4 6"
          animate={{ opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
        />
      ))}

      {/* ── Seamless left-to-right white merge (no border line) ── */}
      <rect width="520" height="680" fill="url(#mergeLeft)" />
    </svg>
  </div>
);

/* ─── Perks ─────────────────────────────────────────────────────────────── */
const PERKS = [
  { icon: <Truck     className="w-3.5 h-3.5" />, color: '#EAB308', title: 'Fleet Dashboard'   },
  { icon: <Disc      className="w-3.5 h-3.5" />, color: '#38bdf8', title: 'Live Tyre Health'  },
  { icon: <Shield    className="w-3.5 h-3.5" />, color: '#34d399', title: 'Predictive Alerts' },
  { icon: <BarChart3 className="w-3.5 h-3.5" />, color: '#a78bfa', title: 'Analytics'         },
];

const up = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0  },
  transition: { delay, duration: 0.55, ease: [0.34, 1.2, 0.64, 1] as any },
});

/* ═══════════════════════════════════════════════════════════════════════ */
export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [formData, setFormData] = useState({
    company_name: '', registration_no: '', contact_name: '',
    email: '', password: '', phone: '', address: '',
  });
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/register', formData);
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const inp = `w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm
    text-slate-900 placeholder-slate-400 focus:outline-none focus:border-yellow-400
    focus:ring-2 focus:ring-yellow-400/20 transition shadow-sm`;
  const lbl = 'block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider';

  return (
    /* Full viewport, no scroll — two columns, GIF on right, smooth blend */
    <div className="h-screen w-screen overflow-hidden flex bg-white">

      {/* ══ LEFT — solid white form column ══════════════════════════════ */}
      <div className="relative z-10 flex flex-col w-full lg:w-[52%] h-full overflow-y-auto bg-white px-8 py-7 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

        {/* Yellow top stripe */}
        <div className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ background: 'linear-gradient(to right,#EAB308,#FCD34D,#EAB308)' }} />

        <div className="max-w-[430px] mx-auto w-full flex flex-col min-h-full">

          {/* Back */}
          <motion.div {...up(0.05)} className="mb-4 mt-1">
            <Link to="/"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 transition group w-fit">
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Back to Home
            </Link>
          </motion.div>

          {/* Heading */}
          <motion.div className="mb-5" {...up(0.12)}>
            <div className="flex items-center gap-3 mb-3">
              <img src={jkLogo} alt="JK Tyre" className="h-8 w-auto object-contain" />
              <div className="h-5 w-px bg-slate-200" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fleet Enrolment</span>
            </div>
            <h1 className="text-[1.85rem] font-black text-slate-900 tracking-tight">Fleet Registration</h1>
            <p className="text-xs text-slate-500 mt-1">Enroll your transport company in JK Tyre Fleet Intelligence.</p>
          </motion.div>

          {/* Error */}
          {error && (
            <motion.div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2"
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </motion.div>
          )}

          {/* Form — all fields restored */}
          <motion.form onSubmit={handleSubmit} className="space-y-3.5 flex-1" {...up(0.2)}>

            {/* Row 1 — Company Name + Registration No */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Company Name *</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input type="text" name="company_name" value={formData.company_name}
                    onChange={handleChange} placeholder="Apex Trans Logistics" required className={inp} />
                </div>
              </div>
              <div>
                <label className={lbl}>Registration No.</label>
                <input type="text" name="registration_no" value={formData.registration_no}
                  onChange={handleChange} placeholder="DL-TRANS-2024-889"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition shadow-sm" />
              </div>
            </div>

            {/* Row 2 — Contact Person + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input type="text" name="contact_name" value={formData.contact_name}
                    onChange={handleChange} placeholder="Full Name" required className={inp} />
                </div>
              </div>
              <div>
                <label className={lbl}>Contact Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input type="tel" name="phone" value={formData.phone}
                    onChange={handleChange} placeholder="+91 98100 00000" className={inp} />
                </div>
              </div>
            </div>

            {/* Row 3 — Email + Password */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Official Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input type="email" name="email" value={formData.email}
                    onChange={handleChange} placeholder="fleet@company.com" required className={inp} />
                </div>
              </div>
              <div>
                <label className={lbl}>Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input type="password" name="password" value={formData.password}
                    onChange={handleChange} placeholder="Min 6 characters" required minLength={6} className={inp} />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className={lbl}>Operating Depot / Address</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <textarea name="address" value={formData.address} onChange={handleChange}
                  rows={2} placeholder="Logistics Park / Depot address"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition shadow-sm resize-none" />
              </div>
            </div>

            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: 1.02, boxShadow: '0 8px 28px rgba(234,179,8,0.32)' }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-yellow-400/20">
              {loading ? 'Registering Fleet…' : 'Register Transport Fleet'}
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.form>

          {/* Perk pills */}
          <motion.div className="flex flex-wrap gap-2 mt-4" {...up(0.4)}>
            {PERKS.map((p) => (
              <div key={p.title}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-600">
                <span style={{ color: p.color }}>{p.icon}</span>
                {p.title}
              </div>
            ))}
          </motion.div>

          <motion.p className="text-center text-xs text-slate-500 mt-4 pb-2" {...up(0.45)}>
            Already registered?{' '}
            <Link to="/login" className="text-yellow-600 hover:text-yellow-500 font-bold transition">
              Sign In
            </Link>
          </motion.p>
        </div>
      </div>

      {/* ══ RIGHT — GIF column, overlaps left panel with gradient ══════ */}
      <div className="hidden lg:block flex-1 h-full relative overflow-hidden"
        style={{ marginLeft: '-80px' }}>

        {/* GIF fills the right column, anchored to the right edge */}
        <motion.img
          src={tyreAnim}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'cover', objectPosition: 'right center' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />

        {/* Reduced white fade — just enough to blend, not wash out the GIF */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, #ffffff 0%, rgba(255,255,255,0.75) 12%, rgba(255,255,255,0.25) 28%, rgba(255,255,255,0.05) 45%, transparent 60%)',
          }}
        />

      </div>
    </div>
  );
};
