import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LocafyApi } from '../../services/api';
import ListingCard from '../../components/ListingCard';
import { socket } from '../../services/socket';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return 'U';
  return name
    .trim()
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Status badge config ─────────────────────────────────────────────────────

const APPT_STATUS = {
  pending:   { label: 'Chờ xác nhận',    cls: 'bg-amber-50 text-amber-700 border-amber-200',    icon: 'fa-hourglass-half' },
  confirmed: { label: 'Đã xác nhận',     cls: 'bg-green-50 text-green-700 border-green-200',    icon: 'fa-circle-check' },
  proposed:  { label: 'Đề xuất giờ mới', cls: 'bg-blue-50 text-blue-700 border-blue-200',       icon: 'fa-calendar-pen' },
  cancelled: { label: 'Đã hủy',          cls: 'bg-red-50 text-red-500 border-red-200',          icon: 'fa-circle-xmark' },
  completed: { label: 'Hoàn thành',      cls: 'bg-teal-50 text-teal-700 border-teal-200',       icon: 'fa-flag-checkered' },
  no_show:   { label: 'Không đến',       cls: 'bg-stone-100 text-stone-500 border-stone-200',   icon: 'fa-user-xmark' },
};

const NOTIF_ICON = {
  appointment: { icon: 'fa-calendar-days', cls: 'bg-blue-100 text-blue-600' },
  chat:        { icon: 'fa-comment-dots',  cls: 'bg-violet-100 text-violet-600' },
  payment:     { icon: 'fa-wallet',        cls: 'bg-emerald-100 text-emerald-600' },
  listing:     { icon: 'fa-house',         cls: 'bg-orange-100 text-orange-600' },
  system:      { icon: 'fa-bell',          cls: 'bg-gray-100 text-gray-600' },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center items-center py-16">
      <div className="w-8 h-8 rounded-full border-[3px] border-blue-100 border-t-blue-600 animate-spin" />
    </div>
  );
}

function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-400 flex items-center justify-center mb-4 shadow-inner">
        <i className={`fa-solid ${icon} text-2xl`} />
      </div>
      <h3 className="text-base font-bold text-gray-800 mb-1">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 max-w-xs leading-relaxed mb-5">{subtitle}</p>}
      {action}
    </div>
  );
}

function SectionTitle({ children, badge }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <h2 className="text-lg font-extrabold text-gray-900">{children}</h2>
      {badge != null && badge > 0 && (
        <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
          {badge}
        </span>
      )}
    </div>
  );
}

// ─── Tab: Profile ─────────────────────────────────────────────────────────────

function ProfileTab({ user, updateUser }) {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null); // { type, text }

  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passSaving, setPassSaving] = useState(false);
  const [passMsg, setPassMsg] = useState(null);

  const showMsg = (setter, type, text) => {
    setter({ type, text });
    setTimeout(() => setter(null), 4000);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await LocafyApi.updateProfile({ name, phone, avatarUrl });
      updateUser({ name, phone, avatarUrl });
      showMsg(setProfileMsg, 'success', 'Cập nhật thông tin thành công!');
    } catch (err) {
      showMsg(setProfileMsg, 'error', err.message || 'Đã có lỗi xảy ra.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPass.length < 6) {
      showMsg(setPassMsg, 'error', 'Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPass !== confirmPass) {
      showMsg(setPassMsg, 'error', 'Mật khẩu xác nhận không khớp.');
      return;
    }
    setPassSaving(true);
    try {
      await LocafyApi.updateProfile({ oldPassword: oldPass, newPassword: newPass });
      setOldPass(''); setNewPass(''); setConfirmPass('');
      showMsg(setPassMsg, 'success', 'Đổi mật khẩu thành công!');
    } catch (err) {
      showMsg(setPassMsg, 'error', err.message || 'Mật khẩu hiện tại không đúng.');
    } finally {
      setPassSaving(false);
    }
  };

  const initials = getInitials(user?.name);
  const isEmailVerified = user?.isEmailVerified ?? false;
  const isPhoneVerified = user?.isPhoneVerified ?? false;

  return (
    <div className="space-y-8">
      {/* ── Profile card header ── */}
      <div className="flex flex-col sm:flex-row items-center gap-5 p-5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl text-white shadow-lg shadow-blue-200">
        <div className="relative shrink-0">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-20 h-20 rounded-2xl object-cover border-4 border-white/30 shadow-md" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur border-4 border-white/30 flex items-center justify-center font-black text-2xl shadow-md">
              {initials}
            </div>
          )}
          <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-400 border-2 border-white flex items-center justify-center shadow">
            <i className="fa-solid fa-check text-[9px] text-white" />
          </div>
        </div>
        <div className="text-center sm:text-left">
          <h3 className="text-lg font-black">{user?.name || 'Người dùng'}</h3>
          <p className="text-blue-100 text-xs mt-0.5">{user?.email}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${isEmailVerified ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200' : 'bg-white/10 border-white/20 text-blue-200'}`}>
              <i className={`fa-solid ${isEmailVerified ? 'fa-circle-check' : 'fa-circle-exclamation'} text-[9px]`} />
              {isEmailVerified ? 'Email đã xác minh' : 'Email chưa xác minh'}
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${isPhoneVerified ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200' : 'bg-white/10 border-white/20 text-blue-200'}`}>
              <i className={`fa-solid ${isPhoneVerified ? 'fa-circle-check' : 'fa-circle-exclamation'} text-[9px]`} />
              {isPhoneVerified ? 'SĐT đã xác minh' : 'SĐT chưa xác minh'}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 border border-white/20 text-blue-100">
              <i className="fa-solid fa-user text-[9px]" />
              {user?.role === 'seller' ? 'Chủ phòng' : 'Người thuê'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Form: Thông tin cá nhân ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <i className="fa-solid fa-user text-sm" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Thông tin cá nhân</h3>
            <p className="text-[11px] text-gray-400">Cập nhật họ tên, số điện thoại và ảnh đại diện</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email tài khoản</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-400 cursor-not-allowed outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Họ và tên <span className="text-red-400">*</span></label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Số điện thoại</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912 345 678"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">URL ảnh đại diện</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          {profileMsg && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold ${profileMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
              <i className={`fa-solid ${profileMsg.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`} />
              {profileMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={profileSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition shadow-sm shadow-blue-200"
          >
            {profileSaving ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang lưu...</> : <><i className="fa-solid fa-floppy-disk" /> Lưu thay đổi</>}
          </button>
        </form>
      </div>

      {/* ── Form: Đổi mật khẩu ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <i className="fa-solid fa-shield-halved text-sm" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Bảo mật tài khoản</h3>
            <p className="text-[11px] text-gray-400">Thay đổi mật khẩu đăng nhập của bạn</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Mật khẩu hiện tại <span className="text-red-400">*</span></label>
              <input
                type="password"
                required
                value={oldPass}
                onChange={(e) => setOldPass(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Mật khẩu mới <span className="text-red-400">*</span></label>
              <input
                type="password"
                required
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Xác nhận mật khẩu <span className="text-red-400">*</span></label>
              <input
                type="password"
                required
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
              />
            </div>
          </div>

          {passMsg && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold ${passMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
              <i className={`fa-solid ${passMsg.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`} />
              {passMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={passSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition shadow-sm shadow-amber-200"
          >
            {passSaving ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang lưu...</> : <><i className="fa-solid fa-lock" /> Cập nhật mật khẩu</>}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Tab: Appointments ───────────────────────────────────────────────────────

function AppointmentsTab() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [cancelModal, setCancelModal] = useState(null); // appointment _id
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    LocafyApi.getAppointments()
      .then((data) => { if (mounted) setAppointments(data || []); })
      .catch(console.error)
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const handleStatusUpdate = async (id, status, cancelReason) => {
    setActionLoading(id + status);
    try {
      const updated = await LocafyApi.updateAppointmentStatus(id, { status, ...(cancelReason ? { cancelReason } : {}) });
      setAppointments((prev) =>
        prev.map((a) => (a._id === id ? { ...a, status: updated.status || status } : a))
      );
      setCancelModal(null);
      setCancelReason('');
    } catch (err) {
      alert('Thao tác thất bại: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const FILTERS = ['all', 'pending', 'confirmed', 'proposed', 'completed', 'cancelled'];
  const FILTER_LABELS = { all: 'Tất cả', pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', proposed: 'Đề xuất mới', completed: 'Hoàn thành', cancelled: 'Đã hủy' };

  const filtered = filter === 'all' ? appointments : appointments.filter((a) => a.status === filter);

  if (loading) return <Spinner />;

  return (
    <div>
      <SectionTitle>Lịch hẹn xem phòng</SectionTitle>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border transition ${
              filter === f
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="fa-calendar-xmark"
          title="Không có lịch hẹn nào"
          subtitle="Bạn chưa có lịch hẹn nào ở trạng thái này."
          action={
            <Link to="/listings" className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow">
              <i className="fa-solid fa-magnifying-glass" /> Tìm phòng trọ ngay
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((appt) => {
            const st = APPT_STATUS[appt.status] || APPT_STATUS.pending;
            const img = appt.listing?.imageUrls?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=300&q=80';
            const canCancel = appt.status === 'pending' || appt.status === 'confirmed';
            const isProposed = appt.status === 'proposed';

            return (
              <div
                key={appt._id}
                className={`bg-white border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 transition hover:shadow-md ${appt.status === 'cancelled' ? 'opacity-60 grayscale-[15%]' : 'border-gray-100 shadow-sm'}`}
              >
                {/* Image */}
                <img
                  src={img}
                  alt={appt.listing?.title}
                  className="w-full sm:w-28 h-32 sm:h-20 rounded-xl object-cover shrink-0"
                />

                {/* Details */}
                <div className="flex-grow min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <h4 className="font-bold text-gray-900 text-sm leading-snug truncate">{appt.listing?.title || 'Phòng trọ'}</h4>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${st.cls}`}>
                      <i className={`fa-solid ${st.icon} text-[9px]`} /> {st.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 text-[11px] text-gray-500 mb-2">
                    <span className="flex items-center gap-1">
                      <i className="fa-solid fa-location-dot text-blue-400" />
                      {appt.listing?.addressLine}{appt.listing?.district ? `, ${appt.listing.district}` : ''}
                    </span>
                    {appt.seller?.name && (
                      <span className="flex items-center gap-1">
                        <i className="fa-solid fa-user-tie text-blue-400" />
                        {appt.seller.name}
                        {appt.seller.phone && <span className="text-blue-500 font-semibold"> · {appt.seller.phone}</span>}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 text-[11px]">
                    <span className="flex items-center gap-1 bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-lg">
                      <i className="fa-regular fa-calendar-days" />
                      {formatDateTime(appt.scheduledAt)}
                    </span>
                    {isProposed && appt.proposedAt && (
                      <span className="flex items-center gap-1 bg-amber-50 text-amber-700 font-semibold px-2.5 py-1 rounded-lg">
                        <i className="fa-solid fa-clock-rotate-left" />
                        Đề xuất: {formatDateTime(appt.proposedAt)}
                      </span>
                    )}
                  </div>

                  {appt.userNote && (
                    <p className="text-[11px] text-gray-400 italic mt-2 pl-2.5 border-l-2 border-gray-200 leading-relaxed">
                      "{appt.userNote}"
                    </p>
                  )}

                  {/* Actions */}
                  {(canCancel || isProposed) && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {isProposed && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(appt._id, 'confirmed')}
                            disabled={!!actionLoading}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-[11px] font-bold rounded-xl transition shadow-sm"
                          >
                            {actionLoading === appt._id + 'confirmed' ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <i className="fa-solid fa-check" />}
                            Đồng ý thời gian mới
                          </button>
                          <button
                            onClick={() => setCancelModal(appt._id)}
                            disabled={!!actionLoading}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-bold rounded-xl transition"
                          >
                            <i className="fa-solid fa-xmark" /> Từ chối
                          </button>
                        </>
                      )}
                      {canCancel && !isProposed && (
                        <button
                          onClick={() => setCancelModal(appt._id)}
                          disabled={!!actionLoading}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-bold rounded-xl transition"
                        >
                          <i className="fa-solid fa-calendar-xmark" /> Hủy lịch hẹn
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <h3 className="font-bold text-gray-900 text-base mb-1">Xác nhận hủy lịch hẹn</h3>
            <p className="text-xs text-gray-500 mb-4">Vui lòng cho biết lý do hủy để chúng tôi ghi nhận.</p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ví dụ: Tôi đã tìm được phòng khác phù hợp hơn..."
              rows={3}
              className="w-full px-3.5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white transition resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setCancelModal(null); setCancelReason(''); }}
                className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-sm rounded-xl transition"
              >
                Không hủy
              </button>
              <button
                onClick={() => handleStatusUpdate(cancelModal, 'cancelled', cancelReason)}
                disabled={!!actionLoading}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition shadow-sm"
              >
                {actionLoading ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Favorites ──────────────────────────────────────────────────────────

function FavoritesTab() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const data = await LocafyApi.getFavorites();
      setFavorites(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFavorites(); }, [loadFavorites]);

  const handleRemove = async (listingId) => {
    if (!window.confirm('Xóa phòng trọ này khỏi danh sách yêu thích?')) return;
    try {
      await LocafyApi.toggleFavorite(listingId);
      setFavorites((prev) => prev.filter((l) => l._id !== listingId));
    } catch (err) {
      alert('Thao tác thất bại: ' + err.message);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <SectionTitle>Tin đăng đã lưu</SectionTitle>

      {favorites.length === 0 ? (
        <EmptyState
          icon="fa-heart-crack"
          title="Danh sách yêu thích trống"
          subtitle="Bạn chưa lưu phòng trọ nào. Hãy tìm và lưu những tin ưng ý."
          action={
            <Link to="/listings" className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow">
              <i className="fa-solid fa-compass" /> Khám phá phòng trọ
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {favorites.map((listing) => (
            <div key={listing._id} className="relative group">
              <ListingCard listing={listing} />
              <button
                onClick={() => handleRemove(listing._id)}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white text-rose-500 hover:text-rose-600 hover:bg-rose-50 shadow-md border border-gray-100 flex items-center justify-center transition opacity-0 group-hover:opacity-100"
                title="Xóa khỏi yêu thích"
              >
                <i className="fa-solid fa-heart-crack text-xs" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Notifications ──────────────────────────────────────────────────────

function NotificationsTab() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    LocafyApi.getNotifications()
      .then((data) => { if (mounted) setNotifications(data || []); })
      .catch(console.error)
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkRead = async (id) => {
    try {
      await LocafyApi.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const displayed = notifications
    .filter((n) => filter === 'all' || !n.isRead)
    .sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  if (loading) return <Spinner />;

  return (
    <div>
      <SectionTitle badge={unreadCount}>Thông báo hệ thống</SectionTitle>

      {/* Filter pills */}
      <div className="flex gap-2 mb-5">
        {[['all', 'Tất cả'], ['unread', 'Chưa đọc']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition ${
              filter === val
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            {label}
            {val === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <EmptyState
          icon="fa-bell-slash"
          title="Không có thông báo nào"
          subtitle="Chúng tôi sẽ gửi thông báo khi có tin tức mới liên quan đến bạn."
        />
      ) : (
        <div className="space-y-2.5">
          {displayed.map((n) => {
            const cfg = NOTIF_ICON[n.type] || NOTIF_ICON.system;
            return (
              <div
                key={n._id}
                onClick={() => !n.isRead && handleMarkRead(n._id)}
                className={`flex items-start gap-4 p-4 rounded-2xl border transition cursor-pointer group ${
                  n.isRead
                    ? 'bg-white border-gray-100 hover:bg-gray-50'
                    : 'bg-blue-50/50 border-blue-100 hover:bg-blue-50 shadow-sm'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.cls}`}>
                  <i className={`fa-solid ${cfg.icon} text-sm`} />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`text-sm font-bold leading-snug ${n.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                      {n.title}
                    </h4>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{n.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Chat ───────────────────────────────────────────────────────────────

function ChatsTab({ user, initialChatId, onChatChange }) {
  const [conversations, setConversations] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [activeChatId, setActiveChatId] = useState(initialChatId || '');
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Load conversations
  useEffect(() => {
    setLoadingConvs(true);
    LocafyApi.getConversations()
      .then((data) => setConversations(data || []))
      .catch(console.error)
      .finally(() => setLoadingConvs(false));
  }, []);

  // Set active conv from initialChatId
  useEffect(() => {
    if (initialChatId && conversations.length > 0) {
      const found = conversations.find((c) => c._id === initialChatId);
      if (found) selectConversation(found);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChatId, conversations]);

  const selectConversation = useCallback(async (conv) => {
    setActiveChatId(conv._id);
    setActiveConv(conv);
    if (onChatChange) onChatChange(conv._id);
    setLoadingMsgs(true);
    try {
      const msgs = await LocafyApi.getMessages(conv._id);
      setMessages(msgs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMsgs(false);
    }
  }, [onChatChange]);

  // Socket.io: join room & receive messages
  useEffect(() => {
    if (!activeChatId || !user) return;

    socket.connect();
    socket.emit('join_room', activeChatId);

    const handleReceiveMessage = (msg) => {
      setMessages((prev) => [
        ...prev,
        {
          _id: msg._id || Date.now(),
          text: msg.text,
          senderId: msg.senderId,
          createdAt: msg.createdAt || new Date().toISOString(),
          type: msg.type || 'text',
        },
      ]);
    };

    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.disconnect();
    };
  }, [activeChatId, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMsg.trim() || !activeChatId || sending) return;
    setSending(true);
    const text = newMsg.trim();
    setNewMsg('');
    try {
      const sent = await LocafyApi.sendMessage({ conversationId: activeChatId, text, type: 'text' });
      // The socket will echo back; only add if no socket echo is expected
      setMessages((prev) => [
        ...prev,
        { _id: sent._id || Date.now(), text, senderId: user?._id, createdAt: sent.createdAt || new Date().toISOString(), type: 'text' },
      ]);
    } catch (err) {
      alert('Không gửi được tin nhắn: ' + err.message);
      setNewMsg(text); // restore
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const isMine = (msg) => msg.senderId === user?._id;

  return (
    <div>
      <SectionTitle>Hộp thư trao đổi</SectionTitle>

      <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white" style={{ height: 560 }}>
        <div className="grid h-full" style={{ gridTemplateColumns: '260px 1fr' }}>

          {/* Conversations sidebar */}
          <div className="border-r border-gray-100 flex flex-col h-full bg-gray-50/60">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hội thoại</p>
            </div>
            <div className="flex-grow overflow-y-auto">
              {loadingConvs ? (
                <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
              ) : conversations.length === 0 ? (
                <div className="p-5 text-center text-xs text-gray-400">
                  <i className="fa-regular fa-comment-dots text-2xl text-gray-200 mb-2 block" />
                  Chưa có cuộc hội thoại nào
                </div>
              ) : (
                conversations.map((conv) => {
                  const active = activeChatId === conv._id;
                  const sellerName = conv.seller?.name || 'Chủ phòng';
                  const sellerAvatar = conv.seller?.avatarUrl;
                  const sellerInitials = getInitials(sellerName);
                  return (
                    <button
                      key={conv._id}
                      onClick={() => selectConversation(conv)}
                      className={`w-full text-left px-4 py-3.5 border-b border-gray-100 flex items-center gap-3 transition hover:bg-blue-50/50 ${active ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
                    >
                      {/* Avatar */}
                      {sellerAvatar ? (
                        <img src={sellerAvatar} alt={sellerName} className="w-9 h-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {sellerInitials}
                        </div>
                      )}
                      <div className="min-w-0 flex-grow">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-xs font-bold truncate ${active ? 'text-blue-700' : 'text-gray-800'}`}>
                            {sellerName}
                          </span>
                          {conv.unreadByUser > 0 && (
                            <span className="shrink-0 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                              {conv.unreadByUser}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                          {conv.listing?.title || 'Phòng trọ'}
                        </p>
                        <p className={`text-[10px] truncate mt-0.5 ${conv.unreadByUser > 0 ? 'text-gray-700 font-semibold' : 'text-gray-400'}`}>
                          {conv.lastMessage || 'Chưa có tin nhắn'}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat window */}
          <div className="flex flex-col h-full">
            {!activeChatId ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300">
                <i className="fa-regular fa-comment-dots text-5xl mb-3" />
                <p className="text-sm font-semibold text-gray-400">Chọn một hội thoại để bắt đầu</p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="px-5 py-3.5 border-b border-gray-100 bg-white flex items-center gap-3 shrink-0">
                  {activeConv?.seller?.avatarUrl ? (
                    <img src={activeConv.seller.avatarUrl} className="w-8 h-8 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                      {getInitials(activeConv?.seller?.name)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-gray-900">{activeConv?.seller?.name || 'Chủ phòng'}</p>
                    {activeConv?.listing?.title && (
                      <p className="text-[11px] text-gray-400 truncate max-w-[200px]">{activeConv.listing.title}</p>
                    )}
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-gray-400">Trực tuyến</span>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-grow overflow-y-auto p-4 space-y-3 bg-gray-50/40">
                  {loadingMsgs ? (
                    <div className="flex justify-center pt-8"><div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center">
                      <div>
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                          <i className="fa-regular fa-paper-plane text-blue-400 text-lg" />
                        </div>
                        <p className="text-xs text-gray-400">Gửi tin nhắn để bắt đầu cuộc trò chuyện</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const mine = isMine(msg);
                      return (
                        <div key={msg._id || idx} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          {!mine && (
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold mr-2 self-end shrink-0">
                              {getInitials(activeConv?.seller?.name)}
                            </div>
                          )}
                          <div className={`max-w-[70%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                              mine
                                ? 'bg-blue-600 text-white rounded-br-md'
                                : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-md'
                            }`}>
                              {msg.text}
                            </div>
                            <span className={`text-[10px] mt-1 ${mine ? 'text-gray-400 text-right' : 'text-gray-400'}`}>
                              {msg.createdAt
                                ? new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                                : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="px-4 py-3 border-t border-gray-100 bg-white flex gap-2 items-end shrink-0">
                  <textarea
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Nhập tin nhắn... (Enter để gửi)"
                    rows={1}
                    className="flex-grow px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition resize-none"
                    style={{ maxHeight: 100, overflowY: 'auto' }}
                  />
                  <button
                    type="submit"
                    disabled={!newMsg.trim() || sending}
                    className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition shadow-sm shrink-0"
                  >
                    {sending
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <i className="fa-solid fa-paper-plane text-sm" />
                    }
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Nav Item ─────────────────────────────────────────────────────────

function NavItem({ tab, current, icon, label, badge, onClick }) {
  const active = current === tab;
  return (
    <button
      onClick={() => onClick(tab)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${
        active
          ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <i className={`fa-solid ${icon} w-4 text-center text-base`} />
      <span className="flex-grow">{label}</span>
      {badge > 0 && (
        <span className={`text-[10px] font-black min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 ${active ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}`}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const UserDashboard = () => {
  const { user, updateUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'profile';
  const chatIdParam = searchParams.get('chatId') || '';

  // Notification badge count (loaded for sidebar)
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    LocafyApi.getNotifications()
      .then((data) => {
        const unread = (data || []).filter((n) => !n.isRead).length;
        setUnreadNotifCount(unread);
      })
      .catch(() => {});
  }, [user, currentTab]);

  const goTab = (tab) => {
    setSearchParams({ tab });
  };

  const handleChatChange = (chatId) => {
    setSearchParams({ tab: 'chats', chatId });
  };

  const NAV_ITEMS = [
    { tab: 'profile',       icon: 'fa-user',           label: 'Tài khoản của tôi' },
    { tab: 'appointments',  icon: 'fa-calendar-check', label: 'Lịch hẹn xem phòng' },
    { tab: 'favorites',     icon: 'fa-heart',          label: 'Tin đã lưu' },
    { tab: 'notifications', icon: 'fa-bell',           label: 'Thông báo',          badge: unreadNotifCount },
    { tab: 'chats',         icon: 'fa-comment-dots',   label: 'Hộp thư' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Page header */}
        <div className="mb-7">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 mb-1">Trang cá nhân</p>
          <h1 className="text-2xl font-extrabold text-gray-900">
            Xin chào, {user?.name || 'bạn'} 👋
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Quản lý tài khoản và hoạt động của bạn trên Locafy</p>
        </div>

        <div className="grid md:grid-cols-[240px_1fr] gap-7 items-start">

          {/* ── Sidebar ── */}
          <aside className="md:sticky md:top-24 space-y-1">
            {/* User avatar card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-3 flex items-center gap-3">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-11 h-11 rounded-xl object-cover shrink-0 shadow-sm" />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                  {getInitials(user?.name)}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{user?.name || '—'}</p>
                <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>

            {/* Nav items */}
            <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 space-y-0.5">
              {NAV_ITEMS.map((item) => (
                <NavItem
                  key={item.tab}
                  {...item}
                  current={currentTab}
                  onClick={goTab}
                />
              ))}
            </nav>

            {/* Quick link */}
            <Link
              to="/listings"
              className="mt-3 flex items-center gap-2.5 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 rounded-xl text-xs font-bold transition"
            >
              <i className="fa-solid fa-magnifying-glass" />
              Tìm phòng trọ
            </Link>
          </aside>

          {/* ── Tab panel ── */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 min-h-[480px]">
            {currentTab === 'profile' && <ProfileTab user={user} updateUser={updateUser} />}
            {currentTab === 'appointments' && <AppointmentsTab />}
            {currentTab === 'favorites' && <FavoritesTab />}
            {currentTab === 'notifications' && <NotificationsTab />}
            {currentTab === 'chats' && (
              <ChatsTab
                user={user}
                initialChatId={chatIdParam}
                onChatChange={handleChatChange}
              />
            )}
          </section>

        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
