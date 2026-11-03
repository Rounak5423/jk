import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import {
  Lock, User, Mail, AlertCircle, ArrowRight, ArrowLeft,
  Activity, ShieldCheck, TrendingUp, Navigation, KeyRound, Eye, EyeOff, Truck, Building2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import jkLogo  from '../../assets/jk-logo.png';
import signInBg  from '../../assets/sign in bg image.png';

/* ─── Feature bullets ────────────────────────────────────── */
const BULLETS = [
  { icon: <Activity    className="w-5 h-5" />, text: 'Monitor Tyre Health'    },
  { icon: <ShieldCheck className="w-5 h-5" />, text: 'Prevent Breakdowns'     },
  { icon: <TrendingUp  className="w-5 h-5" />, text: 'Optimise Performance'   },
  { icon: <Navigation  className="w-5 h-5" />, text: 'Drive Safer Miles'      },
];

/* ═══════════════════════════════════════════════════════════════════════ */
export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuthStore();

  const [identifier, setIdentifier] = useState(searchParams.get('login_id') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [suggestedId, setSuggestedId] = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuggestedId(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { identifier: identifier.trim(), password });
      login(res.data.token, res.data.user);
      if      (res.data.user.role === 'SUPER_ADMIN')   navigate('/admin');
      else if (res.data.user.role === 'DRIVER')         navigate('/driver');
      else if (res.data.user.role === 'FLEET_MANAGER')  navigate('/my-fleets');
      else                                              navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Invalid Login ID or password. Please try again.';
      setError(msg);
      if (err.response?.data?.login_id) {
        setSuggestedId(err.response.data.login_id);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUseSuggested = () => {
    if (suggestedId) {
      setIdentifier(suggestedId);
      setSuggestedId(null);
      setError(null);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full"
      style={{
        backgroundImage: `url(${signInBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* JK Logo and Fleet Command Centre — top-left */}
      <motion.div
        className="absolute top-8 left-12 z-10 pointer-events-none"
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        transition={{delay: 0.1, duration: 0.6}}
      >
        <div className="flex items-center gap-4">
          <img src={jkLogo} alt="JK Tyre" className="w-auto object-contain" style={{ height: '64px' }} />
          <div className="h-8 w-px bg-white/30" />
          <span className="text-white font-black text-lg uppercase tracking-wider">
            Fleet Command Centre
          </span>
        </div>
      </motion.div>

      {/* Animated text with gradient shade — left side, lower position */}
      <motion.div
        className="absolute top-52 left-12 z-10 pointer-events-none"
        initial={{opacity: 0}}
        animate={{opacity: 1}}
      >
        {/* Radial gradient shade */}
        <div 
          className="absolute -z-10"
          style={{
            top: '50%',
            left: '0',
            transform: 'translate(-10%, -50%)',
            width: '650px',
            height: '450px',
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.85) 25%, rgba(0,0,0,0.65) 45%, rgba(0,0,0,0.35) 70%, transparent 100%)',
            filter: 'blur(30px)',
          }}
        />
        
        <motion.h2
          className="text-6xl font-black text-white leading-tight mb-2"
          style={{textShadow: '0 6px 40px rgba(0,0,0,1), 0 2px 20px rgba(0,0,0,0.9)'}}
          initial={{y: -60, opacity: 0}}
          animate={{y: 0, opacity: 1}}
          transition={{delay: 0.2, duration: 0.6, ease: [0.34, 1.2, 0.64, 1]}}
        >
          Know the Tyre.
        </motion.h2>
        <motion.h2
          className="text-6xl font-black text-yellow-400 leading-tight mb-8"
          style={{textShadow: '0 6px 35px rgba(234,179,8,0.8), 0 2px 20px rgba(0,0,0,0.95)'}}
          initial={{y: -60, opacity: 0}}
          animate={{y: 0, opacity: 1}}
          transition={{delay: 0.4, duration: 0.6, ease: [0.34, 1.2, 0.64, 1]}}
        >
          Own the Journey.
        </motion.h2>

        {/* Bullet features */}
        <div className="space-y-4">
          {BULLETS.map((b, i) => (
            <motion.div
              key={b.text}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0  }}
              transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
            >
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 border-2 border-yellow-500/40 flex items-center justify-center text-yellow-400 shrink-0 backdrop-blur-sm">
                {b.icon}
              </div>
              <span
                className="text-lg font-bold text-white"
                style={{ textShadow: '0 4px 24px rgba(0,0,0,1), 0 2px 12px rgba(0,0,0,0.95)' }}
              >
                {b.text}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Right-aligned cream card with yellow glow */}
      <div className="flex items-center justify-end min-h-screen p-8 pr-16">
        <motion.div 
          className="cream-glow-card max-w-xl w-full p-10 rounded-3xl"
          initial={{opacity: 0, x: 40}}
          animate={{opacity: 1, x: 0}}
          transition={{delay: 0.3, duration: 0.7}}
        >
          {/* Back to Home */}
          <motion.div 
            className="mb-4"
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            transition={{delay: 0.5}}
          >
            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-black transition group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Back to Home
            </Link>
          </motion.div>

          {/* Logo and Heading */}
          <motion.div 
            className="mb-5"
            initial={{opacity: 0, y: -20}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.55}}
          >
            <div className="flex items-center gap-3 mb-3">
              <img src={jkLogo} alt="JK Tyre" className="w-auto object-contain" style={{ height: '48px' }} />
              <div className="h-6 w-px bg-slate-300" />
              <h1 className="text-2xl font-black text-black">Fleet Login</h1>
            </div>
            <p className="text-sm text-slate-700 font-medium">
              Sign in with your assigned Login ID.
            </p>
          </motion.div>

          {/* Quick Demo Pills */}
          <motion.div 
            className="mb-5 p-3 bg-amber-50 border border-yellow-400/40 rounded-2xl"
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            transition={{delay: 0.6}}
          >
            <span className="text-[11px] uppercase font-bold text-slate-700 tracking-wider mb-2 block">Quick Demo:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setIdentifier('apex_manager'); setPassword('Password123!'); setError(null); }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-gold hover:bg-brand-warm-gold text-black rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5" />
                Fleet
              </button>
              <button
                type="button"
                onClick={() => { setIdentifier('driver1'); setPassword('Password123!'); setError(null); }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-gold hover:bg-brand-warm-gold text-black rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5" />
                Driver
              </button>
              <button
                type="button"
                onClick={() => { setIdentifier('jkadmin'); setPassword('Password123!'); setError(null); }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-gold hover:bg-brand-warm-gold text-black rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin
              </button>
            </div>
          </motion.div>

          {/* Error banner */}
          {error && (
            <motion.div
              className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex flex-col gap-2"
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              {suggestedId && (
                <button
                  type="button"
                  onClick={handleUseSuggested}
                  className="mt-1 self-start px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-bold text-[11px] transition cursor-pointer"
                >
                  Use Assigned ID: {suggestedId}
                </button>
              )}
            </motion.div>
          )}

          {/* Form */}
          <motion.form 
            onSubmit={handleSubmit} 
            className="space-y-4"
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            transition={{delay: 0.65}}
          >
            {/* Login ID */}
            <div>
              <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2">
                Login ID
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="fleet.manager@translogistics.com"
                  required
                  autoComplete="username"
                  className="w-full bg-white border-2 border-yellow-400/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-black placeholder-slate-500 focus:outline-none focus:border-yellow-400 transition font-medium"
                />
              </div>
              <p className="text-[11px] text-slate-600 mt-1.5 leading-snug">
                Fleet Managers and Drivers: Sign in with your assigned Login ID. Only Super Admin uses email.
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold text-slate-800 mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  className="w-full bg-white border-2 border-yellow-400/50 rounded-xl pl-10 pr-10 py-2.5 text-sm text-black placeholder-slate-500 focus:outline-none focus:border-yellow-400 transition"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-black cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 bg-brand-gold hover:bg-brand-warm-gold text-black font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Signing In…' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.form>

          {/* Register link */}
          <motion.p
            className="mt-5 text-center text-xs text-slate-700"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.75, duration: 0.45 }}
          >
            Need an account?{' '}
            <Link to="/register" className="text-black underline font-bold hover:text-yellow-600 transition">
              Register as Fleet Manager or Driver
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
};
