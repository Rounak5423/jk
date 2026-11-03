import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Eye, Activity, ArrowRight, AlertTriangle, BarChart3, Route } from 'lucide-react';
import { motion } from 'framer-motion';
import jkLogo from '../../assets/jk-logo.png';
import jkHero from '../../assets/jk-hero.png';

/* ─── Feature card data (original 3 + 2 new) ──────────────────────────── */
const FEATURE_CARDS = [
  {
    icon: <Eye className="w-5 h-5" />,
    color: 'red',
    title: '3D Digital Twin Inspection',
    desc: 'Configuration-driven interactive 3D truck & bus visualization with dynamic wheel counts, real-time health colors, and instant tyre telemetry.',
  },
  {
    icon: <Activity className="w-5 h-5" />,
    color: 'blue',
    title: 'Explainable THI & Trip Score',
    desc: 'Deterministic rule engine computing scores (0–100) with complete factor breakdown: pressure %deviation, temperature, tread wear, and thermal stress.',
  },
  {
    icon: <Shield className="w-5 h-5" />,
    color: 'emerald',
    title: 'Permanent Tyre Identities',
    desc: 'Tyres retain their identity and accumulated distance across vehicle remounts, scheduled rotations, retreads, and inspections.',
  },
  {
    icon: <AlertTriangle className="w-5 h-5" />,
    color: 'amber',
    title: 'Predictive Alert Engine',
    desc: 'Real-time anomaly detection across pressure deviation, temperature spikes, and tread depth thresholds — alerts dispatched instantly to depot managers.',
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    color: 'purple',
    title: 'Fleet Analytics & Trends',
    desc: 'Cross-fleet comparative analytics, wear rate projections, and driver behaviour scoring to reduce tyre costs and improve road safety.',
  },
  {
    icon: <Route className="w-5 h-5" />,
    color: 'cyan',
    title: 'Live Trip Monitoring',
    desc: 'Monotonic odometer tracking with per-trip tyre stress scoring. Every journey logged with route, distance, driver, and tyre health delta.',
  },
];

/* Duplicate the cards so the loop is seamless */
const TICKER_CARDS = [...FEATURE_CARDS, ...FEATURE_CARDS];

/* ─── Colour map ───────────────────────────────────────────────────────── */
const COLOR: Record<string, { bg: string; border: string; text: string }> = {
  red:     { bg: 'bg-red-500/10',     border: 'border-red-500/20',     text: 'text-red-400' },
  blue:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    text: 'text-blue-400' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400' },
  purple:  { bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  text: 'text-purple-400' },
  cyan:    { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    text: 'text-cyan-400' },
};

/* ─── Drop-in word animation helper ───────────────────────────────────── */
const wordDrop = (i: number) => ({
  initial: { y: -90, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: { delay: i * 0.13, duration: 0.72, ease: [0.34, 1.56, 0.64, 1] as any },
});

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50 px-8 flex items-center justify-between w-full" style={{ height: '56px', overflow: 'visible' }}>
        <div className="flex items-center">
          <img src={jkLogo} alt="JK Tyre" className="w-auto object-contain" style={{ height: '72px' }} />
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login" className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition">
            Sign In
          </Link>
          <Link to="/register" className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition shadow-lg shadow-red-600/20">
            Register Fleet
          </Link>
        </div>
      </header>

      {/* ── Hero Section ───────────────────────────────────────────────── */}
      <section className="relative flex flex-col justify-center px-8 md:px-16 lg:px-24 py-20 min-h-[90vh] overflow-hidden">

        {/* Background image */}
        <img
          src={jkHero}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="sync"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Gradient overlay — lighter, less blue for brighter background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(2,6,23,0.65) 0%, rgba(2,6,23,0.45) 40%, rgba(2,6,23,0.20) 70%, rgba(2,6,23,0.05) 100%), linear-gradient(to bottom, rgba(2,6,23,0.25) 0%, transparent 35%, transparent 75%, rgba(2,6,23,0.50) 100%)',
          }}
        />

        {/* ── Left-aligned content ──────────────────────────────────────── */}
        <div className="relative z-10 max-w-2xl flex flex-col items-start">

          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 mb-6"
            {...wordDrop(-1)}
          >
            <Activity className="w-3.5 h-3.5" />
            SMART MOBILITY · TYRE HEALTH INTELLIGENCE
          </motion.div>

          {/* Tagline — word-by-word drop */}
          <h1
            className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[1.08] mb-2"
            style={{ textShadow: '0 2px 24px rgba(0,0,0,0.85)' }}
          >
            {/* Line 1 */}
            <div className="flex flex-wrap gap-x-4 mb-1">
              {['Every', 'ture.'].map((w, i) => (
                <motion.span key={w + i} className="inline-block" {...wordDrop(i)}>
                  {w}
                </motion.span>
              ))}
            </div>
            {/* Line 2 — yellow */}
            <div className="flex flex-wrap gap-x-4 mb-1">
              {['Every', 'mile.'].map((w, i) => (
                <motion.span
                  key={w + i}
                  className="inline-block text-yellow-400"
                  style={{ textShadow: '0 2px 20px rgba(234,179,8,0.4)' }}
                  {...wordDrop(i + 2)}
                >
                  {w}
                </motion.span>
              ))}
            </div>
            {/* Line 3 */}
            <div className="flex flex-wrap gap-x-4">
              {['Under', 'control.'].map((w, i) => (
                <motion.span key={w + i} className="inline-block" {...wordDrop(i + 4)}>
                  {w}
                </motion.span>
              ))}
            </div>
          </h1>

          {/* Subtitle */}
          <motion.p
            className="text-slate-200 text-base md:text-lg leading-relaxed mt-6 mb-8 max-w-xl"
            style={{ textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.6, ease: 'easeOut' }}
          >
            Real-time fleet visibility, predictive tyre health and actionable maintenance
            intelligence — designed for connected commercial mobility.
          </motion.p>

          {/* Buttons — left-aligned with drop */}
          <motion.div
            className="flex flex-wrap items-center gap-4"
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.12, duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <Link
              to="/login"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm bg-red-600 text-white hover:bg-red-700 shadow-xl shadow-red-600/30 transition"
            >
              Launch Platform Demo <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/register"
              className="px-7 py-3.5 rounded-xl font-bold text-sm bg-white/10 border border-white/20 text-white hover:bg-white/20 backdrop-blur-sm transition"
            >
              Register Transport Fleet
            </Link>
          </motion.div>
        </div>

        {/* ── Vertical scrolling feature ticker ─────────────────────────── */}
        {/* Positioned on the right side of the hero, overlapping the image area */}
        <div
          className="absolute right-6 md:right-12 top-0 bottom-0 z-10 flex items-center"
          style={{ width: '280px' }}
        >
          {/* Fade masks top and bottom */}
          <div className="absolute inset-x-0 top-0 h-24 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, rgba(2,6,23,0.9), transparent)' }} />
          <div className="absolute inset-x-0 bottom-0 h-24 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(2,6,23,0.9), transparent)' }} />

          {/* Scrolling track */}
          <div className="overflow-hidden h-full w-full relative">
            <motion.div
              className="flex flex-col gap-4 py-4"
              animate={{ y: [0, -50 * FEATURE_CARDS.length] }}
              transition={{
                duration: FEATURE_CARDS.length * 4,
                ease: 'linear',
                repeat: Infinity,
                repeatType: 'loop',
              }}
            >
              {TICKER_CARDS.map((card, idx) => {
                const c = COLOR[card.color];
                return (
                  <div
                    key={idx}
                    className="bg-slate-900/80 border border-slate-700/60 p-4 rounded-2xl backdrop-blur-sm shrink-0"
                    style={{ width: '260px' }}
                  >
                    <div className={`w-9 h-9 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center ${c.text} mb-3`}>
                      {card.icon}
                    </div>
                    <h3 className="font-bold text-white text-sm mb-1.5">{card.title}</h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{card.desc}</p>
                  </div>
                );
              })}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        JK Tyre THI Fleet Intelligence Platform · Built for Commercial Fleet Operators & Drivers
      </footer>
    </div>
  );
};
