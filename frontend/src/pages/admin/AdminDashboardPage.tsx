import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  Shield,
  Building2,
  Users,
  ScrollText,
  Activity,
  AlertTriangle,
  Disc,
  Truck,
  Plus,
  X,
  MapPin,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'FLEETS' | 'USERS' | 'AUDIT'>('FLEETS');

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
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const resetAddForm = () => {
    setNewFleetName('');
    setNewRegNo('');
    setNewContactName('');
    setNewContactEmail('');
    setNewContactPhone('');
    setNewCity('New Delhi');
    setNewAddress('');
    setNewStatus('ACTIVE');
    setFormError(null);
    setFormSuccess(null);
  };

  const createFleetMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/admin/fleets', payload);
      return res.data;
    },
    onSuccess: (newFleet) => {
      queryClient.invalidateQueries({ queryKey: ['admin-fleets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setFormSuccess(`Fleet "${newFleet.name}" registered successfully!`);
      setTimeout(() => {
        setShowAddModal(false);
        resetAddForm();
      }, 1000);
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error || 'Failed to register fleet.');
    },
  });

  const handleAddFleetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const fName = newFleetName.trim();
    if (!fName) {
      setFormError('Fleet company name is required.');
      return;
    }

    createFleetMutation.mutate({
      name: fName,
      registration_no: newRegNo.trim() || undefined,
      contact_name: newContactName.trim() || 'Operations Lead',
      contact_email: newContactEmail.trim() || undefined,
      contact_phone: newContactPhone.trim() || undefined,
      city: newCity.trim() || 'New Delhi',
      address: newAddress.trim() || undefined,
      status: newStatus,
    });
  };

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/platform-stats');
      return res.data;
    },
  });

  const { data: fleets } = useQuery({
    queryKey: ['admin-fleets'],
    queryFn: async () => {
      const res = await api.get('/admin/fleets');
      return res.data;
    },
    enabled: activeTab === 'FLEETS',
  });

  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data;
    },
    enabled: activeTab === 'USERS',
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const res = await api.get('/admin/audit-logs');
      return res.data;
    },
    enabled: activeTab === 'AUDIT',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-red-600 uppercase tracking-wider mb-1">
          <Shield className="w-4 h-4" /> JK Tyre Enterprise Administration
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Platform Governance &amp; Multi-Tenant Audit</h1>
        <p className="text-xs text-[#5B6068] mt-0.5">
          Authorized cross-fleet oversight, multi-tenant fleet isolation, and immutable audit logs.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <span className="text-xs text-[#5B6068] block mb-1">Registered Fleets</span>
          <span className="text-2xl font-black text-slate-900">{stats?.total_fleets || 0}</span>
          <span className="text-[11px] text-[#5B6068] block mt-1">Active transport operators</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <span className="text-xs text-[#5B6068] block mb-1">Total Fleet Vehicles</span>
          <span className="text-2xl font-black text-slate-900">{stats?.total_vehicles || 0}</span>
          <span className="text-[11px] text-[#5B6068] block mt-1">Across all operators</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <span className="text-xs text-[#5B6068] block mb-1">Tracked JK Tyres</span>
          <span className="text-2xl font-black text-slate-900">{stats?.total_tyres || 0}</span>
          <span className="text-[11px] text-[#5B6068] block mt-1">Permanent serial IDs</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <span className="text-xs text-[#5B6068] block mb-1">Active Cross-Fleet Alerts</span>
          <span className={`text-2xl font-black ${(stats?.active_alerts || 0) > 0 ? 'text-[#E8770E]' : 'text-slate-900'}`}>
            {stats?.active_alerts || 0}
          </span>
          <span className="text-[11px] text-[#5B6068] block mt-1">Pending depot attention</span>
        </div>
      </div>

      {/* Navigation Tabs & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('FLEETS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'FLEETS' ? 'bg-[#14161A] text-white' : 'text-[#5B6068] hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" /> Transport Fleets ({fleets?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('USERS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'USERS' ? 'bg-[#14161A] text-white' : 'text-[#5B6068] hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" /> Platform Users ({users?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'AUDIT' ? 'bg-[#14161A] text-white' : 'text-[#5B6068] hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ScrollText className="w-4 h-4" /> Security Audit Trail ({auditLogs?.length || 0})
          </button>
        </div>

        {activeTab === 'FLEETS' && (
          <button
            onClick={() => {
              resetAddForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#FFC800] hover:bg-[#e6b400] text-black font-bold rounded-xl text-xs shadow-sm transition cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Fleet
          </button>
        )}
      </div>

      {/* Tab Panels */}
      {activeTab === 'FLEETS' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[#5B6068] font-semibold bg-slate-50">
                <th className="py-3.5 px-6">Company Name</th>
                <th className="py-3.5 px-4">Registration</th>
                <th className="py-3.5 px-4">Primary Contact</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Vehicles</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {fleets?.map((f: any) => (
                <tr key={f.id} className="hover:bg-slate-50 transition">
                  <td className="py-4 px-6 font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#5B6068]" />
                    {f.name}
                  </td>
                  <td className="py-4 px-4 font-mono">{f.registration_no || '—'}</td>
                  <td className="py-4 px-4">{f.contact_name}</td>
                  <td className="py-4 px-4 font-mono text-[#5B6068]">{f.contact_email}</td>
                  <td className="py-4 px-4 font-bold text-slate-900">{f.vehicle_count}</td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                      {f.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'USERS' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[#5B6068] font-semibold bg-slate-50">
                <th className="py-3.5 px-6">Full Name</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Assigned Role</th>
                <th className="py-3.5 px-4">Fleet Scope</th>
                <th className="py-3.5 px-4">License / ID</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {users?.map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-50 transition">
                  <td className="py-4 px-6 font-bold text-slate-900">{u.full_name}</td>
                  <td className="py-4 px-4 font-mono text-slate-700">{u.email}</td>
                  <td className="py-4 px-4 font-semibold text-slate-900">{u.role}</td>
                  <td className="py-4 px-4 text-[#5B6068]">{u.fleet_name || 'Global Headquarters'}</td>
                  <td className="py-4 px-4 font-mono">{u.driver_license_no || '—'}</td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                      {u.is_active ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'AUDIT' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[#5B6068] font-semibold bg-slate-50">
                <th className="py-3.5 px-6">Timestamp</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Operator</th>
                <th className="py-3.5 px-4">Resource</th>
                <th className="py-3.5 px-4">IP Address</th>
                <th className="py-3.5 px-4">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {auditLogs?.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50 transition">
                  <td className="py-4 px-6 text-[#5B6068] font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-4 px-4 font-bold text-slate-900">{log.action}</td>
                  <td className="py-4 px-4">{log.user_name}</td>
                  <td className="py-4 px-4 font-mono text-[#5B6068]">
                    {log.resource_type} ({log.resource_id?.slice(0, 8)})
                  </td>
                  <td className="py-4 px-4 font-mono text-[#5B6068]">{log.ip_address}</td>
                  <td className="py-4 px-4 font-mono text-[11px] text-[#5B6068] max-w-xs truncate">
                    {JSON.stringify(log.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Admin Register New Commercial Fleet Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto text-left">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#14161A] flex items-center justify-center font-bold text-white text-sm shadow">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Register New Transport Fleet
                  </h2>
                  <p className="text-[11px] text-[#5B6068]">
                    Administrative corporate onboarding &amp; credentials
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
            <form onSubmit={handleAddFleetSubmit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Company Name & Registration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Fleet / Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newFleetName}
                    onChange={(e) => setNewFleetName(e.target.value)}
                    placeholder="e.g. Bharat Freightlines Pvt Ltd"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-yellow-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    GSTIN / Reg No
                  </label>
                  <input
                    type="text"
                    value={newRegNo}
                    onChange={(e) => setNewRegNo(e.target.value.toUpperCase())}
                    placeholder="e.g. 07AAACA1234F1Z5"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-yellow-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Operational Hub & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Operating Hub City
                  </label>
                  <select
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-yellow-500 focus:bg-white"
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
                  <label className="block font-semibold text-slate-700 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-yellow-500 focus:bg-white"
                  >
                    <option value="ACTIVE">Active (Operational)</option>
                    <option value="PENDING">Pending (Onboarding)</option>
                  </select>
                </div>
              </div>

              {/* Hub Depot Address */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Depot / Headquarters Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="e.g. Sector 18, Transport Nagar Logistics Terminal"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-yellow-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Primary Contact Name, Email, Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Primary Contact Name
                  </label>
                  <input
                    type="text"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-yellow-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    placeholder="e.g. ops@bharatfreight.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-yellow-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    placeholder="e.g. +91 98110 54321"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-yellow-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createFleetMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#FFC800] hover:bg-[#e6b400] disabled:opacity-50 text-black font-bold rounded-xl shadow-sm transition cursor-pointer"
                >
                  {createFleetMutation.isPending ? (
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
