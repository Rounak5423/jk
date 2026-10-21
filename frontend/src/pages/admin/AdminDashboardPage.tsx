import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Shield, Building2, Users, ScrollText, Activity, AlertTriangle, Disc, Truck } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'FLEETS' | 'USERS' | 'AUDIT'>('FLEETS');

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
        <div className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-wider mb-1">
          <Shield className="w-4 h-4" /> JK Tyre Enterprise Administration
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">Platform Governance & Multi-Tenant Audit</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Authorized cross-fleet oversight, multi-tenant fleet isolation, and immutable audit logs.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">Registered Fleets</span>
          <span className="text-2xl font-black text-white">{stats?.total_fleets || 0}</span>
          <span className="text-[11px] text-slate-500 block mt-1">Active transport operators</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">Total Fleet Vehicles</span>
          <span className="text-2xl font-black text-white">{stats?.total_vehicles || 0}</span>
          <span className="text-[11px] text-slate-500 block mt-1">Across all operators</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">Tracked JK Tyres</span>
          <span className="text-2xl font-black text-white">{stats?.total_tyres || 0}</span>
          <span className="text-[11px] text-slate-500 block mt-1">Permanent serial IDs</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs text-slate-400 block mb-1">Active Cross-Fleet Alerts</span>
          <span className="text-2xl font-black text-amber-400">{stats?.active_alerts || 0}</span>
          <span className="text-[11px] text-slate-500 block mt-1">Pending depot attention</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('FLEETS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'FLEETS' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" /> Transport Fleets ({fleets?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('USERS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'USERS' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" /> Platform Users ({users?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'AUDIT' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ScrollText className="w-4 h-4" /> Security Audit Trail ({auditLogs?.length || 0})
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'FLEETS' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                <th className="py-3.5 px-6">Company Name</th>
                <th className="py-3.5 px-4">Registration</th>
                <th className="py-3.5 px-4">Primary Contact</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Vehicles</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {fleets?.map((f: any) => (
                <tr key={f.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-4 px-6 font-bold text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    {f.name}
                  </td>
                  <td className="py-4 px-4 font-mono">{f.registration_no || '—'}</td>
                  <td className="py-4 px-4">{f.contact_name}</td>
                  <td className="py-4 px-4 font-mono text-slate-400">{f.contact_email}</td>
                  <td className="py-4 px-4 font-bold text-white">{f.vehicle_count}</td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
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
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                <th className="py-3.5 px-6">Full Name</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Assigned Role</th>
                <th className="py-3.5 px-4">Fleet Scope</th>
                <th className="py-3.5 px-4">License / ID</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {users?.map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-4 px-6 font-bold text-white">{u.full_name}</td>
                  <td className="py-4 px-4 font-mono text-slate-300">{u.email}</td>
                  <td className="py-4 px-4 font-semibold text-red-400">{u.role}</td>
                  <td className="py-4 px-4 text-slate-400">{u.fleet_name || 'Global Headquarters'}</td>
                  <td className="py-4 px-4 font-mono">{u.driver_license_no || '—'}</td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
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
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                <th className="py-3.5 px-6">Timestamp</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Operator</th>
                <th className="py-3.5 px-4">Resource</th>
                <th className="py-3.5 px-4">IP Address</th>
                <th className="py-3.5 px-4">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {auditLogs?.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-4 px-6 text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-4 px-4 font-bold text-white">{log.action}</td>
                  <td className="py-4 px-4">{log.user_name}</td>
                  <td className="py-4 px-4 font-mono text-slate-400">
                    {log.resource_type} ({log.resource_id?.slice(0, 8)})
                  </td>
                  <td className="py-4 px-4 font-mono text-slate-500">{log.ip_address}</td>
                  <td className="py-4 px-4 font-mono text-[11px] text-slate-400 max-w-xs truncate">
                    {JSON.stringify(log.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
