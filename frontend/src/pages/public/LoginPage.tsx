import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import {
  Lock, User, Mail, AlertCircle, ArrowRight, ArrowLeft,
  Activity, ShieldCheck, TrendingUp, Navigation, KeyRound,
} from 'lucide-react';
import { motion } from 'framer-motion';
import jkLogo  from '../../assets/jk-logo.png';
import jkHero  from '../../assets/jk-hero.png';

/* ─── Feature bullets (left panel) ────────────────────────────────────── */
const BULLETS = [
  { icon: <Activity    className="w-4 h-4" />, text: 'Monitor Tyre Health'    },
  { icon: <ShieldCheck className="w-4 h-4" />, text: 'Prevent Breakdowns'     },
  { icon: <TrendingUp  className="w-4 h-4" />, text: 'Optimise Performance'   },
  { icon: <Navigation  className="w-4 h-4" />, text: 'Drive Safer Miles'      },
];

/* ─── drop-in helper ───────────────────────────────────────────────────── */
const drop = (delay = 0, x = 0) => ({
  initial:    { opacity: 0, y: -32, x },
  animate:    { opacity: 1, y: 0,   x: 0 },
  transition: { delay, duration: 0.65, ease: [0.34, 1.2, 0.64, 1] as any },
});

/* ═══════════════════════════════════════════════════════════════════════ */
export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuthStore();

  const [identifier, setIdentifier] = useState(searchParams.get('login_id') || '');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { identifier: identifier.trim(), password });
      login(res.data.token, res.data.user);
      if      (res.data.user.role === 'SUPER_ADMIN')   navigate('/admin');
      else if (res.data.user.role === 'DRIVER')         navigate('/driver');
      else if (res.data.user.role === 'FLEET_MANAGER')  navigate('/my-fleets');
      else                                              navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid Login ID or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Locked to viewport — no scroll */
    <div className="h-screen w-screen overflow-hidden flex">

      {/* ══════════════════════════════════════════════════════════════════
          LEFT PANEL  —  same hero image as landing page
      ══════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex flex-col w-[52%] h-full relative overflow-hidden">

        {/* ── Hero background image ── */}
        <img
          src={jkHero}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="sync"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* ── Multi-layer overlay: dark left-to-right + bottom darkening ── */}
        <div
          className="absolute inset-0"
          style={{
            background: [
              /* left edge darker for text legibility */
              'linear-gradient(to right,  rgba(2,6,23,0.82) 0%, rgba(2,6,23,0.60) 45%, rgba(2,6,23,0.30) 100%)',
              /* bottom darkening */
              'linear-gradient(to top,    rgba(2,6,23,0.80) 0%, transparent 55%)',
              /* top fade */
              'linear-gradient(to bottom, rgba(2,6,23,0.55) 0%, transparent 35%)',
            ].join(', '),
          }}
        />

        {/* ── Animated golden ambient particles ── */}
        {[
          { size: 180, top: '60%', left: '55%', delay: 0    },
          { size: 120, top: '25%', left: '70%', delay: 1.2  },
          { size:  90, top: '80%', left: '30%', delay: 0.6  },
        ].map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: p.size, height: p.size,
              top: p.top, left: p.left,
              background: 'radial-gradient(circle, rgba(234,179,8,0.18) 0%, transparent 70%)',
              filter: 'blur(18px)',
            }}
            animate={{ scale: [1, 1.35, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 4 + i, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        {/* ── Horizontal scanning light line ── */}
        <motion.div
          className="absolute left-0 right-0 h-[1px] pointer-events-none"
          style={{ background: 'linear-gradient(to right, transparent, rgba(234,179,8,0.45), transparent)' }}
          animate={{ top: ['15%', '85%', '15%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* ════ Content ════ */}
        <div className="relative z-10 flex flex-col h-full px-9 py-7">

          {/* Logo */}
          <motion.div {...drop(0.1)}>
            <img src={jkLogo} alt="JK Tyre" className="w-auto object-contain" style={{ height: '72px' }} />
          </motion.div>

          {/* Tagline block */}
          <div className="mt-auto mb-auto pt-8">

            <motion.p
              className="text-[11px] font-bold text-yellow-400 uppercase tracking-[0.22em] mb-3"
              {...drop(0.35)}
            >
              Fleet Command Centre
            </motion.p>

            {/* "Know the Tyre." word-drop */}
            <h2
              className="text-[2.7rem] font-black text-white leading-[1.1] mb-1"
              style={{ textShadow: '0 2px 24px rgba(0,0,0,0.9)' }}
            >
              {['Know', 'the', 'Tyre.'].map((w, i) => (
                <motion.span
                  key={w}
                  className="inline-block mr-3"
                  initial={{ y: -60, opacity: 0 }}
                  animate={{ y: 0,   opacity: 1 }}
                  transition={{ delay: 0.45 + i * 0.12, duration: 0.65, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  {w}
                </motion.span>
              ))}
            </h2>

            {/* "Own the Journey." word-drop in yellow */}
            <h2
              className="text-[2.7rem] font-black text-yellow-400 leading-[1.1] mb-8"
              style={{ textShadow: '0 2px 20px rgba(234,179,8,0.5)' }}
            >
              {['Own', 'the', 'Journey.'].map((w, i) => (
                <motion.span
                  key={w}
                  className="inline-block mr-3"
                  initial={{ y: -60, opacity: 0 }}
                  animate={{ y: 0,   opacity: 1 }}
                  transition={{ delay: 0.72 + i * 0.12, duration: 0.65, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  {w}
                </motion.span>
              ))}
            </h2>

            {/* Bullet features */}
            <div className="space-y-3">
              {BULLETS.map((b, i) => (
                <motion.div
                  key={b.text}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0  }}
                  transition={{ delay: 1.05 + i * 0.1, duration: 0.5 }}
                >
                  <div className="w-8 h-8 rounded-full bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-yellow-400 shrink-0 backdrop-blur-sm">
                    {b.icon}
                  </div>
                  <span
                    className="text-sm font-semibold text-slate-100"
                    style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}
                  >
                    {b.text}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bottom tagline */}
          <motion.p
            className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-400/70 text-center mt-auto pt-4 border-t border-white/5"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.6 }}
          >
            A Smarter Fleet &nbsp;|&nbsp; Safer Roads &nbsp;|&nbsp; A Stronger Tomorrow
          </motion.p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          RIGHT PANEL  —  yellow gradient login form
      ══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col justify-center items-center flex-1 h-full relative overflow-hidden px-8" style={{ background: 'radial-gradient(ellipse at top left, #ffe066 0%, #ffd700 25%, #fff176 50%, #fef08a 70%, #ffd000 100%)' }}>

        {/* Subtle yellow glow in corner */}
        <div
          className="absolute bottom-0 right-0 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(234,179,8,0.07) 0%, transparent 70%)', filter: 'blur(30px)' }}
        />

        {/* Back to Home */}
        <motion.div
          className="absolute top-6 left-6"
          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </Link>
        </motion.div>

        <div className="relative z-10 w-full max-w-sm">

          {/* Heading */}
          <motion.div className="mb-8" {...drop(0.25)}>
            <h1 className="text-3xl font-black text-blue-900 tracking-tight">Login</h1>
            <p className="text-sm text-blue-600 mt-1">
              Sign in to monitor vehicles and tyre health.
            </p>
          </motion.div>

          {/* Error banner */}
          {error && (
            <motion.div
              className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2"
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}

          {/* Form */}
          <motion.form onSubmit={handleSubmit} className="space-y-4" {...drop(0.38)}>

            {/* Login ID */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                  Login ID
                </label>
                <span className="text-[10px] text-blue-400 font-medium">
                  Fleet ID / Driver ID / Admin Email
                </span>
              </div>
              <div className="relative">
                <User className="w-4 h-4 text-blue-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. JK-FLT-84219 or admin@jktyre.com"
                  required
                  autoComplete="username"
                  className="w-full bg-white/80 border border-blue-200 rounded-xl pl-10 pr-4 py-3 text-sm text-blue-900 placeholder-blue-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30 transition shadow-sm font-medium"
                />
              </div>
              <p className="text-[11px] text-blue-400 mt-1">
                Log in with your generated ID. No email required for fleet or driver accounts.
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold text-blue-700 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-blue-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/80 border border-blue-200 rounded-xl pl-10 pr-4 py-3 text-sm text-blue-900 placeholder-blue-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30 transition shadow-sm"
                />
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(234,179,8,0.35)' }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? 'Authenticating…' : 'Sign in'}
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.form>

          {/* Register link */}
          <motion.p
            className="mt-5 text-center text-xs text-blue-700"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.65, duration: 0.45 }}
          >
            New fleet operator?{' '}
            <Link to="/register" className="text-blue-800 underline font-bold transition">
              Register here
            </Link>
          </motion.p>
        </div>
      </div>
    </div>
  );
};
