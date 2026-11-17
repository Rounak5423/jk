import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import {
  Award,
  Gift,
  Tag,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Users,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Disc,
  ExternalLink,
  Phone,
  CreditCard,
  ChevronRight,
  ShieldCheck,
  Check,
  Copy,
} from 'lucide-react';

interface FleetDriverSummary {
  driver_id: string;
  full_name: string;
  username: string;
  driver_license_no: string | null;
  phone_number: string | null;
  completed_trips: number;
  avg_trip_score: number | null;
  lifetime_earned: number;
  total_redeemed: number;
  available_balance: number;
  redemption_status: 'AVAILABLE' | 'REDEEMED' | 'NO_ACTIVITY';
  last_redemption: {
    voucher_code: string;
    points_redeemed: number;
    discount_amount: number;
    redeemed_at: string;
    status: string;
  } | null;
}

interface FleetRewardsData {
  summary: {
    total_drivers: number;
    total_rewards_distributed: number;
    total_rewards_redeemed: number;
    active_unredeemed_balance: number;
    top_driver: {
      full_name: string;
      avg_score: number;
      earned: number;
    } | null;
  };
  drivers: FleetDriverSummary[];
  eligible_products: Array<{
    name: string;
    category: string;
    discount_rate: string;
    description: string;
    badge: string;
  }>;
}

export const FleetDriverRewardsPage: React.FC = () => {
  const { activeFleetId } = useAuthStore();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'REDEEMED'>('ALL');
  const [settleDriver, setSettleDriver] = useState<FleetDriverSummary | null>(null);
  const [settleNotes, setSettleNotes] = useState('');
  const [selectedDriverDetails, setSelectedDriverDetails] = useState<FleetDriverSummary | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<FleetRewardsData>({
    queryKey: ['fleet-driver-rewards', activeFleetId],
    queryFn: async () => {
      const res = await api.get('/fleets/driver-rewards');
      return res.data;
    },
  });

  const settleMutation = useMutation({
    mutationFn: async ({ driverId, notes }: { driverId: string; notes: string }) => {
      const res = await api.post(`/fleets/drivers/${driverId}/redeem-reward`, { notes });
      return res.data;
    },
    onSuccess: (resData) => {
      queryClient.invalidateQueries({ queryKey: ['fleet-driver-rewards'] });
      queryClient.invalidateQueries({ queryKey: ['driver-rewards-data'] });
      setSettleDriver(null);
      setSettleNotes('');
      setActionError(null);
      setActionSuccess(
        `Reward settled successfully! Issued discount voucher ${resData.voucher_code} for ₹${resData.points_redeemed?.toLocaleString()}. Driver available balance has been reset to ₹0.`
      );
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.error || 'Failed to settle driver rewards.');
    },
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const drivers = data?.drivers ?? [];
  const summary = data?.summary;

  const filteredDrivers = drivers.filter((d) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      d.full_name.toLowerCase().includes(q) ||
      d.username.toLowerCase().includes(q) ||
      (d.driver_license_no && d.driver_license_no.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'AVAILABLE' && d.available_balance > 0) ||
      (statusFilter === 'REDEEMED' && d.available_balance === 0 && d.total_redeemed > 0);

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="py-24 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <Sparkles className="w-5 h-5 animate-spin text-amber-500" />
        Loading Fleet Driver Rewards Leaderboard…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-brand-gold" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Fleet Incentive Management
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Fleet Driver Rewards &amp; Product Discounts
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor trip-score performance, reward balances, and voucher redemptions for discounts on JK Tyre commercial products.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-brand-gold border border-brand-gold/30">
            1 Point = ₹1 JK Product Discount
          </span>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-950/70 border border-emerald-500/40 rounded-2xl flex items-start justify-between text-xs text-emerald-300 gap-3">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-400 hover:text-white shrink-0 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-red-950/70 border border-red-500/40 rounded-2xl flex items-start justify-between text-xs text-red-300 gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-red-400 hover:text-white shrink-0 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Rewards Distributed */}
        <div className="black-glow-card border-t-2 border-t-brand-gold p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Rewards Earned</span>
            <Gift className="w-4 h-4 text-brand-gold" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ₹{(summary?.total_rewards_distributed ?? 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 block">
            Across {summary?.total_drivers ?? 0} registered fleet drivers
          </span>
        </div>

        {/* Active Unredeemed Balance */}
        <div className="black-glow-card border-t-2 border-t-amber-400 p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Unredeemed Balance</span>
            <Tag className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            ₹{(summary?.active_unredeemed_balance ?? 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 block">
            Points currently redeemable for JK discounts
          </span>
        </div>

        {/* Total Redeemed to Date */}
        <div className="black-glow-card border-t-2 border-t-emerald-400 p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Redeemed by Drivers</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            ₹{(summary?.total_rewards_redeemed ?? 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 block">
            Discounts claimed on JK commercial tyres &amp; retreads
          </span>
        </div>

        {/* Top Scoring Safe Driver */}
        <div className="black-glow-card border-t-2 border-t-blue-400 p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Top Safe Driver</span>
            <Award className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-lg font-black text-white truncate" title={summary?.top_driver?.full_name}>
            {summary?.top_driver?.full_name || '—'}
          </div>
          <span className="text-[10px] text-blue-400 font-semibold block">
            {summary?.top_driver
              ? `Score: ${summary.top_driver.avg_score}/100 • ₹${summary.top_driver.earned.toLocaleString()} earned`
              : 'Pending trip evaluations'}
          </span>
        </div>
      </div>

      {/* 3. Search and Status Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="search"
            placeholder="Search driver by name, username, license…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-cream border border-gold-border rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-brand-gold"
          />
        </div>

        <div className="flex items-center gap-2">
          {(
            [
              { id: 'ALL', label: 'All Drivers' },
              { id: 'AVAILABLE', label: 'With Balance' },
              { id: 'REDEEMED', label: 'Redeemed (₹0)' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                statusFilter === f.id
                  ? 'bg-brand-gold text-black border border-gold-border'
                  : 'bg-cream text-slate-600 border border-gold-light hover:border-gold-border'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Drivers Table */}
      <div className="cream-glow-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-gold" />
            Fleet Drivers &amp; Incentive Ledger ({filteredDrivers.length} of {drivers.length})
          </h3>
          <span className="text-[11px] text-slate-500">
            Click driver row to inspect past vouchers &amp; trip breakdown
          </span>
        </div>

        {filteredDrivers.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No drivers match the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="pb-3 px-3">Driver Profile</th>
                  <th className="pb-3 px-3">Completed Trips</th>
                  <th className="pb-3 px-3">Avg Trip Score</th>
                  <th className="pb-3 px-3">Lifetime Rewards</th>
                  <th className="pb-3 px-3">Total Redeemed</th>
                  <th className="pb-3 px-3">Available Balance</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Depot Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredDrivers.map((d) => (
                  <tr
                    key={d.driver_id}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                    onClick={() => setSelectedDriverDetails(d)}
                  >
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900 text-sm">{d.full_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {d.username} {d.driver_license_no ? `• ${d.driver_license_no}` : ''}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 font-mono">
                      {d.completed_trips} trips
                    </td>

                    <td className="py-3.5 px-3">
                      {d.avg_trip_score !== null ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            d.avg_trip_score >= 90
                              ? 'bg-emerald-100 text-emerald-800'
                              : d.avg_trip_score >= 80
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {d.avg_trip_score} / 100
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                      ₹{d.lifetime_earned.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-emerald-600">
                      ₹{d.total_redeemed.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-3 font-mono font-black text-slate-900 text-sm">
                      ₹{d.available_balance.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-3">
                      {d.available_balance > 0 ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Available: ₹{d.available_balance.toLocaleString()}
                        </span>
                      ) : d.total_redeemed > 0 ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Redeemed: ₹0 Balance
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                          No Activity
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {d.available_balance > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSettleDriver(d)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black rounded-lg text-xs font-bold transition shadow-sm inline-flex items-center gap-1 cursor-pointer active:scale-95"
                          title="Settle driver reward over the counter and reset balance to 0"
                        >
                          <Tag className="w-3.5 h-3.5" /> Settle / Reset to ₹0
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">
                          {d.last_redemption ? d.last_redemption.voucher_code : 'Settled'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Eligible Products Showcase for Fleet Managers */}
      <div className="cream-glow-card p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Disc className="w-4 h-4 text-brand-gold" />
            Authorized JK Tyre Products Redeemable via Driver Vouchers
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Driver vouchers provide direct invoice deductions when purchasing OEM tyres, retreading, or maintenance parts at JK dealer points:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {data?.eligible_products?.map((p, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 shadow-sm">
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                {p.badge}
              </span>
              <div className="font-bold text-slate-900 text-xs leading-tight">{p.name}</div>
              <div className="text-[10px] text-slate-500">{p.category}</div>
              <div className="text-[10px] font-semibold text-emerald-600">{p.discount_rate}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Confirm Settle Driver Modal (Reset to Zero) */}
      {settleDriver && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                <Tag className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Settle Driver Rewards to ₹0?
                </h3>
                <p className="text-xs text-slate-500">
                  Process redemption for <span className="font-bold text-slate-900">{settleDriver.full_name}</span>
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-700">
                <span>Driver:</span>
                <span className="font-bold text-slate-900">{settleDriver.full_name} ({settleDriver.username})</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Outstanding Balance:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  ₹{settleDriver.available_balance.toLocaleString()} ({settleDriver.available_balance} pts)
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-amber-200 text-slate-700">
                <span>New Available Balance:</span>
                <span className="font-mono font-bold text-red-600">
                  ₹0.0 (Reset to zero)
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Settlement Notes / Counter Reference (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Redeemed at Delhi Depot Counter against 2x JUH5 order"
                value={settleNotes}
                onChange={(e) => setSettleNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This action generates an authorized JK Tyre Product Discount Voucher for <strong className="text-slate-900">₹{settleDriver.available_balance.toLocaleString()}</strong> and resets the driver's available reward balance to <strong>₹0.0</strong>.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSettleDriver(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  settleMutation.mutate({
                    driverId: settleDriver.driver_id,
                    notes: settleNotes,
                  })
                }
                disabled={settleMutation.isPending}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-brand-gold hover:bg-brand-warm-gold transition shadow-md inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5" />
                {settleMutation.isPending ? 'Settling…' : 'Confirm & Reset to ₹0'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Driver Detail Drawer Modal */}
      {selectedDriverDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">{selectedDriverDetails.full_name}</h3>
                <p className="text-xs text-slate-500">
                  {selectedDriverDetails.username} • {selectedDriverDetails.phone_number || 'No phone'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDriverDetails(null)}
                className="text-slate-400 hover:text-slate-900 font-bold text-base px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-slate-400 block mb-0.5">Available Balance</span>
                <span className="text-base font-mono font-bold text-slate-900">
                  ₹{selectedDriverDetails.available_balance.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Total Redeemed</span>
                <span className="text-base font-mono font-bold text-emerald-600">
                  ₹{selectedDriverDetails.total_redeemed.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Avg Trip Score</span>
                <span className="text-base font-mono font-bold text-brand-gold">
                  {selectedDriverDetails.avg_trip_score !== null ? `${selectedDriverDetails.avg_trip_score}/100` : '—'}
                </span>
              </div>
            </div>

            {/* Last Redemption Voucher details */}
            {selectedDriverDetails.last_redemption ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2 text-xs">
                <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                  Latest Redeemed Voucher
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-slate-900 select-all">
                    {selectedDriverDetails.last_redemption.voucher_code}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(selectedDriverDetails.last_redemption!.voucher_code)}
                    className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
                  >
                    {copiedCode === selectedDriverDetails.last_redemption.voucher_code ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="text-[11px] text-slate-600 flex justify-between pt-1 border-t border-amber-200/60">
                  <span>Discount: ₹{selectedDriverDetails.last_redemption.discount_amount.toLocaleString()}</span>
                  <span>Date: {new Date(selectedDriverDetails.last_redemption.redeemed_at).toLocaleDateString()}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                No past redemptions recorded for this driver yet.
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedDriverDetails(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
