import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  Gift,
  Award,
  CheckCircle2,
  Copy,
  Check,
  Tag,
  AlertCircle,
  Truck,
  Disc,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface EligibleProduct {
  name: string;
  category: string;
  discount_rate: string;
  description: string;
  badge: string;
}

interface RewardRecord {
  id: string;
  trip_code: string | null;
  reward_type: string;
  trip_score: number | null;
  trip_distance_km: number | null;
  points_earned: number;
  discount_value: number;
  description: string;
  created_at: string;
}

interface Voucher {
  id: string;
  voucher_code: string;
  points_redeemed: number;
  discount_amount: number;
  product_category: string;
  status: string;
  redeemed_by: string;
  redeemed_at: string;
}

interface DriverRewardsData {
  driver_id: string;
  driver_name: string;
  driver_license_no: string;
  username: string;
  tier_badge: string;
  tier_color: string;
  points_balance: number;
  discount_value: number;
  lifetime_earned: number;
  total_redeemed: number;
  trips_completed_count: number;
  avg_trip_score: number | null;
  recent_rewards: RewardRecord[];
  vouchers: Voucher[];
  eligible_products: EligibleProduct[];
}

export const DriverRewardsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<DriverRewardsData>({
    queryKey: ['driver-rewards-data'],
    queryFn: async () => {
      const res = await api.get('/driver/rewards');
      return res.data;
    },
  });

  const redeemMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/driver/rewards/redeem', {});
      return res.data;
    },
    onSuccess: (resData) => {
      queryClient.invalidateQueries({ queryKey: ['driver-rewards-data'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-driver-rewards'] });
      setShowRedeemModal(false);
      setActionError(null);
      setActionSuccess(
        `Redemption successful! Discount voucher ${resData.voucher?.voucher_code} generated for ₹${resData.discount_amount?.toLocaleString()}. Available balance reset to ₹0.`
      );
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.error || 'Failed to redeem reward points.');
    },
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <Sparkles className="w-5 h-5 animate-spin text-amber-500" />
        Loading your JK Tyre Rewards Wallet…
      </div>
    );
  }

  const balance = data?.points_balance ?? 0;
  const lifetime = data?.lifetime_earned ?? 0;
  const redeemed = data?.total_redeemed ?? 0;
  const vouchers = data?.vouchers ?? [];
  const rewards = data?.recent_rewards ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-brand-gold" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Driver Incentive &amp; Benefits Portal
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            JK Tyre Driver Rewards &amp; Product Discounts
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Earn reward points on every trip score ≥ 70. Redeem points for direct discounts on JK commercial tyres, retreading, and tubes.
          </p>
        </div>

        {data?.tier_badge && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-brand-gold border border-brand-gold/30 self-start sm:self-auto">
            <Award className="w-4 h-4 text-brand-gold shrink-0" />
            <span>{data.tier_badge}</span>
          </div>
        )}
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

      {/* 2. Main Hero Rewards Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-gold-border/60 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-400/20 text-brand-gold border border-brand-gold/40">
                1 Point = ₹1 Discount on JK Products
              </span>
              <span className="text-xs text-slate-400">• Commercial Fleet Program</span>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Available Reward Balance
              </div>
              <div className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight mt-1 flex items-baseline gap-2">
                <span>₹{balance.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                <span className="text-lg font-semibold text-brand-gold">
                  ({balance.toLocaleString()} pts)
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 max-w-lg leading-relaxed">
              Available to redeem as discount vouchers on brand new JK Jetway / Jetsteel commercial tyres, casing retreads, or heavy-duty tubes at any authorized JK Tyre dealer counter.
            </p>
          </div>

          <div className="flex flex-col gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowRedeemModal(true)}
              disabled={balance <= 0 || redeemMutation.isPending}
              className={`px-6 py-4 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2.5 shadow-xl ${
                balance > 0
                  ? 'bg-brand-gold hover:bg-brand-warm-gold text-black shadow-brand-gold/25 cursor-pointer active:scale-95'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-75'
              }`}
            >
              <Tag className="w-4 h-4" />
              {balance > 0 ? `Redeem ₹${balance.toLocaleString()} for JK Discount` : 'No Points Available to Redeem'}
            </button>

            {balance > 0 && (
              <span className="text-[11px] text-center text-slate-400">
                ⚡ Redeeming converts full balance to voucher &amp; resets to ₹0
              </span>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Lifetime Points Earned</span>
            <span className="text-base font-bold text-white font-mono">
              ₹{lifetime.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Total Redeemed</span>
            <span className="text-base font-bold text-emerald-400 font-mono">
              ₹{redeemed.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Trips Evaluated</span>
            <span className="text-base font-bold text-white font-mono">
              {data?.trips_completed_count ?? 0} trips
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Average Trip Score</span>
            <span className="text-base font-bold text-brand-gold font-mono">
              {data?.avg_trip_score !== null && data?.avg_trip_score !== undefined
                ? `${data.avg_trip_score} / 100`
                : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Active Vouchers / Voucher Wallet */}
      <div className="cream-glow-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-600" />
            My JK Tyre Discount Vouchers ({vouchers.length})
          </h3>
          <span className="text-xs text-slate-500">Present code at billing counter</span>
        </div>

        {vouchers.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 space-y-2">
            <p className="font-semibold text-slate-700">No vouchers generated yet.</p>
            <p className="max-w-md mx-auto text-[11px] text-slate-400">
              When you redeem your accumulated reward points, your digital voucher code will appear here instantly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vouchers.map((v) => (
              <div
                key={v.id}
                className="relative bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-dashed border-amber-300 rounded-2xl p-5 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded">
                      JK Product Discount Voucher
                    </span>
                    <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                      ₹{v.discount_amount.toLocaleString()} OFF
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {v.status}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-amber-200 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Voucher Code</span>
                    <span className="font-mono font-black text-slate-900 tracking-wider text-sm select-all">
                      {v.voucher_code}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(v.voucher_code)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    {copiedCode === v.voucher_code ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Code
                      </>
                    )}
                  </button>
                </div>

                <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-amber-200/60">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Applicable On:</span>
                    <span className="font-medium text-slate-800">{v.product_category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Issued On:</span>
                    <span className="font-mono">{new Date(v.redeemed_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Eligible JK Tyre Products Section */}
      <div className="cream-glow-card p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Disc className="w-4 h-4 text-brand-gold" />
            Eligible JK Tyre Products for Discount Redemption
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Your reward discount vouchers apply directly against the following OEM commercial products at all authorized dealers:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.eligible_products?.map((p, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition space-y-3"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    {p.badge}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">{p.discount_rate}</span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm leading-snug">{p.name}</h4>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{p.category}</p>
                <p className="text-xs text-slate-600 leading-relaxed mt-2">{p.description}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-amber-900 font-semibold">
                <span>Voucher Valid</span>
                <span className="text-slate-400">Direct Dealer Offset</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Trip Rewards History Table */}
      <div className="cream-glow-card p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          Trip Rewards &amp; Scoring History ({rewards.length})
        </h3>

        {rewards.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No completed trip scores recorded yet. Complete journeys with score ≥ 70 to accumulate reward points.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="pb-3 px-3">Date</th>
                  <th className="pb-3 px-3">Trip Code</th>
                  <th className="pb-3 px-3">Distance</th>
                  <th className="pb-3 px-3">Trip Score</th>
                  <th className="pb-3 px-3">Reward Details</th>
                  <th className="pb-3 px-3 text-right">Points Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rewards.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 text-slate-500 font-mono">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {r.trip_code || '—'}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {r.trip_distance_km ? `${r.trip_distance_km} km` : '—'}
                    </td>
                    <td className="py-3 px-3">
                      {r.trip_score !== null && r.trip_score !== undefined ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.trip_score >= 90
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.trip_score >= 80
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {r.trip_score} / 100
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={r.description}>
                      {r.description}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                      +{r.points_earned} pts (₹{r.discount_value})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Confirm Redeem Modal */}
      {showRedeemModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                <Tag className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Redeem for JK Tyre Discount?
                </h3>
                <p className="text-xs text-slate-500">
                  Convert available reward points into a product discount voucher.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-700">
                <span>Points to Redeem:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {balance.toLocaleString()} pts
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Voucher Discount Value:</span>
                <span className="font-mono font-bold text-emerald-700 text-base">
                  ₹{balance.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-amber-200 text-slate-700">
                <span>New Available Balance:</span>
                <span className="font-mono font-bold text-red-600">
                  ₹0.0 (Reset to zero)
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Upon confirmation, an authorized digital voucher code (<span className="font-mono font-semibold">JK-DISC-XXXXXX</span>) will be generated. You can present this code at any JK Tyre Truck Wheels Center or dealership counter to deduct ₹{balance.toLocaleString()} directly from your invoice.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRedeemModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => redeemMutation.mutate()}
                disabled={redeemMutation.isPending}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-brand-gold hover:bg-brand-warm-gold transition shadow-md inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5" />
                {redeemMutation.isPending ? 'Redeeming…' : `Confirm & Reset to ₹0`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

