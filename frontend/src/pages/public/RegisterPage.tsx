import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import {
  Building2, User, Lock, Phone, MapPin, Mail,
  AlertCircle, ArrowRight, ArrowLeft,
  Eye, EyeOff,
  CheckCircle2, Copy, Check, KeyRound,
} from 'lucide-react';
import { motion } from 'framer-motion';
import jkLogo from '../../assets/jk-logo.png';

/* ── animation helper ── */
const up = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.55, ease: [0.34, 1.2, 0.64, 1] as any },
});

/* ═══════════════════════════════════════════════════════════════════════ */
export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  // Fleet fields
  const [companyName, setCompanyName] = useState('');
  const [registrationNo, setRegistrationNo] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('New Delhi');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Success modal
  const [registeredData, setRegisteredData] = useState<{
    login_id: string;
    role: string;
    token: string;
    user: any;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    if (registeredData?.login_id) {
      navigator.clipboard.writeText(registeredData.login_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleProceed = () => {
    if (registeredData) {
      login(registeredData.token, registeredData.user);
      navigate('/my-fleets');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!companyName.trim()) { setError('Company name is required'); return; }
    if (!contactName.trim()) { setError('Full name is required'); return; }

    setLoading(true);
    try {
      const payload: any = {
        role: 'FLEET_MANAGER',
        company_name: companyName.trim(),
        registration_no: registrationNo.trim() || undefined,
        contact_name: contactName.trim(),
        phone: contactPhone.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        password,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
      };

      const res = await api.post('/auth/register', payload);
      setRegisteredData({
        login_id: res.data.login_id,
        role: res.data.role,
        token: res.data.token,
        user: res.data.user,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  /* shared input class */
  const inp = (hasIcon = true) =>
    `w-full bg-white border border-slate-200 rounded-xl ${hasIcon ? 'pl-9' : 'px-4'} pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition shadow-sm`;

  return (
    <div className="h-screen w-screen overflow-hidden flex">

      {/* ══ SUCCESS MODAL ═══════════════════════════════════════════════ */}
      {registeredData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center"
          >
            <div className="w-14 h-14 mx-auto mb-3 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Registration Successful!</h2>
            <p className="text-xs text-slate-500 mt-0.5">Your Fleet Owner account is now registered.</p>

            <div className="my-5 p-4 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-yellow-400 text-center">
              <div className="text-[10px] font-extrabold text-amber-800 uppercase tracking-widest mb-1">Your Official Login ID</div>
              <div className="text-2xl font-black font-mono text-slate-900 tracking-wider py-1 select-all">{registeredData.login_id}</div>
              <div className="mt-3 flex justify-center">
                <button type="button" onClick={handleCopyId}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-slate-900 text-xs font-black transition">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-900" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy Login ID'}
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-600 mb-5">
              <p className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-600" /> Sign In Using This Login ID:
              </p>
              <p className="text-[11px] leading-relaxed">
                Use <span className="font-mono font-bold text-slate-900 bg-slate-200 px-1 rounded">{registeredData.login_id}</span> along with your password to sign in.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button type="button" onClick={handleProceed}
                className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-black rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-md">
                Proceed to Fleet Dashboard <ArrowRight className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => navigate(`/login?login_id=${registeredData.login_id}`)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition">
                Go to Sign In Screen
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ══ LEFT PANEL — dark navy + video ══════════════════════════════ */}
      <div
        className="hidden lg:flex flex-col w-[48%] h-full relative overflow-hidden"
        style={{ background: '#000000' }}
      >
        {/* Tyre video section — bottom of left panel */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{ width: '110%', height: '62%' }}>
          <video
            src="https://tmaas.in/assets/images/treelVideo.mp4"
            autoPlay muted loop playsInline
            style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center bottom' }}
          />
        </div>

        {/* Full-panel gradient overlay — fades dark nav into video */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 1,
            background: 'linear-gradient(to bottom, #071426 0%, #071426 30%, rgba(7,20,38,0.96) 45%, rgba(7,20,38,0.80) 55%, rgba(4,10,20,0.55) 65%, rgba(2,5,12,0.25) 75%, rgba(0,0,0,0.05) 85%, transparent 100%)',
          }}
        />

        {/* Content — z:2 above overlay */}
        <div className="relative flex flex-col h-full px-10 py-8" style={{ zIndex: 2 }}>

          {/* Logo */}
          <motion.div {...up(0.1)} className="flex items-center gap-3">
            <img src={jkLogo} alt="JK Tyre" className="w-auto object-contain" style={{ height: '72px' }} />
            <div>
              <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-[0.22em]">TYRE HEALTH INDEX</span>
            </div>
          </motion.div>

          {/* Tagline — shifted into upper-middle zone */}
          <div className="mt-16 mb-auto">
            <motion.h2
              className="text-5xl font-black text-white leading-tight mb-2"
              style={{ textShadow: '0 2px 24px rgba(0,0,0,0.9)' }}
              {...up(0.35)}
            >
              Smarter Tyres.
            </motion.h2>
            <motion.h2
              className="text-5xl font-black text-yellow-400 leading-tight mb-6"
              style={{ textShadow: '0 2px 20px rgba(234,179,8,0.5)' }}
              {...up(0.5)}
            >
              Safer Journeys.
            </motion.h2>

            {/* Yellow divider */}
            <motion.div className="w-16 h-1 rounded-full bg-yellow-400 mb-5" {...up(0.6)} />

            <motion.p className="text-sm text-slate-300 leading-relaxed max-w-xs" {...up(0.7)}>
              Real-time tyre health intelligence, predictive alerts, and fleet analytics — engineered for commercial mobility.
            </motion.p>
          </div>
        </div>
      </div>

      {/* ══ RIGHT PANEL — yellow gradient form ══════════════════════════════════ */}
      <div className="flex flex-col flex-1 h-full overflow-y-auto px-8 py-7" style={{ background: 'radial-gradient(ellipse at top left, #ffe066 0%, #ffd700 25%, #fff176 50%, #fef08a 70%, #ffd000 100%)', scrollbarWidth: 'none' }}>

        <div className="max-w-[500px] mx-auto w-full flex flex-col min-h-full">

          {/* Back */}
          <motion.div {...up(0.05)} className="mb-4">
            <Link to="/"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700 transition group w-fit">
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Back to Home
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div className="mb-5" {...up(0.12)}>
            <div className="flex items-center gap-3 mb-3">
              <img src={jkLogo} alt="JK Tyre" className="w-auto object-contain" style={{ height: '72px' }} />
              <div className="h-5 w-px bg-slate-200" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">FLEET ENROLMENT</span>
            </div>
            <h1 className="text-[1.75rem] font-black text-black tracking-tight">Fleet Registration</h1>
            <p className="text-xs text-blue-600 mt-0.5">Register your transport fleet. A unique Login ID will be generated for your account.</p>
          </motion.div>

          {/* Error */}
          {error && (
            <motion.div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2"
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </motion.div>
          )}

          {/* Form */}
          <motion.form onSubmit={handleSubmit} className="flex-1" {...up(0.2)}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4">

              {/* Company Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Company Name *</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                    placeholder="Apex Trans Logistics" required className={inp()} />
                </div>
              </div>

              {/* Registration No */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Registration No.</label>
                <input type="text" value={registrationNo} onChange={e => setRegistrationNo(e.target.value)}
                  placeholder="DL-TRANS-2024-889"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition shadow-sm" />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Full Name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" value={contactName} onChange={e => setContactName(e.target.value)}
                    placeholder="Operations Head" required className={inp()} />
                </div>
              </div>

              {/* Contact Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Contact Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)}
                    placeholder="+91 98100 00000" className={inp()} />
                </div>
              </div>

              {/* Official Email */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Official Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                    placeholder="ops@yourfleet.com" className={inp()} />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Min 6 characters" required minLength={6}
                    className={`${inp()} pr-10`} />
                  <button type="button" onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Operating Depot/Address — full width */}
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Operating Depot / Address</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                    placeholder="Logistics Park / Depot address"
                    className={inp()} />
                </div>
              </div>

            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(234,179,8,0.35)' }}
              whileTap={{ scale: 0.97 }}
              className="w-full mt-6 py-3.5 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-black rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-yellow-400/20"
            >
              {loading ? 'Registering…' : 'Register Transport Fleet'}
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.form>

          {/* Sign in link */}
          <motion.p
            className="mt-4 text-center text-xs text-slate-500"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.65, duration: 0.45 }}
          >
            Already registered?{' '}
            <Link to="/login" className="text-yellow-600 hover:text-yellow-500 font-bold transition">
              Sign In
            </Link>
          </motion.p>
        </div>
      </div>
    </div>
  );
};
