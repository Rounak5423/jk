import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Fleet } from '../../types';
import {
  Building2,
  Building,
  Search,
  Truck,
  Disc,
  AlertTriangle,
  ArrowRight,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  X,
} from 'lucide-react';

export const MyFleetsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, activeFleetId, setActiveFleet } = useAuthStore();
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Add Fleet Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFleetName, setNewFleetName] = useState('');
  const [newRegNo, setNewRegNo] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newCity, setNewCity] = useState('New Delhi');
  const [newAddress, setNewAddress] = useState('');
  const [newStatus, setNewStatus] = useState('ACTIVE');
  const [setAsActive, setSetAsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const resetAddForm = () => {
    setNewFleetName('');
    setNewRegNo('');
    setNewContactName(user?.full_name || '');
    setNewContactEmail(user?.email || '');
    setNewContactPhone(user?.phone_number || '');
    setNewCity('New Delhi');
    setNewAddress('');
    setNewStatus('ACTIVE');
    setSetAsActive(true);
    setFormError(null);
    setFormSuccess(null);
  };

  const fetchFleets = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/fleets/my-fleets', { params });
      setFleets(res.data.fleets || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load authorized fleets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleets();
  }, [search, statusFilter]);

  const handleSelectFleet = (fleet: Fleet) => {
    setActiveFleet(fleet.id, fleet.name);
    navigate('/dashboard');
  };

  const handleAddFleetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const fName = newFleetName.trim();
    if (!fName) {
      setFormError('Fleet company name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        name: fName,
        registration_no: newRegNo.trim() || undefined,
        contact_name: newContactName.trim() || user?.full_name || 'Fleet Operations Lead',
        contact_email: newContactEmail.trim() || undefined,
        contact_phone: newContactPhone.trim() || undefined,
        city: newCity.trim() || 'New Delhi',
        address: newAddress.trim() || undefined,
        status: newStatus,
      };

      const res = await api.post('/fleets', payload);
      const createdFleet = res.data;

      setFormSuccess(`Fleet "${createdFleet.name}" registered successfully!`);
      if (setAsActive) {
        setActiveFleet(createdFleet.id, createdFleet.name);
      }
      await fetchFleets();

      setTimeout(() => {
        setShowAddModal(false);
        resetAddForm();
      }, 1000);
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to register new fleet.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-graphite tracking-tight">My Authorized Fleets</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
              Fleet Portfolio
            </span>
          </div>
          <p className="text-xs text-secondary mt-1">
            Commercial fleets and subsidiaries assigned to your account ({user?.email}).
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fleet, city, or reg..."
              className="bg-white border border-bordergray rounded-xl pl-9 pr-4 py-2 text-xs text-graphite placeholder-secondary focus:outline-none focus:border-fleet focus:ring-1 focus:ring-fleet shadow-sm"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-bordergray rounded-xl px-3 py-2 text-xs text-graphite focus:outline-none focus:border-fleet shadow-sm"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          <button
            onClick={fetchFleets}
            className="p-2 bg-white border border-bordergray rounded-xl text-secondary hover:text-graphite shadow-sm"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              resetAddForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold rounded-xl text-xs shadow-md shadow-yellow-400/20 transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Fleet
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Fleets Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-bordergray p-6 shadow-sm animate-pulse h-64" />
          ))}
        </div>
      ) : fleets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-bordergray p-12 text-center shadow-sm space-y-4">
          <Building2 className="w-12 h-12 text-secondary/40 mx-auto mb-2" />
          <div>
            <h3 className="text-base font-bold text-graphite">No Fleets Found</h3>
            <p className="text-xs text-secondary mt-1 max-w-md mx-auto">
              {search
                ? `No authorized fleets match "${search}". Try broadening your search query.`
                : 'There are currently no fleets authorized for your user credentials.'}
            </p>
          </div>
          {!search && (
            <button
              onClick={() => {
                resetAddForm();
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold rounded-xl text-xs shadow-md shadow-yellow-400/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add First Fleet
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fleets.map((fleet) => {
            const isActive = activeFleetId === fleet.id;
            const health = fleet.health_summary || { healthy: 0, warning: 0, critical: 0 };
            const totalHealthCount = health.healthy + health.warning + health.critical;

            return (
              <div
                key={fleet.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm flex flex-col ${
                  isActive
                    ? 'border-fleet ring-2 ring-fleet/30 shadow-md'
                    : 'border-bordergray hover:border-slate-300 hover:shadow'
                }`}
              >
                {/* Card Top */}
                <div className="p-6 pb-4 border-b border-bordergray/60">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-graphite">
                          Active Selection
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          fleet.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {fleet.status}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-graphite tracking-tight line-clamp-1">{fleet.name}</h3>
                  <div className="text-[11px] text-secondary flex items-center gap-1 mt-0.5">
                    <span>Reg: {fleet.registration_no || 'Unassigned'}</span>
                    {fleet.city && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-secondary/70 inline" />
                          {fleet.city}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="p-6 py-4 grid grid-cols-3 gap-2 border-b border-bordergray/60 bg-softgrey/30">
                  <div className="text-center p-2 rounded-xl bg-white border border-bordergray/80">
                    <div className="flex items-center justify-center text-secondary mb-1">
                      <Truck className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-base font-black text-graphite">{fleet.vehicle_count || 0}</div>
                    <div className="text-[10px] text-secondary font-medium">Vehicles</div>
                  </div>

                  <div className="text-center p-2 rounded-xl bg-white border border-bordergray/80">
                    <div className="flex items-center justify-center text-secondary mb-1">
                      <Disc className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-base font-black text-graphite">{fleet.fitted_tyres_count || 0}</div>
                    <div className="text-[10px] text-secondary font-medium">Fitted Tyres</div>
                  </div>

                  <div className="text-center p-2 rounded-xl bg-white border border-bordergray/80">
                    <div className="flex items-center justify-center text-amber-600 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-base font-black text-graphite">{fleet.active_alerts_count || 0}</div>
                    <div className="text-[10px] text-secondary font-medium">Active Alerts</div>
                  </div>
                </div>

                {/* Health Summary */}
                <div className="p-6 py-4 border-b border-bordergray/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold text-secondary">Tyre Health Overview</span>
                    <span className="text-[10px] font-bold text-graphite">{totalHealthCount} Evaluated</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {health.healthy} Healthy
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      {health.warning} Warning
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      {health.critical} Critical
                    </span>
                  </div>
                </div>

                {/* Contact info & Action */}
                <div className="p-6 pt-4 mt-auto space-y-3">
                  <div className="space-y-1 text-[11px] text-secondary">
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3 h-3 text-secondary/60 shrink-0" />
                      <span className="truncate">{fleet.contact_email}</span>
                    </div>
                    {fleet.contact_phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-secondary/60 shrink-0" />
                        <span>{fleet.contact_phone}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleSelectFleet(fleet)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm ${
                      isActive
                        ? 'bg-graphite text-white hover:bg-black'
                        : 'bg-fleet hover:bg-yellow-400 text-graphite'
                    }`}
                  >
                    <span>{isActive ? 'Manage Current Fleet' : 'Open Fleet'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Register New Commercial Fleet Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center font-black text-slate-900 text-sm shadow">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Register New Commercial Fleet
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Corporate logistics portfolio, operational hub &amp; contact credentials
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddFleetSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Company Name & Registration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fleet / Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newFleetName}
                    onChange={(e) => setNewFleetName(e.target.value)}
                    placeholder="e.g. Apex Trans Logistics Pvt Ltd"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-yellow-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GSTIN / Reg No
                  </label>
                  <input
                    type="text"
                    value={newRegNo}
                    onChange={(e) => setNewRegNo(e.target.value.toUpperCase())}
                    placeholder="e.g. 07AAACA1234F1Z5"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-yellow-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Operational Hub & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Operating Hub City
                  </label>
                  <select
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-yellow-500 focus:bg-white"
                  >
                    <option value="New Delhi">New Delhi (National Capital Region)</option>
                    <option value="Gurugram">Gurugram (Haryana)</option>
                    <option value="Pune">Pune (Maharashtra)</option>
                    <option value="Mumbai">Mumbai (Maharashtra)</option>
                    <option value="Bengaluru">Bengaluru (Karnataka)</option>
                    <option value="Chennai">Chennai (Tamil Nadu)</option>
                    <option value="Kolkata">Kolkata (West Bengal)</option>
                    <option value="Hyderabad">Hyderabad (Telangana)</option>
                    <option value="Ahmedabad">Ahmedabad (Gujarat)</option>
                    <option value="Jaipur">Jaipur (Rajasthan)</option>
                    <option value="Indore">Indore (Madhya Pradesh)</option>
                    <option value="Chandigarh">Chandigarh (Punjab/Haryana)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-yellow-500 focus:bg-white"
                  >
                    <option value="ACTIVE">Active (Operational)</option>
                    <option value="PENDING">Pending (Onboarding)</option>
                  </select>
                </div>
              </div>

              {/* Hub Depot Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Depot / Headquarters Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="e.g. Sector 18, Transport Nagar Logistics Terminal"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-yellow-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Primary Contact Name, Email, Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Contact Name
                  </label>
                  <input
                    type="text"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-yellow-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    placeholder="e.g. ops@apextrans.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-yellow-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    placeholder="e.g. +91 98110 54321"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-yellow-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Checkbox: switch to this fleet */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={setAsActive}
                    onChange={(e) => setSetAsActive(e.target.checked)}
                    className="w-4 h-4 text-yellow-500 rounded border-slate-300 focus:ring-yellow-400"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Set as my active operational fleet immediately
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-slate-900 font-bold rounded-xl text-xs shadow-md shadow-yellow-400/20 transition cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Registering...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Register Fleet
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
