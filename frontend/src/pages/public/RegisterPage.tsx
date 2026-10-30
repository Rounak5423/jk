import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import {
  Building2, User, Lock, Phone, MapPin, Truck,
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

interface PublicFleet {
  id: string;
  name: string;
  city?: string;
}

/* ═══════════════════════════════════════════════════════════════════════ */
export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  // Role selector: FLEET_MANAGER or DRIVER (Super Admin is seeded/internal only)
  const [role, setRole] = useState<'FLEET_MANAGER' | 'DRIVER'>('FLEET_MANAGER');

  // Fleet fields (No email!)
  const [companyName, setCompanyName] = useState('');
  const [registrationNo, setRegistrationNo] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('New Delhi');

  // Driver fields (No email!)
  const [driverName, setDriverName] = useState('');
  const [driverLicenseNo, setDriverLicenseNo] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [selectedFleetId, setSelectedFleetId] = useState('');
  const [publicFleets, setPublicFleets] = useState<PublicFleet[]>([]);

  // Common fields
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Success modal with generated ID
  const [registeredData, setRegisteredData] = useState<{
    login_id: string;
    role: string;
    token: string;
    user: any;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch active fleets for driver assignment dropdown
  useEffect(() => {
    api.get('/auth/public-fleets')
      .then(res => {
        if (Array.isArray(res.data)) {
          setPublicFleets(res.data);
          if (res.data.length > 0) {
            setSelectedFleetId(res.data[0].id);
          }
        }
      })
      .catch(() => {
        // Fallback gracefully if public fleet list is empty
      });
  }, []);

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
      if (registeredData.role === 'DRIVER') {
        navigate('/driver');
      } else {
        navigate('/my-fleets');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (role === 'DRIVER') {
        if (!driverName.trim()) { setError('Driver full name is required'); setLoading(false); return; }
        if (!driverLicenseNo.trim()) { setError('Driving license number is required'); setLoading(false); return; }

        const payload = {
          role: 'DRIVER',
          full_name: driverName.trim(),
          driver_license_no: driverLicenseNo.trim(),
          phone: driverPhone.trim() || undefined,
          fleet_id: selectedFleetId || undefined,
          password,
        };

        const res = await api.post('/auth/register', payload);
        setRegisteredData({
          login_id: res.data.login_id,
          role: res.data.role,
          token: res.data.token,
          user: res.data.user,
        });
      } else {
        if (!companyName.trim()) { setError('Company name is required'); setLoading(false); return; }
        if (!contactName.trim()) { setError('Full name of contact person is required'); setLoading(false); return; }

        const payload = {
          role: 'FLEET_MANAGER',
          company_name: companyName.trim(),
          registration_no: registrationNo.trim() || undefined,
          contact_name: contactName.trim(),
          phone: contactPhone.trim() || undefined,
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
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  /* shared input class */
  const inp = (hasIcon = true) =>
    `w-full bg-slate-50 border border-slate-200 rounded-xl ${hasIcon ? 'pl-9' : 'px-4'} pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition`;

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
            <p className="text-xs text-[#5B6068] mt-0.5">
              {registeredData.role === 'DRIVER'
                ? 'Your Commercial Driver account is now active.'
                : 'Your Transport Fleet account is now registered.'}
            </p>

            <div className="my-5 p-4 rounded-xl bg-slate-50 border-2 border-slate-200 text-center">
              <div className="text-[10px] font-extrabold text-[#5B6068] uppercase tracking-widest mb-1">
                Your Official Login ID
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 tracking-wider py-1 select-all">
                {registeredData.login_id}
              </div>
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#FFC800] hover:bg-[#e6b400] text-black text-xs font-bold transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-900" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy Login ID'}
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-600 mb-5">
              <p className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#5B6068]" /> Sign In Using This Login ID:
              </p>
              <p className="text-[11px] text-[#5B6068] leading-relaxed">
                Use <span className="font-mono font-bold text-slate-900 bg-slate-200 px-1 rounded">{registeredData.login_id}</span> along with your password to sign in. No email is required.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleProceed}
                className="w-full py-3 bg-[#FFC800] hover:bg-[#e6b400] text-black font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                {registeredData.role === 'DRIVER' ? 'Proceed to Driver Console' : 'Proceed to Fleet Dashboard'}{' '}
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate(`/login?login_id=${registeredData.login_id}`)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
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

        {/* Full-panel gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 1,
            background: 'linear-gradient(to bottom, #071426 0%, #071426 30%, rgba(7,20,38,0.96) 45%, rgba(7,20,38,0.80) 55%, rgba(4,10,20,0.55) 65%, rgba(2,5,12,0.25) 75%, rgba(0,0,0,0.05) 85%, transparent 100%)',
          }}
        />

        {/* Content */}
        <div className="relative flex flex-col h-full px-10 py-8" style={{ zIndex: 2 }}>
          {/* Logo */}
          <motion.div {...up(0.1)} className="flex items-center gap-3">
            <img src={jkLogo} alt="JK Tyre" className="w-auto object-contain" style={{ height: '72px' }} />
            <div>
              <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-[0.22em]">TYRE HEALTH INDEX</span>
            </div>
          </motion.div>

          {/* Tagline */}
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

            <motion.div className="w-16 h-1 rounded-full bg-yellow-400 mb-5" {...up(0.6)} />

            <motion.p className="text-sm text-slate-300 leading-relaxed max-w-xs" {...up(0.7)}>
              Real-time tyre health intelligence, predictive alerts, and fleet analytics — engineered for commercial mobility.
            </motion.p>
          </div>
        </div>
      </div>

      {/* ══ RIGHT PANEL — neutral #F4F3EF canvas with white card ══════════════════ */}
      <div className="flex flex-col flex-1 h-full overflow-y-auto px-6 py-6 bg-[#F4F3EF]" style={{ scrollbarWidth: 'none' }}>

        <div className="max-w-[540px] mx-auto w-full flex flex-col bg-white border border-slate-200 p-8 rounded-3xl shadow-sm my-auto">

          {/* Back */}
          <motion.div {...up(0.05)} className="mb-3">
            <Link to="/"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#5B6068] hover:text-slate-900 transition group w-fit">
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Back to Home
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div className="mb-4" {...up(0.12)}>
            <div className="flex items-center gap-3 mb-2">
              <img src={jkLogo} alt="JK Tyre" className="w-auto object-contain" style={{ height: '48px' }} />
              <div className="h-5 w-px bg-slate-200" />
              <span className="text-[10px] font-bold text-[#5B6068] uppercase tracking-widest">
                {role === 'DRIVER' ? 'DRIVER ENROLMENT' : 'FLEET ENROLMENT'}
              </span>
            </div>
            <h1 className="text-[1.65rem] font-black text-slate-900 tracking-tight">
              {role === 'DRIVER' ? 'Commercial Driver Registration' : 'Fleet Registration'}
            </h1>
            <p className="text-xs text-[#5B6068] mt-0.5">
              {role === 'DRIVER'
                ? 'Sign up as a commercial driver. A unique Driver Login ID (JK-DRV-XXXXX) will be generated.'
                : 'Register your transport fleet. A unique Fleet Login ID (JK-FLT-XXXXX) will be generated.'}
            </p>
          </motion.div>

          {/* Role Switcher Tabs */}
          <motion.div className="mb-4 p-1 bg-slate-100 rounded-xl flex items-center gap-1" {...up(0.15)}>
            <button
              type="button"
              onClick={() => { setRole('FLEET_MANAGER'); setError(null); }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                role === 'FLEET_MANAGER'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-[#5B6068] hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Fleet Manager
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                JK-FLT
              </span>
            </button>
            <button
              type="button"
              onClick={() => { setRole('DRIVER'); setError(null); }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                role === 'DRIVER'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-[#5B6068] hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Commercial Driver
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                JK-DRV
              </span>
            </button>
          </motion.div>

          {/* Error */}
          {error && (
            <motion.div className="mb-3.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2"
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </motion.div>
          )}

          {/* Form */}
          <motion.form onSubmit={handleSubmit} className="flex-1" {...up(0.2)}>
            {role === 'FLEET_MANAGER' ? (
              /* ── Fleet Manager Fields (ZERO EMAIL) ── */
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {/* Company Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">Company Name *</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-[#5B6068] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                      placeholder="Apex Trans Logistics" required className={inp()} />
                  </div>
                </div>

                {/* Registration No */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">Registration No.</label>
                  <input type="text" value={registrationNo} onChange={e => setRegistrationNo(e.target.value)}
                    placeholder="DL-TRANS-2024-889"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition" />
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">Contact Person Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#5B6068] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" value={contactName} onChange={e => setContactName(e.target.value)}
                      placeholder="Rajesh Sharma" required className={inp()} />
                  </div>
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">Contact Phone</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#5B6068] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)}
                      placeholder="+91 98100 00000" className={inp()} />
                  </div>
                </div>

                {/* City */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">Depot City</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#5B6068] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" value={city} onChange={e => setCity(e.target.value)}
                      placeholder="New Delhi" className={inp()} />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#5B6068] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Min 6 characters" required minLength={6}
                      className={`${inp()} pr-9`} />
                    <button type="button" onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer">
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Operating Depot/Address — full width */}
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">Operating Depot / Address</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#5B6068] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                      placeholder="Logistics Park / Depot address"
                      className={inp()} />
                  </div>
                </div>
              </div>
            ) : (
              /* ── Driver Fields (ZERO EMAIL) ── */
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {/* Driver Full Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">Driver Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#5B6068] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" value={driverName} onChange={e => setDriverName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar" required className={inp()} />
                  </div>
                </div>

                {/* Driving License No */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">Commercial Driving License *</label>
                  <input type="text" value={driverLicenseNo} onChange={e => setDriverLicenseNo(e.target.value)}
                    placeholder="DL-042019000101" required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition" />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">Contact Phone</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#5B6068] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="tel" value={driverPhone} onChange={e => setDriverPhone(e.target.value)}
                      placeholder="+91 98111 00000" className={inp()} />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#5B6068] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Min 6 characters" required minLength={6}
                      className={`${inp()} pr-9`} />
                    <button type="button" onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer">
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Assigned Transport Fleet */}
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">Assigned Transport Fleet</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-[#5B6068] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={selectedFleetId}
                      onChange={e => setSelectedFleetId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-400 transition"
                    >
                      {publicFleets.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.name} {f.city ? `(${f.city})` : ''}
                        </option>
                      ))}
                      {publicFleets.length === 0 && (
                        <option value="">Default Fleet Assignment</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full mt-5 py-2.5 bg-[#FFC800] hover:bg-[#e6b400] text-black font-black rounded-xl text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm cursor-pointer"
            >
              {loading
                ? 'Registering & Generating Login ID…'
                : role === 'DRIVER'
                ? 'Register Driver & Generate Login ID'
                : 'Register Fleet & Generate Login ID'}
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.form>

          {/* Sign in link */}
          <motion.p
            className="mt-4 text-center text-xs text-[#5B6068]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.65, duration: 0.45 }}
          >
            Already have an assigned Login ID?{' '}
            <Link to="/login" className="text-slate-900 underline font-bold transition">
              Sign In
            </Link>
          </motion.p>
        </div>
      </div>
    </div>
  );
};
