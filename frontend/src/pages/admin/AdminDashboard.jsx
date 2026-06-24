import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LocafyApi } from '../../services/api';

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
const initials = (name) =>
  (name || '?').substring(0, 2).toUpperCase();

const fmtPrice = (p) => {
  if (!p) return '—';
  if (typeof p === 'string') return p;
  return new Intl.NumberFormat('vi-VN').format(p) + ' ₫';
};

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('vi-VN'); } catch { return d; }
};

/* ─────────────────────────────────────────────────────────────────────────────
   STATUS BADGE
───────────────────────────────────────────────────────────────────────────── */
const StatusBadge = ({ status, map }) => {
  const cfg = map[status] || { label: status, cls: 'bg-stone-100 text-stone-600' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {cfg.label}
    </span>
  );
};

const LISTING_STATUS_MAP = {
  pending:  { label: 'Chờ duyệt',  cls: 'bg-amber-50 text-amber-700' },
  approved: { label: 'Đã duyệt',   cls: 'bg-green-50 text-green-700' },
  rejected: { label: 'Từ chối',    cls: 'bg-red-50 text-red-700' },
};

const VERIFY_STATUS_MAP = {
  pending:  { label: 'Chờ duyệt',    cls: 'bg-amber-50 text-amber-700' },
  approved: { label: 'Đã xác minh',  cls: 'bg-green-50 text-green-700' },
  rejected: { label: 'Từ chối',      cls: 'bg-red-50 text-red-700' },
};

const REPORT_STATUS_MAP = {
  pending:  { label: 'Chờ xử lý',     cls: 'bg-red-50 text-red-700' },
  resolved: { label: 'Đã giải quyết', cls: 'bg-green-50 text-green-700' },
  dismissed:{ label: 'Đã bỏ qua',     cls: 'bg-stone-100 text-stone-600' },
};

const APPT_STATUS_MAP = {
  pending:   { label: 'Chờ xác nhận', cls: 'bg-amber-50 text-amber-700' },
  confirmed: { label: 'Đã xác nhận',  cls: 'bg-green-50 text-green-700' },
  cancelled: { label: 'Đã hủy',       cls: 'bg-stone-100 text-stone-500' },
};

const USER_STATUS_MAP = {
  active:  { label: 'Hoạt động', cls: 'bg-green-50 text-green-700' },
  blocked: { label: 'Bị khóa',   cls: 'bg-red-50 text-red-700' },
};

/* ─────────────────────────────────────────────────────────────────────────────
   MODAL – REJECT REASON
───────────────────────────────────────────────────────────────────────────── */
const RejectModal = ({ title, placeholder, onConfirm, onClose }) => {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-base font-extrabold text-stone-900 mb-1">{title}</h3>
        <p className="text-xs text-stone-500 mb-4">Lý do sẽ được gửi đến người dùng.</p>
        <textarea
          autoFocus
          rows={4}
          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none resize-none transition-all"
          placeholder={placeholder || 'Nhập lý do từ chối...'}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full text-sm font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => { if (reason.trim()) onConfirm(reason.trim()); }}
            disabled={!reason.trim()}
            className="px-5 py-2 rounded-full text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Xác nhận từ chối
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   MODAL – CONFIRM DIALOG
───────────────────────────────────────────────────────────────────────────── */
const ConfirmModal = ({ title, message, confirmLabel = 'Xác nhận', confirmCls = 'bg-red-600 hover:bg-red-700', onConfirm, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
          <i className="fa-solid fa-triangle-exclamation" />
        </div>
        <h3 className="text-base font-extrabold text-stone-900">{title}</h3>
      </div>
      <p className="text-sm text-stone-600 mb-6 ml-13">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-5 py-2 rounded-full text-sm font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors">
          Hủy
        </button>
        <button onClick={onConfirm} className={`px-5 py-2 rounded-full text-sm font-bold text-white ${confirmCls} transition-colors`}>
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   SPINNER / EMPTY
───────────────────────────────────────────────────────────────────────────── */
const Spinner = () => (
  <div className="flex justify-center items-center py-16">
    <div className="w-8 h-8 rounded-full border-4 border-purple-600 border-t-transparent animate-spin" />
  </div>
);

const EmptyState = ({ icon = 'fa-inbox', text = 'Không có dữ liệu.' }) => (
  <div className="flex flex-col items-center justify-center py-16 text-stone-400">
    <i className={`fa-solid ${icon} text-3xl mb-3 opacity-40`} />
    <p className="text-sm">{text}</p>
  </div>
);

const ErrorState = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-16 text-red-500 gap-3">
    <i className="fa-solid fa-circle-exclamation text-3xl opacity-60" />
    <p className="text-sm">{message || 'Đã xảy ra lỗi khi tải dữ liệu.'}</p>
    {onRetry && (
      <button onClick={onRetry} className="mt-1 px-4 py-1.5 bg-red-50 border border-red-200 rounded-full text-xs font-bold text-red-700 hover:bg-red-100 transition-colors">
        Thử lại
      </button>
    )}
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   NAV ITEMS
───────────────────────────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { key: 'dashboard',     icon: 'fa-solid fa-chart-pie',           label: 'Tổng quan' },
  { key: 'verify-sellers', icon: 'fa-solid fa-user-check',         label: 'Xét duyệt Chủ trọ' },
  { key: 'listings',      icon: 'fa-solid fa-bed',                 label: 'Kiểm duyệt Phòng trọ' },
  { key: 'users',         icon: 'fa-solid fa-users',               label: 'Quản lý Người dùng' },
  { key: 'reports',       icon: 'fa-solid fa-flag',                label: 'Báo cáo Vi phạm' },
  { key: 'appointments',  icon: 'fa-solid fa-calendar-check',      label: 'Theo dõi Lịch hẹn' },
  { key: 'packages',      icon: 'fa-solid fa-crown',               label: 'Gói Dịch vụ' },
  { key: 'content',       icon: 'fa-solid fa-newspaper',           label: 'Quản lý Nội dung' },
  { key: 'settings',      icon: 'fa-solid fa-gear',                label: 'Cài đặt Hệ thống' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   TAB: DASHBOARD – TỔNG QUAN
═══════════════════════════════════════════════════════════════════════════ */
const TabDashboard = () => {
  const [stats, setStats] = useState(null);
  const [pendingListings, setPendingListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [, setSearchParams] = useSearchParams();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, listingsRes] = await Promise.all([
        LocafyApi.getAdminDashboard(),
        LocafyApi.getAdminListings({ status: 'pending', limit: 6 }),
      ]);
      setStats(dashRes.data);
      setPendingListings(listingsRes.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const STAT_CARDS = [
    { label: 'Tổng người dùng',     value: stats.accounts.totalUsers,                        icon: 'fa-users',       color: 'purple' },
    { label: 'Tổng chủ trọ',        value: stats.accounts.totalSellers,                      icon: 'fa-user-tie',    color: 'amber' },
    { label: 'Tin đăng đã duyệt',   value: stats.listings.approved,                          icon: 'fa-house',       color: 'blue' },
    { label: 'Doanh thu tháng này', value: fmtPrice(stats.transactions.revenueThisMonth),    icon: 'fa-wallet',      color: 'green' },
  ];
  const colorMap = {
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    amber:  'bg-amber-50 text-amber-600 border-amber-100',
    blue:   'bg-blue-50 text-blue-600 border-blue-100',
    green:  'bg-green-50 text-green-600 border-green-100',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-stone-900 mb-1">Tổng quan Hệ thống</h2>
        <p className="text-sm text-stone-500">Giám sát hoạt động đăng trọ, thống kê và quản trị hệ thống Locafy.</p>
      </div>

      {/* System status */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
        <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Hệ thống đang hoạt động ổn định</span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {STAT_CARDS.map((c) => (
          <div key={c.label} className="bg-white p-5 rounded-2xl border border-stone-200/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colorMap[c.color]}`}>
                <i className={`fa-solid ${c.icon} text-sm`} />
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">{c.label}</p>
              <p className="text-2xl font-black text-stone-900">{c.value.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pending alerts */}
      {(stats.accounts.pendingSellers > 0 || stats.listings.pending > 0) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {stats.accounts.pendingSellers > 0 && (
            <button
              onClick={() => setSearchParams({ tab: 'verify-sellers' })}
              className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl hover:bg-amber-100 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-user-clock text-sm" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900">{stats.accounts.pendingSellers} chủ trọ chờ duyệt hồ sơ</p>
                <p className="text-xs text-amber-700 mt-0.5">Nhấn để xét duyệt ngay →</p>
              </div>
            </button>
          )}
          {stats.listings.pending > 0 && (
            <button
              onClick={() => setSearchParams({ tab: 'listings' })}
              className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-2xl hover:bg-blue-100 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-bed text-sm" />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-900">{stats.listings.pending} tin đăng chờ kiểm duyệt</p>
                <p className="text-xs text-blue-700 mt-0.5">Nhấn để kiểm duyệt ngay →</p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Bar chart (static sparkline) */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200/60 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-base font-extrabold text-stone-900">Thống kê Truy cập & Đặt lịch</h3>
            <p className="text-xs text-stone-400">Lịch sử tương tác trong 10 ngày gần nhất</p>
          </div>
          <select className="bg-stone-50 border border-stone-200 rounded-full px-3 py-1.5 text-xs text-stone-600 outline-none cursor-pointer">
            <option>Tháng này</option>
            <option>Tháng trước</option>
          </select>
        </div>
        <div className="relative w-full h-48 flex flex-col justify-end">
          <svg className="absolute inset-0 w-full h-full text-stone-100" fill="none" preserveAspectRatio="none">
            <line x1="0" y1="25%" x2="100%" y2="25%" stroke="currentColor" strokeDasharray="4,4" />
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="currentColor" strokeDasharray="4,4" />
            <line x1="0" y1="75%" x2="100%" y2="75%" stroke="currentColor" strokeDasharray="4,4" />
            <line x1="0" y1="100%" x2="100%" y2="100%" stroke="currentColor" />
          </svg>
          <div className="relative w-full h-40 flex items-end justify-between gap-2 px-2 z-10">
            {[40, 60, 55, 80, 45, 95, 85, 50, 65, 70].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center group h-full justify-end">
                <div
                  className="w-full bg-purple-200 group-hover:bg-purple-600 transition-all rounded-t-md cursor-pointer"
                  style={{ height: `${h}%` }}
                />
                <span className="text-[9px] text-stone-400 font-bold mt-1">
                  {['T2','T3','T4','T5','T6','T7','CN','T2','T3','T4'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending listings quick table */}
      {pendingListings.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
          <div className="flex justify-between items-center px-6 py-4 border-b border-stone-100">
            <h3 className="text-base font-extrabold text-stone-900">Danh sách chờ duyệt (Tin đăng mới)</h3>
            <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1 rounded-full">
              Có {stats.listings.pending} tin chờ duyệt
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Phòng / Tên phòng</th>
                  <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Chủ trọ</th>
                  <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Khu vực</th>
                  <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Giá thuê</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {pendingListings.map(item => (
                  <tr key={item._id} className="hover:bg-stone-50/50">
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.imageUrls?.[0] || item.room?.imageUrls?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=100&q=80'}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover shrink-0"
                        />
                        <span className="font-bold text-stone-900 line-clamp-1">{item.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-6 text-stone-600">{item.seller?.name || '—'}</td>
                    <td className="py-3 px-6 text-stone-500 text-xs">{item.district ? `${item.district}, ${item.province}` : (item.addressLine || '—')}</td>
                    <td className="py-3 px-6 font-bold text-purple-700">{fmtPrice(item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-stone-100">
            <button
              onClick={() => setSearchParams({ tab: 'listings' })}
              className="w-full py-2 text-xs font-bold text-stone-700 bg-stone-50 border border-stone-200 hover:bg-stone-100 rounded-full transition-colors"
            >
              Xem tất cả tin đăng →
            </button>
          </div>
        </div>
      )}

      {/* System health */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200/60 shadow-sm">
        <h3 className="text-sm font-bold text-stone-900 mb-4 flex items-center gap-2">
          <i className="fa-solid fa-server text-purple-600 text-xs" />
          Trạng thái Tài nguyên
        </h3>
        <div className="space-y-4">
          {[
            { label: 'CPU Usage',          value: 28, color: 'bg-purple-500' },
            { label: 'RAM Memory',          value: 64, color: 'bg-amber-500' },
            { label: 'Database Latency',    value: 15, color: 'bg-green-500' },
          ].map(r => (
            <div key={r.label}>
              <div className="flex justify-between text-[11px] font-bold text-stone-600 mb-1">
                <span>{r.label}</span>
                <span>{r.value}%</span>
              </div>
              <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div className={`${r.color} h-full rounded-full transition-all`} style={{ width: `${r.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity log */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200/60 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-stone-900">Nhật ký Hoạt động</h3>
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Thời gian thực</span>
        </div>
        <div className="space-y-3 text-xs">
          {[
            { text: <><strong>Backup Database</strong> tự động hoàn thành sạch sẽ.</>, time: '10 phút trước' },
            { text: <><strong>Admin</strong> đã cập nhật Cài đặt hệ thống.</>, time: '20 phút trước' },
            { text: <><strong>seller123</strong> vừa gửi phê duyệt phòng mới.</>, time: '1 giờ trước' },
          ].map((log, i) => (
            <div key={i} className="flex gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0" />
              <div>
                <p className="text-stone-700">{log.text}</p>
                <p className="text-[10px] text-stone-400">{log.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   TAB: VERIFY SELLERS – XÉT DUYỆT CHỦ TRỌ
═══════════════════════════════════════════════════════════════════════════ */
const TabVerifySellers = () => {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [processing, setProcessing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await LocafyApi.getAdminAccounts({ role: 'seller', limit: 100 });
      setSellers(res.data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleVerify = async (seller, status, rejectedReason = '') => {
    setProcessing(seller._id || seller.id);
    try {
      await LocafyApi.verifySeller(seller._id || seller.id, { status, rejectedReason });
      setSellers(prev => prev.map(s =>
        (s._id || s.id) === (seller._id || seller.id)
          ? { ...s, verificationStatus: status, verificationRejectedReason: rejectedReason }
          : s
      ));
    } catch (e) { alert('Thao tác thất bại: ' + e.message); }
    finally { setProcessing(null); }
  };

  if (loading) return <Spinner />;
  if (error)   return <ErrorState message={error} onRetry={load} />;

  const pending  = sellers.filter(s => (s.verificationStatus || 'pending') === 'pending');
  const rest     = sellers.filter(s => (s.verificationStatus || 'pending') !== 'pending');

  return (
    <div className="space-y-6">
      {rejectTarget && (
        <RejectModal
          title={`Từ chối hồ sơ: ${rejectTarget.name || rejectTarget.username}`}
          placeholder="Ví dụ: Giấy tờ không hợp lệ, thông tin chưa đủ..."
          onConfirm={(reason) => {
            handleVerify(rejectTarget, 'rejected', reason);
            setRejectTarget(null);
          }}
          onClose={() => setRejectTarget(null)}
        />
      )}

      <div>
        <h2 className="text-2xl font-extrabold text-stone-900 mb-1">Duyệt Hồ Sơ Chủ Trọ</h2>
        <p className="text-sm text-stone-500">Kiểm tra thông tin giấy tờ, căn cước và xác nhận quyền đăng tin cho chủ nhà.</p>
      </div>

      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Hồ sơ chờ xác thực ({pending.length})
          </h3>
          <div className="space-y-4">
            {pending.map(seller => (
              <SellerCard
                key={seller._id || seller.id}
                seller={seller}
                processing={processing === (seller._id || seller.id)}
                onApprove={() => handleVerify(seller, 'approved')}
                onReject={() => setRejectTarget(seller)}
              />
            ))}
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-stone-500 mb-3">Đã xử lý ({rest.length})</h3>
          <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Họ tên chủ nhà</th>
                    <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Số điện thoại</th>
                    <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Email</th>
                    <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Trạng thái xác minh</th>
                    <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {rest.map(seller => (
                    <tr key={seller._id || seller.id} className="hover:bg-stone-50/50">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {initials(seller.name || seller.username)}
                          </div>
                          <div>
                            <p className="font-bold text-stone-900">{seller.name || seller.username}</p>
                            <p className="text-xs text-stone-400">@{seller.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-stone-600">{seller.phone || 'Chưa cập nhật'}</td>
                      <td className="py-4 px-6 text-stone-500">{seller.email}</td>
                      <td className="py-4 px-6">
                        <StatusBadge status={seller.verificationStatus} map={VERIFY_STATUS_MAP} />
                      </td>
                      <td className="py-4 px-6 text-right">
                        {seller.verificationStatus === 'approved' ? (
                          <button
                            onClick={() => setRejectTarget(seller)}
                            disabled={!!processing}
                            className="px-4 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-full text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-40"
                          >
                            Hủy xác minh
                          </button>
                        ) : (
                          <button
                            onClick={() => handleVerify(seller, 'approved')}
                            disabled={!!processing}
                            className="px-4 py-1.5 bg-green-600 text-white rounded-full text-xs font-bold hover:bg-green-700 transition-colors disabled:opacity-40"
                          >
                            Duyệt lại
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t border-stone-100 text-xs text-stone-500">
              Hiển thị {rest.length} hồ sơ đã xử lý
            </div>
          </div>
        </div>
      )}

      {sellers.length === 0 && <EmptyState icon="fa-user-check" text="Chưa có chủ trọ nào trên hệ thống." />}
    </div>
  );
};

/* Seller card (pending) */
const SellerCard = ({ seller, processing, onApprove, onReject }) => {
  const [expanded, setExpanded] = useState(false);
  const sellerTypeLabel = { individual: 'Cá nhân', agency: 'Công ty / Đại lý' };

  return (
    <div className="bg-white rounded-2xl border border-amber-200/80 shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-extrabold text-lg shrink-0">
            {initials(seller.name || seller.username)}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h4 className="font-extrabold text-stone-900">{seller.name || seller.username}</h4>
              <StatusBadge status="pending" map={VERIFY_STATUS_MAP} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-stone-600 mt-2">
              <p><span className="text-stone-400 font-medium">Username: </span>@{seller.username}</p>
              <p><span className="text-stone-400 font-medium">Email: </span>{seller.email || '—'}</p>
              <p><span className="text-stone-400 font-medium">Số ĐT: </span>{seller.phone || 'Chưa cập nhật'}</p>
              <p><span className="text-stone-400 font-medium">Loại chủ trọ: </span>{sellerTypeLabel[seller.sellerType] || seller.sellerType || '—'}</p>
              {seller.businessName && (
                <p className="sm:col-span-2"><span className="text-stone-400 font-medium">Tên doanh nghiệp: </span>{seller.businessName}</p>
              )}
            </div>

            {/* Documents */}
            <button
              onClick={() => setExpanded(p => !p)}
              className="mt-3 text-xs text-purple-600 font-bold flex items-center gap-1 hover:text-purple-800 transition-colors"
            >
              <i className={`fa-solid fa-chevron-${expanded ? 'up' : 'down'} text-[10px]`} />
              {expanded ? 'Ẩn giấy tờ' : 'Xem giấy tờ đính kèm'}
            </button>

            {expanded && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {seller.idCardFrontUrl && (
                  <a href={seller.idCardFrontUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-100 transition-colors">
                    <i className="fa-regular fa-id-card text-purple-500" />
                    CCCD mặt trước
                  </a>
                )}
                {seller.idCardBackUrl && (
                  <a href={seller.idCardBackUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-100 transition-colors">
                    <i className="fa-regular fa-id-card text-purple-500" />
                    CCCD mặt sau
                  </a>
                )}
                {(seller.propertyDocUrls || []).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-100 transition-colors">
                    <i className="fa-regular fa-file-lines text-purple-500" />
                    Giấy tờ tài sản {i + 1}
                  </a>
                ))}
                {!seller.idCardFrontUrl && !seller.idCardBackUrl && !(seller.propertyDocUrls?.length) && (
                  <p className="text-xs text-stone-400 col-span-3">Chưa có giấy tờ đính kèm.</p>
                )}
              </div>
            )}
          </div>
          {/* Actions */}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={onApprove}
              disabled={processing}
              className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-full hover:bg-green-700 disabled:opacity-40 transition-colors shadow-sm"
            >
              {processing ? <i className="fa-solid fa-spinner animate-spin" /> : 'Duyệt'}
            </button>
            <button
              onClick={onReject}
              disabled={processing}
              className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-full hover:bg-red-100 disabled:opacity-40 transition-colors"
            >
              Từ chối
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   TAB: LISTINGS – KIỂM DUYỆT TIN ĐĂNG
═══════════════════════════════════════════════════════════════════════════ */
const TabListings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [processing, setProcessing]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await LocafyApi.getAdminListings({ limit: 100 });
      setListings(res.data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (listing, status, rejectedReason = '') => {
    const id = listing._id || listing.id;
    setProcessing(id);
    try {
      await LocafyApi.updateListingStatus(id, { status, rejectedReason });
      setListings(prev => prev.map(l =>
        (l._id || l.id) === id ? { ...l, status, rejectedReason } : l
      ));
    } catch (e) { alert('Thao tác thất bại: ' + e.message); }
    finally { setProcessing(null); }
  };

  const filtered = listings.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || (l.title || '').toLowerCase().includes(q) || (l.location || l.address || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || (l.status || 'pending') === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <Spinner />;
  if (error)   return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      {rejectTarget && (
        <RejectModal
          title={`Từ chối tin đăng: ${rejectTarget.title}`}
          placeholder="Ví dụ: Hình ảnh không phù hợp, giá không hợp lệ..."
          onConfirm={(reason) => {
            handleAction(rejectTarget, 'rejected', reason);
            setRejectTarget(null);
          }}
          onClose={() => setRejectTarget(null)}
        />
      )}

      <div>
        <h2 className="text-2xl font-extrabold text-stone-900 mb-1">Kiểm Duyệt Phòng Trọ</h2>
        <p className="text-sm text-stone-500">Kiểm duyệt các thông tin mô tả, giá cả và hình ảnh bài đăng từ chủ trọ.</p>
      </div>

      {/* Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/60 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-xs" />
          <input
            className="w-full bg-stone-50 text-sm rounded-xl pl-10 pr-4 py-2.5 border border-stone-200 focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all"
            placeholder="Tìm kiếm tin đăng (tiêu đề, địa chỉ)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-600 outline-none transition-all focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="rejected">Từ chối</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Tin đăng</th>
                <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Địa chỉ</th>
                <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Chủ trọ</th>
                <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Giá thuê</th>
                <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Trạng thái</th>
                <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-400 text-sm">
                    Không tìm thấy tin đăng nào phù hợp.
                  </td>
                </tr>
              ) : filtered.map(item => {
                const id = item._id || item.id;
                const isProcessing = processing === id;
                const status = item.status || 'pending';
                return (
                  <tr key={id} className="hover:bg-stone-50/50">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.imageUrls?.[0] || item.room?.imageUrls?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=100&q=80'}
                          alt=""
                          className="w-12 h-12 rounded-xl object-cover shrink-0"
                        />
                        <div>
                          <p className="font-bold text-stone-900 line-clamp-1">{item.title}</p>
                          <p className="text-xs text-stone-400">{item.roomType || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-stone-600 text-xs max-w-[160px] line-clamp-2">{item.district ? `${item.district}, ${item.province}` : (item.addressLine || '—')}</td>
                    <td className="py-4 px-6 text-stone-500">{item.seller?.name || '—'}</td>
                    <td className="py-4 px-6 font-bold text-purple-700">{fmtPrice(item.price)}</td>
                    <td className="py-4 px-6">
                      <StatusBadge status={status} map={LISTING_STATUS_MAP} />
                      {item.rejectedReason && (
                        <p className="text-[10px] text-red-500 mt-1 max-w-[140px] line-clamp-2">{item.rejectedReason}</p>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        {status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAction(item, 'approved')}
                              disabled={isProcessing}
                              className="px-3.5 py-1.5 bg-green-600 text-white rounded-full text-xs font-bold hover:bg-green-700 disabled:opacity-40 transition-colors"
                            >
                              {isProcessing ? <i className="fa-solid fa-spinner animate-spin" /> : 'Duyệt'}
                            </button>
                            <button
                              onClick={() => setRejectTarget(item)}
                              disabled={isProcessing}
                              className="px-3.5 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-full text-xs font-bold hover:bg-red-100 disabled:opacity-40 transition-colors"
                            >
                              Từ chối
                            </button>
                          </>
                        )}
                        {status === 'approved' && (
                          <button
                            onClick={() => setRejectTarget(item)}
                            disabled={isProcessing}
                            className="px-3.5 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-full text-xs font-bold hover:bg-red-100 disabled:opacity-40 transition-colors"
                          >
                            Gỡ tin
                          </button>
                        )}
                        {status === 'rejected' && (
                          <button
                            onClick={() => handleAction(item, 'approved')}
                            disabled={isProcessing}
                            className="px-3.5 py-1.5 bg-green-600 text-white rounded-full text-xs font-bold hover:bg-green-700 disabled:opacity-40 transition-colors"
                          >
                            Duyệt lại
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-stone-100 text-xs text-stone-500">
          Hiển thị {filtered.length} / {listings.length} tin đăng
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   TAB: USERS – QUẢN LÝ TÀI KHOẢN
═══════════════════════════════════════════════════════════════════════════ */
const TabUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter]     = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [processing, setProcessing]     = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await LocafyApi.getAdminAccounts({ limit: 200 });
      setUsers(res.data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doToggle = async (account) => {
    const id = account._id || account.id;
    setProcessing(id);
    try {
      await LocafyApi.toggleAccountActive(id);
      setUsers(prev => prev.map(u =>
        (u._id || u.id) === id ? { ...u, isActive: !u.isActive } : u
      ));
    } catch (e) { alert('Thao tác thất bại: ' + e.message); }
    finally { setProcessing(null); }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (u.name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').includes(q);
    const matchRole   = roleFilter === 'all'   || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && u.isActive !== false) ||
      (statusFilter === 'blocked' && u.isActive === false);
    return matchSearch && matchRole && matchStatus;
  });

  if (loading) return <Spinner />;
  if (error)   return <ErrorState message={error} onRetry={load} />;

  const roleMap = {
    admin:  { label: 'Quản trị viên', cls: 'bg-purple-100 text-purple-800' },
    seller: { label: 'Chủ trọ',       cls: 'bg-amber-100 text-amber-800' },
    buyer:  { label: 'Người thuê',     cls: 'bg-blue-100 text-blue-800' },
  };

  return (
    <div className="space-y-6">
      {confirmTarget && (
        <ConfirmModal
          title={confirmTarget.isActive === false ? 'Mở khóa tài khoản?' : 'Khóa tài khoản?'}
          message={confirmTarget.isActive === false
            ? `Tài khoản "${confirmTarget.name || confirmTarget.email}" sẽ được mở khóa và hoạt động trở lại.`
            : `Tài khoản "${confirmTarget.name || confirmTarget.email}" sẽ bị khóa và không thể đăng nhập.`
          }
          confirmLabel={confirmTarget.isActive === false ? 'Mở khóa' : 'Khóa'}
          confirmCls={confirmTarget.isActive === false ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
          onConfirm={() => { doToggle(confirmTarget); setConfirmTarget(null); }}
          onClose={() => setConfirmTarget(null)}
        />
      )}

      <div>
        <h2 className="text-2xl font-extrabold text-stone-900 mb-1">Quản Lý Người Dùng</h2>
        <p className="text-sm text-stone-500">Theo dõi hoạt động, vai trò và trạng thái khóa của tất cả tài khoản.</p>
      </div>

      {/* Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/60 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-xs" />
          <input
            className="w-full bg-stone-50 text-sm rounded-xl pl-10 pr-4 py-2.5 border border-stone-200 focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all"
            placeholder="Tìm kiếm người dùng (tên, email, số điện thoại)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-600 outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all">
          <option value="all">Tất cả vai trò</option>
          <option value="buyer">Người thuê</option>
          <option value="seller">Chủ trọ</option>
          <option value="admin">Quản trị viên</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-600 outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all">
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="blocked">Bị khóa</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Tên người dùng</th>
                <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Email</th>
                <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Số điện thoại</th>
                <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Vai trò</th>
                <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Trạng thái</th>
                <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-400 text-sm">
                    Không tìm thấy người dùng nào phù hợp.
                  </td>
                </tr>
              ) : filtered.map(u => {
                const id = u._id || u.id;
                const isSelf    = String(u._id || u.id) === String(currentUser?._id || currentUser?.id);
                const isBlocked = u.isActive === false;
                const role      = roleMap[u.role] || { label: u.role, cls: 'bg-stone-100 text-stone-700' };
                return (
                  <tr key={id} className="hover:bg-stone-50/50">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {initials(u.name || u.username)}
                        </div>
                        <div>
                          <p className="font-bold text-stone-900">{u.name || u.username}</p>
                          <p className="text-xs text-stone-400">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-stone-600">{u.email}</td>
                    <td className="py-4 px-6 text-stone-500">{u.phone || 'Chưa cung cấp'}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${role.cls}`}>{role.label}</span>
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={isBlocked ? 'blocked' : 'active'} map={USER_STATUS_MAP} />
                    </td>
                    <td className="py-4 px-6 text-right">
                      {isSelf ? (
                        <span className="text-xs text-stone-400 italic">Tài khoản của bạn</span>
                      ) : (
                        <button
                          onClick={() => setConfirmTarget(u)}
                          disabled={processing === id}
                          title={isBlocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                          className={`p-1.5 rounded-lg transition-colors ${isBlocked
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-red-500 hover:bg-red-50'
                          } disabled:opacity-40`}
                        >
                          {processing === id
                            ? <i className="fa-solid fa-spinner animate-spin" />
                            : <i className={`fa-solid ${isBlocked ? 'fa-lock-open' : 'fa-lock'}`} />
                          }
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-stone-100 text-xs text-stone-500">
          Hiển thị {filtered.length} / {users.length} người dùng trên hệ thống
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   TAB: REPORTS – BÁO CÁO VI PHẠM
═══════════════════════════════════════════════════════════════════════════ */
const TabReports = () => {
  const [reports, setReports]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [processing, setProcessing] = useState(null);
  const [confirmDismiss, setConfirmDismiss] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await LocafyApi.getAdminReports({ limit: 100 });
      setReports(res.data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleResolve = async (report) => {
    const id = report._id || report.id;
    setProcessing(id);
    try {
      await LocafyApi.resolveReport(id, { status: 'resolved' });
      setReports(prev => prev.map(r => (r._id || r.id) === id ? { ...r, status: 'resolved' } : r));
    } catch (e) { alert('Thao tác thất bại: ' + e.message); }
    finally { setProcessing(null); }
  };

  const handleDismiss = async (report) => {
    const id = report._id || report.id;
    setProcessing(id);
    try {
      await LocafyApi.resolveReport(id, { status: 'dismissed' });
      setReports(prev => prev.map(r => (r._id || r.id) === id ? { ...r, status: 'dismissed' } : r));
    } catch (e) { alert('Thao tác thất bại: ' + e.message); }
    finally { setProcessing(null); setConfirmDismiss(null); }
  };

  if (loading) return <Spinner />;
  if (error)   return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      {confirmDismiss && (
        <ConfirmModal
          title="Bỏ qua báo cáo?"
          message="Báo cáo vi phạm này sẽ bị xóa khỏi hệ thống. Bạn có chắc chắn?"
          confirmLabel="Bỏ qua"
          onConfirm={() => handleDismiss(confirmDismiss)}
          onClose={() => setConfirmDismiss(null)}
        />
      )}

      <div>
        <h2 className="text-2xl font-extrabold text-stone-900 mb-1">Báo Cáo Vi Phạm</h2>
        <p className="text-sm text-stone-500">Xử lý các báo cáo vi phạm từ người tìm phòng đối với chất lượng phòng hoặc hành vi chủ trọ.</p>
      </div>

      {reports.length === 0 ? (
        <EmptyState icon="fa-flag" text="Không có báo cáo vi phạm nào." />
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Nội dung vi phạm</th>
                  <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Đối tượng bị báo cáo</th>
                  <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Người báo cáo</th>
                  <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Trạng thái</th>
                  <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {reports.map(rep => {
                  const id = rep._id || rep.id;
                  const isPending = (rep.status || 'pending') === 'pending';
                  return (
                    <tr key={id} className="hover:bg-stone-50/50">
                      <td className="py-4 px-6">
                        <p className="font-bold text-stone-900">{rep.reason || '—'}</p>
                        <p className="text-xs text-stone-500 mt-1 max-w-xs line-clamp-2">{rep.description || ''}</p>
                      </td>
                      <td className="py-4 px-6 font-semibold text-stone-700 text-xs">{rep.entityType ? `${rep.entityType}` : '—'}</td>
                      <td className="py-4 px-6 text-stone-500">{rep.reporter?.name || rep.reporter?.email || '—'}</td>
                      <td className="py-4 px-6">
                        <StatusBadge status={rep.status || 'pending'} map={REPORT_STATUS_MAP} />
                      </td>
                      <td className="py-4 px-6 text-right">
                        {isPending ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleResolve(rep)}
                              disabled={processing === id}
                              className="px-4 py-1.5 bg-green-600 text-white rounded-full text-xs font-bold hover:bg-green-700 disabled:opacity-40 transition-colors"
                            >
                              {processing === id ? <i className="fa-solid fa-spinner animate-spin" /> : 'Giải quyết'}
                            </button>
                            <button
                              onClick={() => setConfirmDismiss(rep)}
                              disabled={processing === id}
                              className="px-4 py-1.5 bg-stone-200 text-stone-700 rounded-full text-xs font-bold hover:bg-stone-300 disabled:opacity-40 transition-colors"
                            >
                              Bỏ qua
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-stone-400 italic">Không có thao tác</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-stone-100 text-xs text-stone-500">
            Hiển thị {reports.length} báo cáo vi phạm
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   TAB: APPOINTMENTS – THEO DÕI LỊCH HẸN
═══════════════════════════════════════════════════════════════════════════ */
const TabAppointments = () => {
  const [appts, setAppts]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await LocafyApi.getAppointments();
      setAppts(data.data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = appts.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (b.tenantName || '').toLowerCase().includes(q) ||
      (b.roomTitle || '').toLowerCase().includes(q) ||
      (b.tenantPhone || '').includes(q);
    const matchStatus = statusFilter === 'all' || (b.status || 'pending') === statusFilter;
    return matchSearch && matchStatus;
  });

  const total   = appts.length;
  const success = appts.filter(b => b.status === 'approved').length;
  const pending = appts.filter(b => b.status === 'pending').length;

  if (loading) return <Spinner />;
  if (error)   return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-stone-900 mb-1">Theo Dõi Lịch Hẹn</h2>
        <p className="text-sm text-stone-500">Theo dõi lịch hẹn xem phòng, trạng thái cọc và lịch trình của người dùng.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { label: 'Tổng số Yêu cầu',     value: total,   sub: 'tất cả lịch hẹn',             cls: 'text-stone-900' },
          { label: 'Đã xác nhận',           value: success, sub: 'giao dịch thành công',        cls: 'text-green-600' },
          { label: 'Đang chờ xử lý',        value: pending, sub: 'chờ chủ nhà phê duyệt',       cls: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white p-5 rounded-2xl border border-stone-200/60 shadow-sm flex flex-col gap-1">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">{s.label}</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black ${s.cls}`}>{s.value}</span>
              <span className="text-xs text-stone-400">{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/60 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-xs" />
          <input
            className="w-full bg-stone-50 text-sm rounded-xl pl-10 pr-4 py-2.5 border border-stone-200 focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all"
            placeholder="Tìm kiếm theo tên người thuê, phòng..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-600 outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all">
          <option value="all">Tất cả trạng thái</option>
          <option value="pending">Chờ xác nhận</option>
          <option value="approved">Đã xác nhận</option>
          <option value="cancelled">Đã hủy</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Người thuê</th>
                <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Chủ trọ / Phòng</th>
                <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Ngày hẹn xem</th>
                <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Trạng thái</th>
                <th className="py-3 px-6 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Tiền cọc giữ chỗ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-stone-400 text-sm">
                    Không tìm thấy lịch hẹn nào phù hợp.
                  </td>
                </tr>
              ) : filtered.map(b => {
                const id = b._id || b.id;
                return (
                  <tr key={id} className="hover:bg-stone-50/50">
                    <td className="py-4 px-6">
                      <p className="font-bold text-stone-900">{b.tenantName || b.tenant?.name || '—'}</p>
                      <p className="text-xs text-stone-400">{b.tenantPhone || b.tenant?.phone || ''}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-medium text-stone-800 line-clamp-1">{b.roomTitle || b.listing?.title || '—'}</p>
                      <p className="text-xs text-stone-400">Chủ trọ: @{b.ownerUsername || b.seller?.username || '—'}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-semibold text-stone-800">{fmtDate(b.date || b.scheduledDate)}</p>
                      <p className="text-xs text-stone-400">{b.time || b.scheduledTime || ''}</p>
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={b.status || 'pending'} map={APPT_STATUS_MAP} />
                    </td>
                    <td className="py-4 px-6">
                      {b.depositPaid
                        ? <span className="text-xs font-semibold text-green-600">Đã cọc ({fmtPrice(b.depositAmount)})</span>
                        : <span className="text-xs text-stone-400">Chưa cọc ({fmtPrice(b.depositAmount)})</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-stone-100 text-xs text-stone-500">
          Hiển thị {filtered.length} / {appts.length} lịch hẹn trên hệ thống
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   TAB: CONTENT – QUẢN LÝ NỘI DUNG
═══════════════════════════════════════════════════════════════════════════ */
const TabContent = () => {
  const [subTab, setSubTab] = useState('articles');
  const [articles, setArticles] = useState([]);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const loadArticles = useCallback(async () => {
    try {
      const res = await LocafyApi.getAdminArticles({ limit: 50 });
      setArticles(res.data || []);
    } catch { /* silent */ }
  }, []);

  const loadBanners = useCallback(async () => {
    try {
      const res = await LocafyApi.getAdminBanners({ limit: 50 });
      setBanners(res.data || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadArticles(), loadBanners()]).finally(() => setLoading(false));
  }, [loadArticles, loadBanners]);

  const handlePublishToggle = async (article) => {
    try {
      await LocafyApi.publishArticle(article._id, !article.isPublished);
      setArticles(prev => prev.map(a => a._id === article._id ? { ...a, isPublished: !a.isPublished } : a));
    } catch (e) { alert('Lỗi: ' + e.message); }
  };

  const handleDeleteArticle = async (id) => {
    if (!window.confirm('Xóa bài viết này?')) return;
    setDeletingId(id);
    try {
      await LocafyApi.deleteArticle(id);
      setArticles(prev => prev.filter(a => a._id !== id));
    } catch (e) { alert('Lỗi: ' + e.message); }
    finally { setDeletingId(null); }
  };

  const handleToggleBanner = async (banner) => {
    try {
      await LocafyApi.updateBanner(banner._id, { isActive: !banner.isActive });
      setBanners(prev => prev.map(b => b._id === banner._id ? { ...b, isActive: !b.isActive } : b));
    } catch (e) { alert('Lỗi: ' + e.message); }
  };

  const handleDeleteBanner = async (id) => {
    if (!window.confirm('Xóa banner này?')) return;
    setDeletingId(id);
    try {
      await LocafyApi.deleteBanner(id);
      setBanners(prev => prev.filter(b => b._id !== id));
    } catch (e) { alert('Lỗi: ' + e.message); }
    finally { setDeletingId(null); }
  };

  const SUB_TABS = [
    { key: 'articles', label: 'Bài viết / Chính sách' },
    { key: 'faq',      label: 'FAQ' },
    { key: 'banners',  label: 'Banner' },
  ];

  const articleList = articles.filter(a => a.type !== 'faq');
  const faqList     = articles.filter(a => a.type === 'faq');

  const TYPE_LABEL = { blog: 'Blog', faq: 'FAQ', policy: 'Chính sách', guide: 'Cẩm nang' };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-extrabold text-stone-900 mb-1">Quản Lý Nội Dung</h2>
          <p className="text-sm text-stone-500">Tạo mới, biên tập bài viết cẩm nang thuê phòng hoặc các chính sách nền tảng.</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-stone-100 p-1 rounded-xl w-fit">
        {SUB_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${subTab === t.key
              ? 'bg-white text-stone-900 shadow-sm'
              : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <Spinner />}

      {/* Articles */}
      {!loading && subTab === 'articles' && (
        <div className="space-y-4">
          {articleList.length === 0
            ? <EmptyState icon="fa-newspaper" text="Chưa có bài viết nào." />
            : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {articleList.map(post => (
                  <div key={post._id} className="bg-white p-6 rounded-2xl border border-stone-200/60 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700">{TYPE_LABEL[post.type] || post.type}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${post.isPublished ? 'bg-green-50 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                          {post.isPublished ? 'Đã xuất bản' : 'Nháp'}
                        </span>
                      </div>
                      <h3 className="font-bold text-stone-900 text-base mb-2 leading-snug">{post.title}</h3>
                      <p className="text-sm text-stone-500 line-clamp-2">{post.summary || ''}</p>
                    </div>
                    <div className="flex justify-between items-center border-t border-stone-100 pt-4 mt-4">
                      <button
                        onClick={() => handlePublishToggle(post)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${post.isPublished
                          ? 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          : 'bg-green-600 text-white hover:bg-green-700'}`}
                      >
                        {post.isPublished ? 'Ẩn bài' : 'Xuất bản'}
                      </button>
                      <button
                        onClick={() => handleDeleteArticle(post._id)}
                        disabled={deletingId === post._id}
                        className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-40"
                      >
                        <i className="fa-solid fa-trash text-sm" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}

      {/* FAQ */}
      {!loading && subTab === 'faq' && (
        <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100">
            <h3 className="font-bold text-stone-900">Câu hỏi thường gặp</h3>
          </div>
          {faqList.length === 0
            ? <EmptyState icon="fa-circle-question" text="Chưa có câu hỏi FAQ nào." />
            : (
              <div className="divide-y divide-stone-100">
                {faqList.map(faq => (
                  <div key={faq._id} className="px-6 py-4 hover:bg-stone-50/50 transition-colors">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="font-bold text-stone-900 text-sm mb-1">{faq.title}</p>
                        <p className="text-sm text-stone-600 line-clamp-3">{faq.summary || ''}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handlePublishToggle(faq)}
                          className={`p-1.5 rounded-lg transition-all text-xs ${faq.isPublished ? 'text-amber-500 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}
                          title={faq.isPublished ? 'Ẩn' : 'Xuất bản'}
                        >
                          <i className={`fa-solid ${faq.isPublished ? 'fa-eye-slash' : 'fa-eye'}`} />
                        </button>
                        <button
                          onClick={() => handleDeleteArticle(faq._id)}
                          disabled={deletingId === faq._id}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-40"
                        >
                          <i className="fa-solid fa-trash text-xs" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}

      {/* Banners */}
      {!loading && subTab === 'banners' && (
        <div className="space-y-4">
          {banners.length === 0
            ? <EmptyState icon="fa-image" text="Chưa có banner nào." />
            : banners.map(banner => (
              <div key={banner._id} className="bg-white p-5 rounded-2xl border border-stone-200/60 shadow-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {banner.imageUrl
                    ? <img src={banner.imageUrl} alt={banner.title} className="w-16 h-12 rounded-xl object-cover shrink-0 border border-stone-200" />
                    : (
                      <div className="w-16 h-12 bg-stone-100 rounded-xl flex items-center justify-center text-stone-400 shrink-0">
                        <i className="fa-regular fa-image text-xl" />
                      </div>
                    )
                  }
                  <div>
                    <p className="font-bold text-stone-900 text-sm">{banner.title}</p>
                    <p className="text-xs text-stone-500 mt-0.5">Vị trí: {banner.position}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleBanner(banner)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${banner.isActive
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                  >
                    {banner.isActive ? 'Đang hiển thị' : 'Đã tắt'}
                  </button>
                  <button
                    onClick={() => handleDeleteBanner(banner._id)}
                    disabled={deletingId === banner._id}
                    className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-40"
                  >
                    <i className="fa-solid fa-trash text-sm" />
                  </button>
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   TAB: SETTINGS – CÀI ĐẶT HỆ THỐNG
═══════════════════════════════════════════════════════════════════════════ */
const TabSettings = () => {
  const { user } = useAuth();
  const [maintenance, setMaintenance]   = useState(false);
  const [emailNotifs, setEmailNotifs]   = useState(true);
  const [fullName, setFullName]         = useState(user?.name || user?.username || '');
  const [email, setEmail]               = useState(user?.email || '');
  const [phone, setPhone]               = useState(user?.phone || '');
  const [saved, setSaved]               = useState(false);

  const [saving, setSaving] = useState(false);
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await LocafyApi.updateProfile({ name: fullName, phone });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Lưu thất bại: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const ToggleSwitch = ({ checked, onChange, id }) => (
    <label htmlFor={id} className="relative inline-flex items-center cursor-pointer select-none">
      <input id={id} type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
      <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
    </label>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-stone-900 mb-1">Cài đặt & Cấu hình Hệ thống</h2>
        <p className="text-sm text-stone-500">Quản lý các cấu hình nền tảng, hồ sơ cá nhân và thiết lập chế độ bảo mật.</p>
      </div>

      {/* Admin profile */}
      <section className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <i className="fa-solid fa-id-badge" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-stone-900">Hồ sơ quản trị viên</h3>
            <p className="text-xs text-stone-400">Thông tin cá nhân quản trị hệ thống</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex flex-col items-center gap-3 shrink-0">
            <div className="w-20 h-20 rounded-full bg-purple-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-md">
              {initials(user?.name || user?.username)}
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">Super Admin</span>
          </div>

          <form onSubmit={handleSaveProfile} className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              { label: 'Họ và tên', id: 'fullname', type: 'text', value: fullName, onChange: e => setFullName(e.target.value), required: true },
              { label: 'Email', id: 'email', type: 'email', value: email, onChange: e => setEmail(e.target.value), required: true },
              { label: 'Số điện thoại', id: 'phone', type: 'tel', value: phone, onChange: e => setPhone(e.target.value) },
            ].map(f => (
              <div key={f.id} className="space-y-1.5">
                <label htmlFor={f.id} className="text-xs font-bold text-stone-600 block">{f.label}</label>
                <input
                  id={f.id}
                  type={f.type}
                  value={f.value}
                  onChange={f.onChange}
                  required={f.required}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all"
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-600 block">Chức vụ</label>
              <div className="relative">
                <input readOnly value="Super Admin" className="w-full bg-stone-100 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-500 cursor-not-allowed outline-none" />
                <i className="fa-solid fa-lock absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 text-xs" />
              </div>
            </div>
            <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
              {saved && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><i className="fa-solid fa-circle-check" /> Đã lưu thành công!</span>}
              <button type="submit" disabled={saving} className="px-6 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-full hover:bg-purple-700 active:scale-95 transition-all shadow-sm disabled:opacity-60">
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Platform config */}
      <section className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <i className="fa-solid fa-sliders" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-stone-900">Cấu hình nền tảng</h3>
            <p className="text-xs text-stone-400">Kiểm soát hoạt động toàn hệ thống</p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between p-4 rounded-xl hover:bg-stone-50/80 transition-colors">
            <div className="flex gap-3">
              <i className="fa-solid fa-screwdriver-wrench text-stone-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-stone-900">Chế độ bảo trì hệ thống</h4>
                <p className="text-xs text-stone-500">Tạm dừng truy cập của người dùng để nâng cấp hoặc sửa lỗi.</p>
              </div>
            </div>
            <ToggleSwitch id="maintenance" checked={maintenance} onChange={() => setMaintenance(p => !p)} />
          </div>
          <hr className="border-stone-100 mx-4" />
          <div className="flex items-center justify-between p-4 rounded-xl hover:bg-stone-50/80 transition-colors">
            <div className="flex gap-3">
              <i className="fa-solid fa-envelope text-stone-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-stone-900">Thông báo hệ thống qua Email</h4>
                <p className="text-xs text-stone-500">Nhận báo cáo sự cố và thống kê đăng trọ tự động hàng tuần.</p>
              </div>
            </div>
            <ToggleSwitch id="emailNotifs" checked={emailNotifs} onChange={() => setEmailNotifs(p => !p)} />
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <i className="fa-solid fa-shield-halved" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-stone-900">Bảo mật tài khoản</h3>
            <p className="text-xs text-stone-400">Cấu hình bảo vệ tài khoản và khóa mật mã</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200/60 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-purple-600 shadow-sm">
                  <i className="fa-solid fa-mobile-screen-button" />
                </div>
                <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-green-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Đã bật
                </span>
              </div>
              <h4 className="text-sm font-bold text-stone-900 mb-1">Xác thực 2 yếu tố (2FA)</h4>
              <p className="text-xs text-stone-500 leading-relaxed mb-4">Tăng cường bảo mật đăng nhập qua Google Authenticator hoặc SMS OTP.</p>
            </div>
            <button className="w-full py-2.5 bg-white border border-stone-200 hover:bg-stone-50 rounded-full text-xs font-bold text-stone-700 transition-colors shadow-sm">
              Cấu hình xác thực
            </button>
          </div>
          <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200/60 flex flex-col justify-between">
            <div>
              <div className="flex items-start mb-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-purple-600 shadow-sm">
                  <i className="fa-solid fa-key" />
                </div>
              </div>
              <h4 className="text-sm font-bold text-stone-900 mb-1">Thay đổi mật khẩu</h4>
              <p className="text-xs text-stone-500 leading-relaxed mb-4">Cập nhật mật khẩu định kỳ để tránh rủi ro xâm nhập trái phép.</p>
            </div>
            <button className="w-full py-2.5 bg-white border border-stone-200 hover:bg-stone-50 rounded-full text-xs font-bold text-stone-700 transition-colors shadow-sm">
              Đổi mật khẩu
            </button>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="bg-white rounded-2xl border border-stone-200/60 shadow-sm p-6">
        <h3 className="text-base font-extrabold text-stone-900 mb-4">Phím Hành động Nhanh</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: 'fa-download',         label: 'Tải Báo cáo' },
            { icon: 'fa-broom',            label: 'Xóa Cache' },
            { icon: 'fa-bell',             label: 'Quảng bá' },
            { icon: 'fa-database',         label: 'Backup DB' },
          ].map(a => (
            <button key={a.label} className="flex flex-col items-center justify-center p-4 bg-stone-50 border border-stone-200 rounded-xl hover:bg-stone-100 transition-colors gap-2 group cursor-pointer">
              <i className={`fa-solid ${a.icon} text-purple-600 text-xl group-hover:scale-110 transition-transform`} />
              <span className="text-xs font-bold text-stone-700">{a.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   TAB: PACKAGES – QUẢN LÝ GÓI DỊCH VỤ
═══════════════════════════════════════════════════════════════════════════ */
const TabPackages = () => {
  const [packages, setPackages] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('packages'); // 'packages' | 'transactions'
  const [pkgModal, setPkgModal] = useState(null); // null | 'create' | package object
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDuration, setFormDuration] = useState('');
  const [formTarget, setFormTarget] = useState('seller');
  const [formMaxListings, setFormMaxListings] = useState('');
  const [formFeatured, setFormFeatured] = useState(false);
  const [formFeatures, setFormFeatures] = useState('');

  const openCreate = () => {
    setFormName(''); setFormDesc(''); setFormPrice('');
    setFormDuration(''); setFormTarget('seller'); setFormMaxListings('');
    setFormFeatured(false); setFormFeatures('');
    setPkgModal('create');
  };

  const openEdit = (pkg) => {
    setFormName(pkg.name || '');
    setFormDesc(pkg.description || '');
    setFormPrice(pkg.price ?? '');
    setFormDuration(pkg.durationDays ?? '');
    setFormTarget(pkg.targetRole || 'seller');
    setFormMaxListings(pkg.maxListings ?? '');
    setFormFeatured(pkg.isFeatured || false);
    setFormFeatures(Array.isArray(pkg.features) ? pkg.features.join('\n') : (pkg.features || ''));
    setPkgModal(pkg);
  };

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [pkgsRes, txnsRes] = await Promise.all([
        LocafyApi.getServicePackages().catch(() => ({ data: [] })),
        LocafyApi.getAdminTransactions({ limit: 100 }).catch(() => ({ data: [] })),
      ]);
      setPackages(pkgsRes.data || []);
      setTransactions(txnsRes.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        description: formDesc.trim(),
        price: Number(formPrice),
        durationDays: Number(formDuration),
        targetRole: formTarget,
        maxListings: formMaxListings ? Number(formMaxListings) : null,
        isFeatured: formFeatured,
        features: formFeatures.split('\n').map(s => s.trim()).filter(Boolean),
        isActive: true,
      };
      if (pkgModal === 'create') {
        await LocafyApi.createServicePackage(payload);
      } else {
        await LocafyApi.updateServicePackage(pkgModal._id || pkgModal.id, payload);
      }
      setPkgModal(null);
      await load();
    } catch (err) {
      alert('Lỗi lưu gói: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pkg) => {
    setDeleting(pkg._id || pkg.id);
    try {
      await LocafyApi.deleteServicePackage(pkg._id || pkg.id);
      setPackages(prev => prev.filter(p => (p._id || p.id) !== (pkg._id || pkg.id)));
    } catch (err) {
      alert('Không thể xóa: ' + err.message);
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  const ROLE_LABEL = { seller: 'Chủ trọ', user: 'Người thuê', both: 'Tất cả' };
  const ROLE_COLOR = { seller: 'bg-emerald-50 text-emerald-700 border-emerald-100', user: 'bg-blue-50 text-blue-700 border-blue-100', both: 'bg-purple-50 text-purple-700 border-purple-100' };

  const TXN_STATUS_COLORS = {
    pending:   'bg-amber-50 text-amber-700 border-amber-100',
    success:   'bg-green-50 text-green-700 border-green-100',
    failed:    'bg-red-50 text-red-700 border-red-100',
    cancelled: 'bg-stone-100 text-stone-500 border-stone-200',
  };
  const TXN_STATUS_LABELS = { pending: 'Chờ TT', success: 'Thành công', failed: 'Thất bại', cancelled: 'Đã hủy' };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const inputCls = 'w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-800 focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none transition-all';
  const labelCls = 'block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5';

  return (
    <div className="space-y-6">
      {/* Delete confirm modal */}
      {confirmDelete && (
        <ConfirmModal
          title="Xóa gói dịch vụ"
          message={`Bạn có chắc muốn xóa gói "${confirmDelete.name}"? Hành động này không thể hoàn tác.`}
          confirmLabel="Xóa gói"
          confirmCls="bg-red-600 hover:bg-red-700"
          onConfirm={() => handleDelete(confirmDelete)}
          onClose={() => setConfirmDelete(null)}
        />
      )}

      {/* Package form modal */}
      {pkgModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-extrabold text-stone-900">
                {pkgModal === 'create' ? 'Tạo gói dịch vụ mới' : `Chỉnh sửa: ${pkgModal.name}`}
              </h3>
              <button onClick={() => setPkgModal(null)} className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition-colors cursor-pointer">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Tên gói *</label>
                  <input required value={formName} onChange={e => setFormName(e.target.value)} placeholder="Free, Basic, Pro, Premium..." className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Mô tả ngắn</label>
                  <input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Mô tả quyền lợi tóm tắt" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Giá (VNĐ) *</label>
                  <input required type="number" min="0" value={formPrice} onChange={e => setFormPrice(e.target.value)} placeholder="0 = Miễn phí" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Thời hạn (ngày) *</label>
                  <input required type="number" min="1" value={formDuration} onChange={e => setFormDuration(e.target.value)} placeholder="30" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Đối tượng *</label>
                  <select value={formTarget} onChange={e => setFormTarget(e.target.value)} className={inputCls}>
                    <option value="seller">Chủ trọ (Seller)</option>
                    <option value="user">Người thuê (User)</option>
                    <option value="both">Tất cả</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Giới hạn tin đăng</label>
                  <input type="number" min="0" value={formMaxListings} onChange={e => setFormMaxListings(e.target.value)} placeholder="Để trống = không giới hạn" className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Tính năng (mỗi dòng 1 tính năng)</label>
                  <textarea
                    rows={4}
                    value={formFeatures}
                    onChange={e => setFormFeatures(e.target.value)}
                    placeholder="Đăng tối đa 5 tin&#10;Hỗ trợ ưu tiên&#10;Đẩy tin 3 lần/tháng"
                    className={inputCls + ' resize-none'}
                  />
                </div>
                <div className="col-span-2 flex items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={formFeatured}
                    onChange={e => setFormFeatured(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-stone-300"
                  />
                  <label htmlFor="featured" className="text-sm font-semibold text-stone-700 cursor-pointer">
                    <i className="fa-solid fa-star text-amber-500 mr-1.5" />
                    Đánh dấu là gói nổi bật (Recommended)
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2 border-t border-stone-100">
                <button type="button" onClick={() => setPkgModal(null)} className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-full text-sm transition-colors cursor-pointer">
                  Hủy
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-full text-sm transition-colors shadow-md shadow-purple-600/20 cursor-pointer">
                  {saving ? <><i className="fa-solid fa-spinner fa-spin mr-1" />Đang lưu...</> : 'Lưu gói'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-stone-900 mb-1">Quản lý Gói Dịch Vụ</h2>
          <p className="text-sm text-stone-500">Tạo, chỉnh sửa các gói và theo dõi lịch sử thanh toán của hệ thống.</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-full shadow-md shadow-purple-600/20 transition-all cursor-pointer"
        >
          <i className="fa-solid fa-plus" />
          Tạo gói mới
        </button>
      </div>

      {/* View tabs */}
      <div className="flex gap-2">
        {[['packages', 'fa-crown', `Gói dịch vụ (${packages.length})`], ['transactions', 'fa-receipt', `Giao dịch (${transactions.length})`]].map(([view, icon, label]) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${
              activeView === view
                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                : 'bg-white text-stone-600 border-stone-200 hover:border-purple-300 hover:text-purple-600'
            }`}
          >
            <i className={`fa-solid ${icon} text-[10px]`} />
            {label}
          </button>
        ))}
      </div>

      {/* ─── Packages view ─── */}
      {activeView === 'packages' && (
        <>
          {packages.length === 0 ? (
            <EmptyState icon="fa-crown" text="Chưa có gói dịch vụ nào. Nhấn 'Tạo gói mới' để bắt đầu." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {packages.map(pkg => {
                const id = pkg._id || pkg.id;
                const isDeleting = deleting === id;
                return (
                  <div
                    key={id}
                    className={`bg-white rounded-2xl border shadow-sm flex flex-col transition-all hover:shadow-md ${
                      pkg.isFeatured ? 'border-purple-300 ring-1 ring-purple-200' : 'border-stone-200/60'
                    }`}
                  >
                    {/* Card header */}
                    <div className={`p-5 rounded-t-2xl ${
                      pkg.isFeatured
                        ? 'bg-gradient-to-br from-purple-600 to-purple-800 text-white'
                        : 'bg-stone-50 border-b border-stone-200/60'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          {pkg.isFeatured && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full mb-2">
                              <i className="fa-solid fa-star text-amber-300" /> Nổi bật
                            </span>
                          )}
                          <h3 className={`text-base font-extrabold ${pkg.isFeatured ? 'text-white' : 'text-stone-900'}`}>{pkg.name}</h3>
                          <p className={`text-[11px] mt-0.5 ${pkg.isFeatured ? 'text-purple-200' : 'text-stone-400'}`}>{pkg.description}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          pkg.isFeatured ? 'bg-white/15 text-white border-white/20' : (ROLE_COLOR[pkg.targetRole] || 'bg-stone-100 text-stone-600 border-stone-200')
                        }`}>
                          {ROLE_LABEL[pkg.targetRole] || pkg.targetRole}
                        </span>
                      </div>
                      <div className={`mt-3 flex items-baseline gap-1 ${pkg.isFeatured ? 'text-white' : 'text-stone-900'}`}>
                        <span className="text-2xl font-black">
                          {pkg.price === 0 ? 'Miễn phí' : Number(pkg.price).toLocaleString('vi-VN') + '₫'}
                        </span>
                        {pkg.price > 0 && <span className={`text-xs ${pkg.isFeatured ? 'text-purple-200' : 'text-stone-400'}`}>/{pkg.durationDays} ngày</span>}
                      </div>
                    </div>

                    {/* Features */}
                    <div className="p-4 flex-1 space-y-1.5">
                      {(Array.isArray(pkg.features) ? pkg.features : []).map((f, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-stone-600">
                          <i className="fa-solid fa-circle-check text-purple-500 text-[10px] mt-0.5 shrink-0" />
                          {f}
                        </div>
                      ))}
                      {pkg.maxListings != null && (
                        <div className="flex items-center gap-2 text-xs text-stone-500 mt-1">
                          <i className="fa-solid fa-house-chimney text-amber-500 text-[10px]" />
                          Tối đa {pkg.maxListings} tin đăng
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="px-4 pb-4 flex gap-2">
                      <button
                        onClick={() => openEdit(pkg)}
                        className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-full transition-colors cursor-pointer"
                      >
                        <i className="fa-solid fa-pencil mr-1" /> Chỉnh sửa
                      </button>
                      <button
                        onClick={() => setConfirmDelete(pkg)}
                        disabled={isDeleting}
                        className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-xs font-bold rounded-full transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        {isDeleting
                          ? <i className="fa-solid fa-spinner fa-spin" />
                          : <i className="fa-solid fa-trash" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── Transactions view ─── */}
      {activeView === 'transactions' && (
        <>
          <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
            {transactions.length === 0 ? (
              <EmptyState icon="fa-receipt" text="Chưa có giao dịch nào trong hệ thống." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="py-3 px-5 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Người dùng</th>
                      <th className="py-3 px-5 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Gói dịch vụ</th>
                      <th className="py-3 px-5 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Số tiền</th>
                      <th className="py-3 px-5 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Ngày</th>
                      <th className="py-3 px-5 text-[11px] font-bold text-stone-500 uppercase tracking-wider">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {transactions.map((t) => {
                      const statusCls = TXN_STATUS_COLORS[t.status] || 'bg-stone-100 text-stone-500 border-stone-200';
                      return (
                        <tr key={t._id} className="hover:bg-stone-50/50">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                                {initials(t.account?.name || '?')}
                              </div>
                              <div>
                                <p className="font-bold text-stone-900 text-xs">{t.account?.name || '—'}</p>
                                <p className="text-[10px] text-stone-400">{t.account?.email || ''}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 font-semibold text-stone-700 text-xs">{t.servicePackage?.name || '—'}</td>
                          <td className="py-3.5 px-5 font-black text-purple-700 text-sm">{fmtPrice(t.amount)}</td>
                          <td className="py-3.5 px-5 text-stone-500 text-xs">{fmtDate(t.createdAt)}</td>
                          <td className="py-3.5 px-5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusCls}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                              {TXN_STATUS_LABELS[t.status] || t.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Revenue summary */}
          {transactions.length > 0 && (() => {
            const success = transactions.filter(t => t.status === 'success');
            const total = success.reduce((s, t) => s + (t.amount || 0), 0);
            const pending = transactions.filter(t => t.status === 'pending').length;
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Tổng giao dịch', value: transactions.length, icon: 'fa-receipt', color: 'bg-stone-50 text-stone-600 border-stone-200' },
                  { label: 'Thành công', value: success.length, icon: 'fa-circle-check', color: 'bg-green-50 text-green-700 border-green-100' },
                  { label: 'Doanh thu', value: fmtPrice(total), icon: 'fa-wallet', color: 'bg-purple-50 text-purple-700 border-purple-100' },
                  { label: 'Đang chờ', value: pending, icon: 'fa-hourglass-half', color: 'bg-amber-50 text-amber-700 border-amber-100' },
                ].map(s => (
                  <div key={s.label} className={`border rounded-2xl p-4 flex items-center gap-3 ${s.color}`}>
                    <div className="w-9 h-9 rounded-xl bg-white/60 border border-current/20 flex items-center justify-center shrink-0">
                      <i className={`fa-solid ${s.icon} text-sm`} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{s.label}</p>
                      <p className="text-base font-black">{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dropdown states & refs
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const notificationDropdownRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setNotificationDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch pending items for the admin notification bell
  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const [accountsRes, listingsRes, reportsRes] = await Promise.all([
          LocafyApi.getAdminAccounts({ role: 'seller', limit: 100 }),
          LocafyApi.getAdminListings({ status: 'pending', limit: 100 }),
          LocafyApi.getAdminReports({ limit: 100 })
        ]);

        const allSellers = accountsRes.data || [];
        const pendingSellers = allSellers.filter(s => (s.verificationStatus || 'pending') === 'pending');
        
        const pendingListings = listingsRes.data || [];
        
        const allReports = reportsRes.data || [];
        const pendingReports = allReports.filter(r => r.status === 'pending' || r.status === 'reviewing');

        const list = [];
        pendingSellers.forEach(acc => {
          list.push({
            id: acc._id || acc.id,
            type: 'seller',
            title: 'Yêu cầu xác minh chủ trọ',
            desc: `${acc.name || acc.username || 'Chủ trọ'} đang chờ duyệt hồ sơ.`,
            time: 'Chờ duyệt',
            tab: 'verify-sellers',
            icon: 'fa-user-check',
            iconBg: 'bg-admin-50 text-admin-600'
          });
        });
        
        pendingListings.forEach(l => {
          list.push({
            id: l._id || l.id,
            type: 'listing',
            title: 'Kiểm duyệt tin đăng',
            desc: `Tin đăng "${l.title}" đang chờ duyệt.`,
            time: 'Chờ duyệt',
            tab: 'listings',
            icon: 'fa-bed',
            iconBg: 'bg-amber-50 text-amber-600'
          });
        });

        pendingReports.forEach(r => {
          list.push({
            id: r._id || r.id,
            type: 'report',
            title: 'Báo cáo vi phạm',
            desc: `Lý do: ${r.reason || 'Nội dung không phù hợp'}.`,
            time: 'Chờ xử lý',
            tab: 'reports',
            icon: 'fa-flag',
            iconBg: 'bg-rose-50 text-rose-600'
          });
        });

        setNotifications(list.slice(0, 5));
        setNotificationCount(list.length);
      } catch (err) {
        console.error('Error fetching admin alerts:', err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const setTab = (key) => {
    setSearchParams({ tab: key });
    setSidebarOpen(false);
  };

  const TAB_COMPONENTS = {
    'dashboard':     <TabDashboard />,
    'verify-sellers': <TabVerifySellers />,
    'listings':      <TabListings />,
    'users':         <TabUsers />,
    'reports':       <TabReports />,
    'appointments':  <TabAppointments />,
    'packages':      <TabPackages />,
    'content':       <TabContent />,
    'settings':      <TabSettings />,
  };

  const currentNavItem = NAV_ITEMS.find(n => n.key === currentTab);

  return (
    <div className="w-full h-screen overflow-hidden flex flex-col bg-stone-50 font-['Be_Vietnam_Pro',sans-serif]">
      {/* ── Top Header ── */}
      <header className="w-full h-16 bg-white border-b border-gray-150 px-6 flex items-center justify-between shrink-0 z-20 shadow-premium-sm">
        {/* Left Section: Brand Logo & Title */}
        <div className="flex items-center gap-2.5">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors text-stone-500 mr-1 cursor-pointer"
          >
            <i className="fa-solid fa-bars text-sm" />
          </button>
          
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition">
            <div className="w-9 h-9 rounded-lg bg-admin-600 flex items-center justify-center text-white font-extrabold shadow-premium-sm shadow-admin-500/10">
              <i className="fa-solid fa-house-chimney text-sm" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-admin-900 leading-none block">Locafy</span>
              <span className="text-[9px] block font-bold text-admin-600 uppercase tracking-wider mt-0.5">Kênh Quản Trị</span>
            </div>
          </Link>
        </div>

        {/* Right Section: Actions & Profile Dropdown */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-admin-50 text-admin-700 text-xs font-bold border-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Hệ thống: Hoạt động
          </div>

          {/* Notification Dropdown Container */}
          <div className="relative" ref={notificationDropdownRef}>
            <button
              onClick={() => setNotificationDropdownOpen(prev => !prev)}
              className="relative w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition border-0 cursor-pointer focus:outline-none"
            >
              <i className="fa-solid fa-bell text-sm" />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
              )}
            </button>

            {/* Dropdown Menu */}
            {notificationDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-150 rounded-2xl shadow-xl py-3 z-30 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 pb-2 border-b border-gray-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-900">Yêu cầu cần xử lý</span>
                  {notificationCount > 0 && (
                    <span className="text-[10px] bg-rose-50 text-rose-600 font-bold px-2.5 py-0.5 rounded-full">
                      {notificationCount} công việc
                    </span>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto py-1">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-gray-450 text-xs flex flex-col items-center justify-center gap-1.5">
                      <i className="fa-solid fa-circle-check text-lg text-emerald-500" />
                      <span>Hệ thống sạch! Không có việc chờ.</span>
                    </div>
                  ) : (
                    notifications.map(item => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setTab(item.tab);
                          setNotificationDropdownOpen(false);
                        }}
                        className="px-4 py-2.5 hover:bg-gray-50 transition cursor-pointer text-left border-b border-gray-50 last:border-0"
                      >
                        <div className="flex gap-2.5 items-start">
                          <div className={`w-8 h-8 rounded-lg ${item.iconBg} flex items-center justify-center shrink-0`}>
                            <i className={`fa-solid ${item.icon} text-xs`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-800 leading-tight">{item.title}</p>
                            <p className="text-[11px] text-gray-500 truncate mt-0.5">{item.desc}</p>
                            <p className="text-[10px] text-admin-600 font-bold mt-1">
                              <i className="fa-solid fa-clock mr-1" />
                              {item.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown Container */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setProfileDropdownOpen(prev => !prev)}
              className="flex items-center gap-2.5 p-1 px-2.5 rounded-xl hover:bg-gray-50/80 transition border-0 bg-transparent cursor-pointer text-left focus:outline-none"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-admin-500 to-admin-700 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                {initials(user?.name || user?.username)}
              </div>
              <div className="hidden md:block min-w-0">
                <p className="font-bold text-gray-900 text-xs truncate max-w-[120px] leading-tight">
                  {user?.name || user?.username || 'Admin'}
                </p>
                <p className="text-[10px] text-gray-400 truncate max-w-[120px] mt-0.5 leading-none">
                  {user?.email || 'admin@locafy.com'}
                </p>
              </div>
              <i className={`fa-solid fa-chevron-down text-[10px] text-gray-400 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-150 rounded-2xl shadow-xl py-1 z-30 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Logout Action */}
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    logout();
                    navigate('/');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-650 hover:bg-red-50 transition border-0 bg-transparent text-left cursor-pointer font-bold rounded-xl"
                >
                  <i className="fa-solid fa-right-from-bracket w-4 text-center" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Layout Wrapper under Header ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── SIDEBAR ── */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-150 flex flex-col py-6
          transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
            {NAV_ITEMS.map(item => {
              const isActive = currentTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl mx-0 transition-all text-left border-0 cursor-pointer ${
                    isActive
                      ? 'bg-admin-50 text-admin-700 font-extrabold shadow-none border-l-4 border-admin-600 rounded-l-none'
                      : 'text-gray-650 hover:bg-gray-50/80 hover:text-gray-900 font-bold bg-transparent'
                  }`}
                >
                  <i className={`${item.icon} w-4 text-center text-sm transition-colors ${isActive ? 'text-admin-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  <span className="text-sm">{item.label}</span>
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-admin-500" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── MAIN CONTENT AREA ── */}
        <div className="flex-grow h-full flex flex-col min-w-0 bg-stone-50/50">
          {/* Breadcrumbs internal header */}
          <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center gap-2.5 shrink-0 z-10">
            <span className="text-xs font-bold text-admin-700 uppercase tracking-wider">{currentNavItem?.label || 'Tổng quan'}</span>
            <span className="text-[10px] text-gray-300">/</span>
            <span className="text-[10px] text-gray-400 font-medium">Hệ thống Locafy</span>
          </div>

          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-12">
              {TAB_COMPONENTS[currentTab] || (
                <EmptyState icon="fa-circle-question" text="Tab không tồn tại." />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
