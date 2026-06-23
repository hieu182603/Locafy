import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  approved:  { label: 'Đã xác nhận',  cls: 'bg-green-50 text-green-700' },
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
      const [accounts, listings, appointments] = await Promise.all([
        LocafyApi.getAdminAccounts(),
        LocafyApi.getListings(),
        LocafyApi.getAppointments().catch(() => []),
      ]);
      const sellers   = accounts.filter(a => a.role === 'seller');
      const buyers    = accounts.filter(a => a.role === 'buyer');
      const pending   = listings.filter(l => l.status === 'pending' || (!l.censored && l.status !== 'rejected'));
      setStats({
        totalUsers: accounts.length,
        totalSellers: sellers.length,
        totalListings: listings.length,
        totalAppts: appointments.length,
        pendingSellers: sellers.filter(s => (s.verificationStatus || 'pending') === 'pending').length,
        pendingListings: pending.length,
        totalBuyers: buyers.length,
      });
      setPendingListings(pending.slice(0, 6));
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
    { label: 'Tổng người dùng',   value: stats.totalUsers,    icon: 'fa-users',           color: 'purple' },
    { label: 'Tổng chủ trọ',      value: stats.totalSellers,  icon: 'fa-user-tie',         color: 'amber' },
    { label: 'Tổng tin đăng',      value: stats.totalListings, icon: 'fa-house',            color: 'blue' },
    { label: 'Tổng lịch hẹn',      value: stats.totalAppts,    icon: 'fa-calendar-check',   color: 'green' },
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
      {(stats.pendingSellers > 0 || stats.pendingListings > 0) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {stats.pendingSellers > 0 && (
            <button
              onClick={() => setSearchParams({ tab: 'verify-sellers' })}
              className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl hover:bg-amber-100 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-user-clock text-sm" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900">{stats.pendingSellers} chủ trọ chờ duyệt hồ sơ</p>
                <p className="text-xs text-amber-700 mt-0.5">Nhấn để xét duyệt ngay →</p>
              </div>
            </button>
          )}
          {stats.pendingListings > 0 && (
            <button
              onClick={() => setSearchParams({ tab: 'listings' })}
              className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-2xl hover:bg-blue-100 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-bed text-sm" />
              </div>
              <div>
                <p className="text-sm font-bold text-blue-900">{stats.pendingListings} tin đăng chờ kiểm duyệt</p>
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
              Có {stats.pendingListings} tin chờ duyệt
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
                          src={item.images?.[0] || item.image || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=100&q=80'}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover shrink-0"
                        />
                        <span className="font-bold text-stone-900 line-clamp-1">{item.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-6 text-stone-600">@{item.ownerUsername || '—'}</td>
                    <td className="py-3 px-6 text-stone-500 text-xs">{item.location || item.address || '—'}</td>
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
      const accounts = await LocafyApi.getAdminAccounts();
      setSellers(accounts.filter(a => a.role === 'seller'));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleVerify = async (seller, status, rejectedReason = '') => {
    setProcessing(seller._id || seller.id);
    try {
      await LocafyApi.verifySeller(seller._id || seller.id, { verificationStatus: status, verificationRejectedReason: rejectedReason });
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
      const data = await LocafyApi.getListings();
      setListings(data);
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
                          src={item.images?.[0] || item.image || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=100&q=80'}
                          alt=""
                          className="w-12 h-12 rounded-xl object-cover shrink-0"
                        />
                        <div>
                          <p className="font-bold text-stone-900 line-clamp-1">{item.title}</p>
                          <p className="text-xs text-stone-400">{item.roomType || item.category || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-stone-600 text-xs max-w-[160px] line-clamp-2">{item.location || item.address || '—'}</td>
                    <td className="py-4 px-6 text-stone-500">@{item.ownerUsername || '—'}</td>
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
      const data = await LocafyApi.getAdminAccounts();
      setUsers(data);
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
        (u._id || u.id) === id ? { ...u, isBlocked: !u.isBlocked } : u
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
      (statusFilter === 'active' && !u.isBlocked) ||
      (statusFilter === 'blocked' && u.isBlocked);
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
          title={confirmTarget.isBlocked ? 'Mở khóa tài khoản?' : 'Khóa tài khoản?'}
          message={confirmTarget.isBlocked
            ? `Tài khoản "${confirmTarget.username}" sẽ được mở khóa và hoạt động trở lại.`
            : `Tài khoản "${confirmTarget.username}" sẽ bị khóa và không thể đăng nhập.`
          }
          confirmLabel={confirmTarget.isBlocked ? 'Mở khóa' : 'Khóa'}
          confirmCls={confirmTarget.isBlocked ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
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
                const isSelf    = u.username === currentUser?.username;
                const isBlocked = u.isBlocked || false;
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
      const data = await LocafyApi.getAdminReports();
      setReports(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleResolve = async (report) => {
    const id = report._id || report.id;
    setProcessing(id);
    try {
      // API call if available, else optimistic
      if (LocafyApi.resolveReport) {
        await LocafyApi.resolveReport(id);
      }
      setReports(prev => prev.map(r => (r._id || r.id) === id ? { ...r, status: 'resolved' } : r));
    } catch (e) { alert('Thao tác thất bại: ' + e.message); }
    finally { setProcessing(null); }
  };

  const handleDismiss = async (report) => {
    const id = report._id || report.id;
    setProcessing(id);
    try {
      if (LocafyApi.dismissReport) {
        await LocafyApi.dismissReport(id);
      }
      setReports(prev => prev.filter(r => (r._id || r.id) !== id));
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
                        <p className="font-bold text-stone-900">{rep.type || rep.reason || rep.title || '—'}</p>
                        <p className="text-xs text-stone-500 mt-1 max-w-xs line-clamp-2">{rep.desc || rep.description || ''}</p>
                      </td>
                      <td className="py-4 px-6 font-semibold text-stone-700">{rep.target || rep.reportedEntity || '—'}</td>
                      <td className="py-4 px-6 text-stone-500">{rep.sender || rep.reporterName || rep.reportedBy || '—'}</td>
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
      setAppts(data);
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

  const ARTICLES = [
    { id: 1, title: '5 Kinh nghiệm vàng khi đi thuê phòng trọ', category: 'Cẩm nang', author: 'Ban biên tập', date: '21/10/2023', views: 1242, status: 'published', body: 'Hãy cẩn thận kiểm tra hệ thống điện nước, đồng hồ công tơ trước khi đặt bút ký hợp đồng.' },
    { id: 2, title: 'Quy định đăng tin và chính sách kiểm duyệt Locafy', category: 'Chính sách', author: 'Quản trị viên', date: '18/10/2023', views: 890, status: 'published', body: 'Các tin đăng trùng lặp hoặc chứa hình ảnh phản cảm sẽ bị gỡ bỏ ngay lập tức.' },
  ];

  const FAQS = [
    { q: 'Làm thế nào để đăng ký tài khoản chủ trọ?', a: 'Chọn "Đăng ký" trên trang chủ, chọn vai trò Chủ trọ và điền đầy đủ thông tin.' },
    { q: 'Tin đăng mất bao lâu để được duyệt?', a: 'Thường trong vòng 24 giờ làm việc. Admin sẽ kiểm tra và phê duyệt.' },
    { q: 'Tiền đặt cọc được hoàn lại khi nào?', a: 'Cọc được hoàn trả trong 7 ngày làm việc nếu không ký hợp đồng.' },
  ];

  const BANNERS = [
    { id: 1, name: 'Banner Trang Chủ Hero', position: 'Homepage', status: 'active', size: '1200×400px' },
    { id: 2, name: 'Banner Khuyến mãi Tháng 12', position: 'Listing Page', status: 'inactive', size: '728×90px' },
  ];

  const SUB_TABS = [
    { key: 'articles', label: 'Bài viết' },
    { key: 'faq',      label: 'FAQ' },
    { key: 'banners',  label: 'Banner' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-extrabold text-stone-900 mb-1">Quản Lý Nội Dung</h2>
          <p className="text-sm text-stone-500">Tạo mới, biên tập bài viết cẩm nang thuê phòng hoặc các chính sách nền tảng.</p>
        </div>
        {subTab === 'articles' && (
          <button className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-full hover:bg-purple-700 transition-colors shadow-sm">
            <i className="fa-solid fa-plus text-xs" />
            Viết bài mới
          </button>
        )}
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

      {/* Articles */}
      {subTab === 'articles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ARTICLES.map(post => (
            <div key={post.id} className="bg-white p-6 rounded-2xl border border-stone-200/60 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700">{post.category}</span>
                  <span className="text-xs text-stone-400">{post.date}</span>
                </div>
                <h3 className="font-bold text-stone-900 text-base mb-2 leading-snug">{post.title}</h3>
                <p className="text-sm text-stone-500 line-clamp-3">{post.body}</p>
              </div>
              <div className="flex justify-between items-center border-t border-stone-100 pt-4 mt-4">
                <p className="text-xs text-stone-400">Tác giả: {post.author} • {post.views.toLocaleString()} lượt xem</p>
                <div className="flex gap-2">
                  <button className="p-2 text-stone-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all">
                    <i className="fa-solid fa-pen-to-square text-sm" />
                  </button>
                  <button className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                    <i className="fa-solid fa-trash text-sm" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAQ */}
      {subTab === 'faq' && (
        <div className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden">
          <div className="flex justify-between items-center px-6 py-4 border-b border-stone-100">
            <h3 className="font-bold text-stone-900">Câu hỏi thường gặp</h3>
            <button className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-full hover:bg-purple-700 transition-colors">
              <i className="fa-solid fa-plus" /> Thêm câu hỏi
            </button>
          </div>
          <div className="divide-y divide-stone-100">
            {FAQS.map((faq, i) => (
              <div key={i} className="px-6 py-4 hover:bg-stone-50/50 transition-colors">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <p className="font-bold text-stone-900 text-sm mb-1">{faq.q}</p>
                    <p className="text-sm text-stone-600">{faq.a}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button className="p-1.5 text-stone-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all">
                      <i className="fa-solid fa-pen-to-square text-xs" />
                    </button>
                    <button className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                      <i className="fa-solid fa-trash text-xs" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Banners */}
      {subTab === 'banners' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="flex items-center gap-1.5 px-5 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-full hover:bg-purple-700 transition-colors shadow-sm">
              <i className="fa-solid fa-plus text-xs" /> Thêm banner
            </button>
          </div>
          {BANNERS.map(banner => (
            <div key={banner.id} className="bg-white p-5 rounded-2xl border border-stone-200/60 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-10 bg-stone-100 rounded-xl flex items-center justify-center text-stone-400 shrink-0">
                  <i className="fa-regular fa-image text-xl" />
                </div>
                <div>
                  <p className="font-bold text-stone-900 text-sm">{banner.name}</p>
                  <p className="text-xs text-stone-500 mt-0.5">Vị trí: {banner.position} • Kích thước: {banner.size}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${banner.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-stone-100 text-stone-600'}`}>
                  {banner.status === 'active' ? 'Đang hiển thị' : 'Đã tắt'}
                </span>
                <button className="p-1.5 text-stone-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all">
                  <i className="fa-solid fa-pen-to-square text-sm" />
                </button>
                <button className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                  <i className="fa-solid fa-trash text-sm" />
                </button>
              </div>
            </div>
          ))}
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

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
              <button type="submit" className="px-6 py-2.5 bg-purple-600 text-white text-sm font-bold rounded-full hover:bg-purple-700 active:scale-95 transition-all shadow-sm">
                Lưu thay đổi
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
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'dashboard';
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    'content':       <TabContent />,
    'settings':      <TabSettings />,
  };

  const currentNavItem = NAV_ITEMS.find(n => n.key === currentTab);

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50 font-['Be_Vietnam_Pro',sans-serif]">

      {/* ── Sidebar Overlay (mobile) ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-stone-900 text-white shadow-xl flex flex-col py-6
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand */}
        <div className="px-5 mb-6 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 group">
            <div className="bg-white/15 group-hover:bg-white/25 transition-colors p-2 rounded-lg">
              <i className="fa-solid fa-house-chimney text-white text-sm" />
            </div>
            <span className="text-lg font-extrabold text-white tracking-tight">Locafy</span>
          </button>
          <span className="ml-auto text-[10px] font-bold bg-purple-600/80 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 space-y-1">
          {NAV_ITEMS.map(item => {
            const isActive = currentTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mx-0 transition-all text-left ${
                  isActive
                    ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-900/30'
                    : 'text-stone-300 hover:text-white hover:bg-white/10 font-medium'
                }`}
              >
                <i className={`${item.icon} w-4 text-center text-sm`} />
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="mt-auto px-4 pt-4 border-t border-white/10 mx-2">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-stone-300 hover:text-white hover:bg-white/10 transition-colors rounded-xl text-sm"
          >
            <i className="fa-solid fa-right-from-bracket w-4 text-center" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">

        {/* Header */}
        <header className="shrink-0 bg-white/90 backdrop-blur-md border-b border-stone-200/60 flex items-center justify-between h-16 px-6 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-stone-100 transition-colors text-stone-600"
            >
              <i className="fa-solid fa-bars" />
            </button>
            <div>
              <h1 className="text-base font-extrabold text-stone-900">
                {currentNavItem?.label || 'Trang Quản Trị Hệ Thống'}
              </h1>
              <p className="text-[11px] text-stone-400 hidden sm:block">Trang Quản Trị Hệ Thống Locafy</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-stone-800 leading-tight">{user?.name || user?.username || 'Admin'}</p>
              <p className="text-[11px] text-stone-400">Quản trị viên</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              {initials(user?.name || user?.username)}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-12">
            {TAB_COMPONENTS[currentTab] || (
              <EmptyState icon="fa-circle-question" text="Tab không tồn tại." />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
