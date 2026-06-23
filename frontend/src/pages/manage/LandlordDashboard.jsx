import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LocafyApi } from '../../services/api';
import { socket } from '../../services/socket';

// ─── Constants ────────────────────────────────────────────────────────────────
const AMENITIES_LIST = [
  'Máy lạnh', 'Wifi Free', 'Chỗ để xe', 'Máy giặt', 'Tủ lạnh',
  'Nóng lạnh', 'Ban công', 'Thang máy', 'An ninh 24/7', 'Khóa vân tay', 'Kệ bếp',
];
const ROOM_TYPES = ['Căn hộ Studio', 'Phòng trọ khép kín', 'Chung cư mini', 'Nhà nguyên căn'];

const TABS = [
  { id: 'overview',    icon: 'fa-chart-pie',        label: 'Tổng quan' },
  { id: 'listings',   icon: 'fa-list',              label: 'Tin đăng' },
  { id: 'add-listing',icon: 'fa-circle-plus',       label: 'Tạo tin đăng' },
  { id: 'appointments',icon:'fa-calendar-check',    label: 'Lịch hẹn' },
  { id: 'tenants',    icon: 'fa-users',             label: 'Khách thuê' },
  { id: 'packages',   icon: 'fa-crown',             label: 'Gói dịch vụ' },
  { id: 'chats',      icon: 'fa-comment-dots',      label: 'Chat' },
  { id: 'verify',     icon: 'fa-shield-halved',     label: 'Xác minh' },
  { id: 'profile',    icon: 'fa-gear',              label: 'Hồ sơ' },
];

// ─── Spinner ───────────────────────────────────────────────────────────────────
const Spinner = () => (
  <div className="flex justify-center items-center py-16">
    <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
  </div>
);

// ─── EmptyState ────────────────────────────────────────────────────────────────
const EmptyState = ({ icon, title, subtitle, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
      <i className={`fa-solid ${icon} text-2xl text-emerald-400`} />
    </div>
    <p className="font-bold text-stone-700 text-base">{title}</p>
    {subtitle && <p className="text-sm text-stone-400 mt-1">{subtitle}</p>}
    {action}
  </div>
);

// ─── StatCard ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, iconBg, iconColor, label, value, badge, badgeColor }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 hover:-translate-y-0.5 transition-transform duration-200">
    <div className="flex justify-between items-start mb-4">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
        <i className={`fa-solid ${icon} ${iconColor}`} />
      </div>
      {badge && (
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
      )}
    </div>
    <p className="text-xs text-stone-500 font-medium">{label}</p>
    <p className={`text-2xl font-extrabold mt-0.5 ${iconColor}`}>{value}</p>
  </div>
);

// ─── VerificationBanner ───────────────────────────────────────────────────────
const VerificationBanner = ({ status, onGoVerify }) => {
  if (status === 'approved') return null;
  const isPending = status === 'pending';
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold mb-6 border ${
      isPending
        ? 'bg-amber-50 border-amber-200 text-amber-800'
        : 'bg-red-50 border-red-200 text-red-800'
    }`}>
      <i className={`fa-solid ${isPending ? 'fa-clock' : 'fa-triangle-exclamation'} text-base`} />
      <span className="flex-1">
        {isPending
          ? 'Hồ sơ xác minh của bạn đang chờ duyệt. Bạn chưa thể tạo tin đăng mới.'
          : 'Tài khoản chưa xác minh. Vui lòng hoàn thiện hồ sơ xác minh để đăng tin.'}
      </span>
      <button
        onClick={onGoVerify}
        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-current hover:bg-stone-50 transition whitespace-nowrap"
      >
        Xác minh ngay
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const LandlordDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'overview';
  const editId    = searchParams.get('editId') || '';

  const goTab = useCallback((tab, extra = {}) => {
    setSearchParams({ tab, ...extra });
  }, [setSearchParams]);

  // ── Shared data ─────────────────────────────────────────────────────────────
  const [loading,      setLoading]      = useState(true);
  const [myListings,   setMyListings]   = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [apptFilter,   setApptFilter]   = useState('all');
  const [tenants,      setTenants]      = useState([]);
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantStatus, setTenantStatus] = useState('all');

  // ── Listing Form ─────────────────────────────────────────────────────────────
  const [listTitle,      setListTitle]      = useState('');
  const [listType,       setListType]       = useState(ROOM_TYPES[0]);
  const [listPrice,      setListPrice]      = useState('');
  const [listArea,       setListArea]       = useState('');
  const [listPhone,      setListPhone]      = useState('');
  const [listLocation,   setListLocation]   = useState('');
  const [listDesc,       setListDesc]       = useState('');
  const [listAmenities,  setListAmenities]  = useState([]);
  const [listImageUrl,   setListImageUrl]   = useState('');
  const [listImageFile,  setListImageFile]  = useState('');
  const [listSubmitting, setListSubmitting] = useState(false);

  // ── Packages / PayOS ────────────────────────────────────────────────────────
  const [packages,      setPackages]      = useState([]);
  const [mySubscription,setMySubscription]= useState(null);
  const [transactions,  setTransactions]  = useState([]);
  const [payosLoading,  setPayosLoading]  = useState(false);

  // ── Chat ────────────────────────────────────────────────────────────────────
  const [conversations,  setConversations]  = useState([]);
  const [activeChatId,   setActiveChatId]   = useState('');
  const [activeChatName, setActiveChatName] = useState('');
  const [chatMessages,   setChatMessages]   = useState([]);
  const [msgInput,       setMsgInput]       = useState('');
  const chatEndRef = useRef(null);

  // ── Profile ──────────────────────────────────────────────────────────────────
  const [profileName,  setProfileName]  = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileSaving,setProfileSaving]= useState(false);
  const [profileMsg,   setProfileMsg]   = useState(null); // { text, type }

  // ── Verify ──────────────────────────────────────────────────────────────────
  const [cccdFront,    setCccdFront]    = useState(null);
  const [cccdBack,     setCccdBack]     = useState(null);
  const [propertyDoc,  setPropertyDoc]  = useState(null);
  const [verifySubmitting, setVerifySubmitting] = useState(false);

  // ── Overview stats ───────────────────────────────────────────────────────────
  const [overviewStats, setOverviewStats] = useState({
    totalListings: 0, activeListings: 0,
    pendingAppts: 0, revenue: 0,
  });

  // ─── Fetch data per tab ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const fetchTab = async () => {
      try {
        switch (currentTab) {
          case 'overview': {
            const [listings, appts] = await Promise.all([
              LocafyApi.getListings({ seller: true }),
              LocafyApi.getAppointments(),
            ]);
            const mine = listings.filter(l => l.ownerUsername === user.username || l.sellerId === user._id);
            setMyListings(mine);
            const revenue = mine.reduce((s, l) => {
              if (l.status === 'rented' || l.rented) return s + (Number(l.price) || 0);
              return s;
            }, 0);
            setOverviewStats({
              totalListings: mine.length,
              activeListings: mine.filter(l => l.censored && l.status !== 'rented').length,
              pendingAppts: appts.filter(a => a.status === 'pending').length,
              revenue,
            });
            break;
          }
          case 'listings': {
            const listings = await LocafyApi.getListings({ seller: true });
            setMyListings(listings.filter(l => l.ownerUsername === user.username || l.sellerId === user._id));
            break;
          }
          case 'add-listing': {
            if (editId) {
              try {
                const r = await LocafyApi.getListing(editId);
                setListTitle(r.title || '');
                setListType(r.type || ROOM_TYPES[0]);
                setListPrice(r.price || '');
                setListArea(r.area || '');
                setListPhone(r.contactPhone || r.contact || user?.phone || '');
                setListLocation(r.location || '');
                setListDesc(r.description || '');
                setListAmenities(r.amenities ? r.amenities.split(',').map(s => s.trim()).filter(Boolean) : []);
                setListImageUrl(typeof r.image === 'string' && !r.image.startsWith('data:') ? r.image : '');
              } catch {}
            } else {
              setListTitle(''); setListType(ROOM_TYPES[0]); setListPrice('');
              setListArea(''); setListPhone(user?.phone || ''); setListLocation('');
              setListDesc(''); setListAmenities([]); setListImageUrl(''); setListImageFile('');
            }
            break;
          }
          case 'appointments': {
            const data = await LocafyApi.getAppointments();
            setAppointments(data);
            break;
          }
          case 'tenants': {
            // Tenants derived from approved/active appointments or contracts
            const data = await LocafyApi.getAppointments();
            setTenants(data.filter(a => a.status === 'approved'));
            break;
          }
          case 'packages': {
            const [pkgs, sub, txns] = await Promise.all([
              LocafyApi.getServicePackages(),
              LocafyApi.getMySubscription().catch(() => null),
              LocafyApi.getMyTransactions().catch(() => []),
            ]);
            setPackages(pkgs);
            setMySubscription(sub);
            setTransactions(txns);
            break;
          }
          case 'chats': {
            const convs = await LocafyApi.getConversations();
            setConversations(convs);
            if (!activeChatId && convs.length > 0) {
              selectConversation(convs[0]);
            }
            break;
          }
          case 'profile': {
            setProfileName(user.name || '');
            setProfileEmail(user.email || '');
            setProfilePhone(user.phone || '');
            break;
          }
          default: break;
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTab();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab, user, editId]);

  // ─── Socket.io Chat ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeChatId || !user) return;

    const loadMsgs = async () => {
      try {
        const msgs = await LocafyApi.getMessages(activeChatId);
        setChatMessages(msgs.map(m => ({
          sender: m.senderUsername === user.username || m.senderId === user._id ? 'me' : 'them',
          text: m.text || m.content,
          time: m.time || m.createdAt,
        })));
      } catch { setChatMessages([]); }
    };
    loadMsgs();

    socket.connect();
    socket.emit('join_room', activeChatId);

    const onReceive = (msg) => {
      setChatMessages(prev => [...prev, {
        sender: (msg.senderUsername === user.username || msg.senderId === user._id) ? 'me' : 'them',
        text: msg.text || msg.content,
        time: msg.time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      }]);
    };
    socket.on('receive_message', onReceive);

    return () => {
      socket.off('receive_message', onReceive);
      socket.disconnect();
    };
  }, [activeChatId, user]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const selectConversation = async (conv) => {
    setActiveChatId(conv._id || conv.id);
    setActiveChatName(conv.otherUserName || conv.name || 'Khách');
  };

  const toggleAmenity = (item) => {
    setListAmenities(prev =>
      prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
    );
  };

  const compressImageFile = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        const MAX = 800;
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => resolve(e.target.result);
    };
    reader.onerror = () => resolve('');
  });

  // ─── Handlers ────────────────────────────────────────────────────────────

  // Submit listing (create or edit)
  const handleListingSubmit = async (e) => {
    e.preventDefault();
    if (!listTitle || !listPrice || !listLocation) {
      alert('Vui lòng điền đầy đủ tiêu đề, giá, và địa chỉ.');
      return;
    }
    if (user.verificationStatus !== 'approved' && !editId) {
      alert('Tài khoản chưa được xác minh. Vui lòng hoàn thiện hồ sơ xác minh trước.');
      return;
    }
    setListSubmitting(true);
    try {
      let imageData = listImageUrl;
      if (listImageFile) {
        imageData = await compressImageFile(listImageFile);
      }
      const payload = {
        title: listTitle, type: listType, price: Number(listPrice),
        area: listArea, contactPhone: listPhone, location: listLocation,
        description: listDesc, amenities: listAmenities.join(', '),
        image: imageData,
        ownerUsername: user.username,
        status: 'pending', censored: false, rented: false,
      };
      if (editId) {
        await LocafyApi.updateListing(editId, payload);
        alert('Cập nhật tin đăng thành công!');
      } else {
        await LocafyApi.createListing(payload);
        alert('Đã gửi tin đăng. Chờ Admin phê duyệt.');
      }
      goTab('listings');
    } catch (err) {
      alert('Lỗi: ' + (err.message || 'Không thể lưu tin đăng'));
    } finally {
      setListSubmitting(false);
    }
  };

  // Delete listing
  const handleDeleteListing = async (id) => {
    if (!window.confirm('Xóa tin đăng này?')) return;
    try {
      await LocafyApi.deleteListing(id);
      setMyListings(prev => prev.filter(l => l._id !== id && l.id !== id));
    } catch { alert('Xóa thất bại.'); }
  };

  // Appointment actions
  const handleApptAction = async (appt, newStatus) => {
    try {
      await LocafyApi.updateAppointmentStatus(appt._id || appt.id, { status: newStatus });
      setAppointments(prev =>
        prev.map(a => (a._id === appt._id || a.id === appt.id) ? { ...a, status: newStatus } : a)
      );
    } catch { alert('Cập nhật thất bại.'); }
  };

  // Send chat message via socket
  const handleSendMsg = (e) => {
    e.preventDefault();
    if (!msgInput.trim() || !activeChatId) return;
    const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    socket.emit('send_message', {
      chatId: activeChatId, senderUsername: user.username, text: msgInput, time,
    });
    setChatMessages(prev => [...prev, { sender: 'me', text: msgInput, time }]);
    LocafyApi.sendMessage({ conversationId: activeChatId, content: msgInput }).catch(() => {});
    setMsgInput('');
  };

  // PayOS – buy package
  const createPayOSLink = async (pkg) => {
    try {
      const res = await LocafyApi.createPaymentLink({
        amount: pkg.price,
        description: `Goi ${pkg.name}`,
        packageId: pkg._id || pkg.id,
        returnUrl: window.location.origin + '/manage?tab=packages&status=success',
        cancelUrl: window.location.origin + '/manage?tab=packages&status=cancel',
      });
      return res?.checkoutUrl || res?.paymentUrl;
    } catch (err) {
      console.error('PayOS error', err);
      return null;
    }
  };

  const handleBuyPackage = async (pkg) => {
    setPayosLoading(true);
    try {
      const url = await createPayOSLink(pkg);
      if (url) window.location.href = url;
      else alert('Không thể tạo link thanh toán. Vui lòng thử lại.');
    } finally {
      setPayosLoading(false);
    }
  };

  const sendPaymentLink = async (pkg) => {
    await handleBuyPackage(pkg);
  };

  // Profile save
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      await LocafyApi.updateProfile({ name: profileName, email: profileEmail, phone: profilePhone });
      setProfileMsg({ text: 'Cập nhật hồ sơ thành công!', type: 'success' });
    } catch (err) {
      setProfileMsg({ text: 'Lưu thất bại: ' + (err.message || ''), type: 'error' });
    } finally {
      setProfileSaving(false);
      setTimeout(() => setProfileMsg(null), 3000);
    }
  };

  // Verify submit
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!cccdFront || !cccdBack) { alert('Vui lòng tải lên cả mặt trước và mặt sau CCCD.'); return; }
    setVerifySubmitting(true);
    try {
      const formData = new FormData();
      formData.append('cccdFront', cccdFront);
      formData.append('cccdBack', cccdBack);
      if (propertyDoc) formData.append('propertyDoc', propertyDoc);
      await LocafyApi.submitVerification(formData);
      alert('Hồ sơ xác minh đã được gửi! Chúng tôi sẽ kiểm tra trong 1-3 ngày làm việc.');
    } catch (err) {
      alert('Gửi hồ sơ thất bại: ' + (err.message || ''));
    } finally {
      setVerifySubmitting(false);
    }
  };

  // ─── Derived data ────────────────────────────────────────────────────────
  const filteredAppts = appointments.filter(a =>
    apptFilter === 'all' ? true : a.status === apptFilter
  );

  const filteredTenants = tenants.filter(t => {
    const matchSearch = tenantSearch === '' ||
      (t.tenantName || '').toLowerCase().includes(tenantSearch.toLowerCase()) ||
      (t.roomTitle || '').toLowerCase().includes(tenantSearch.toLowerCase());
    const matchStatus = tenantStatus === 'all' || t.tenantStatus === tenantStatus;
    return matchSearch && matchStatus;
  });

  // ─── Input helper ────────────────────────────────────────────────────────
  const inputCls = 'w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 focus:bg-white outline-none transition-all';
  const labelCls = 'block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wide';

  // ─── Verification status badge ───────────────────────────────────────────
  const verifyStatus = user?.verificationStatus;
  const verifyBadge = {
    approved: { cls: 'bg-emerald-100 text-emerald-700', label: 'Đã xác minh', icon: 'fa-circle-check' },
    pending:  { cls: 'bg-amber-100 text-amber-700',   label: 'Đang chờ duyệt', icon: 'fa-clock' },
    rejected: { cls: 'bg-red-100 text-red-700',       label: 'Bị từ chối', icon: 'fa-circle-xmark' },
  }[verifyStatus] || { cls: 'bg-stone-100 text-stone-500', label: 'Chưa xác minh', icon: 'fa-question-circle' };

  // ════════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-stone-50" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <i className="fa-solid fa-house-chimney text-white text-sm" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Locafy Hub</span>
            </div>
            <h1 className="text-2xl font-extrabold text-stone-900">
              Xin chào, {user?.name || user?.username} 👋
            </h1>
          </div>
          <button
            onClick={() => goTab('add-listing')}
            className="hidden sm:flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-sm transition-all active:scale-95"
          >
            <i className="fa-solid fa-circle-plus" />
            Tạo tin đăng
          </button>
        </div>

        {/* ── Verification banner ── */}
        <VerificationBanner status={verifyStatus} onGoVerify={() => goTab('verify')} />

        {/* ── Layout ── */}
        <div className="grid lg:grid-cols-[220px_1fr] gap-6">

          {/* ── Sidebar ── */}
          <aside className="space-y-1">
            {/* Quick add button mobile */}
            <button
              onClick={() => goTab('add-listing')}
              className="sm:hidden w-full flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm mb-3 transition"
            >
              <i className="fa-solid fa-circle-plus" /> Tạo tin đăng
            </button>

            {TABS.map(tab => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => goTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                      : 'text-stone-600 hover:bg-white hover:text-emerald-700 hover:shadow-sm'
                  }`}
                >
                  <i className={`fa-solid ${tab.icon} w-4 text-center`} />
                  <span>{tab.label}</span>
                  {tab.id === 'verify' && verifyStatus !== 'approved' && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-amber-400" />
                  )}
                </button>
              );
            })}
          </aside>

          {/* ── Main panel ── */}
          <main className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 md:p-8 min-h-[600px]">

            {/* ════════════ TAB: OVERVIEW ════════════ */}
            {currentTab === 'overview' && (
              <div>
                <h2 className="text-lg font-extrabold text-stone-900 mb-6">Tổng quan</h2>

                {/* Stats grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <StatCard
                    icon="fa-list" iconBg="bg-emerald-50" iconColor="text-emerald-600"
                    label="Tổng tin đăng"
                    value={overviewStats.totalListings}
                    badge={`${overviewStats.activeListings} còn trống`}
                    badgeColor="bg-emerald-50 text-emerald-700"
                  />
                  <StatCard
                    icon="fa-calendar-check" iconBg="bg-amber-50" iconColor="text-amber-600"
                    label="Lịch hẹn chờ"
                    value={overviewStats.pendingAppts}
                    badge="Chờ xác nhận"
                    badgeColor="bg-amber-50 text-amber-700"
                  />
                  <StatCard
                    icon="fa-circle-dollar-to-slot" iconBg="bg-blue-50" iconColor="text-blue-600"
                    label="Doanh thu ước tính"
                    value={overviewStats.revenue ? (overviewStats.revenue / 1e6).toFixed(1) + ' tr/th' : '0 đ'}
                    badge="+8.4% tháng này"
                    badgeColor="bg-blue-50 text-blue-700"
                  />
                  <StatCard
                    icon="fa-shield-halved" iconBg={verifyStatus === 'approved' ? 'bg-emerald-50' : 'bg-red-50'}
                    iconColor={verifyStatus === 'approved' ? 'text-emerald-600' : 'text-red-500'}
                    label="Trạng thái TK"
                    value={verifyBadge.label}
                  />
                </div>

                {/* Bar chart (visual mock) */}
                <div className="bg-stone-50 rounded-2xl p-6 mb-8 border border-stone-100">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-bold text-stone-900 text-sm">Hoạt động 4 tuần qua</h3>
                      <p className="text-xs text-stone-400">Lượt xem & lịch hẹn</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">Tháng này</span>
                  </div>
                  <div className="flex items-end justify-between gap-3 h-32 px-2">
                    {[20, 42, 75, 90].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t-lg transition-all duration-500"
                          style={{
                            height: `${h}%`,
                            backgroundColor: i === 3 ? '#059669' : '#d1fae5',
                          }}
                        />
                        <span className="text-[10px] text-stone-400 font-medium">T{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent listings table */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-stone-900 text-sm">Tin đăng gần đây</h3>
                    <button onClick={() => goTab('listings')} className="text-xs text-emerald-600 font-bold hover:underline">
                      Xem tất cả →
                    </button>
                  </div>
                  {loading ? <Spinner /> : myListings.length === 0 ? (
                    <EmptyState
                      icon="fa-list"
                      title="Chưa có tin đăng nào"
                      subtitle="Tạo tin đăng đầu tiên để bắt đầu cho thuê"
                      action={
                        <button onClick={() => goTab('add-listing')} className="mt-4 px-5 py-2 bg-emerald-600 text-white text-sm font-bold rounded-full">
                          + Tạo tin đăng
                        </button>
                      }
                    />
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-stone-100">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="bg-stone-50 border-b border-stone-100">
                            <th className="py-3 px-4 text-xs font-semibold text-stone-400 uppercase tracking-wider">Phòng</th>
                            <th className="py-3 px-4 text-xs font-semibold text-stone-400 uppercase tracking-wider">Khu vực</th>
                            <th className="py-3 px-4 text-xs font-semibold text-stone-400 uppercase tracking-wider">Giá</th>
                            <th className="py-3 px-4 text-xs font-semibold text-stone-400 uppercase tracking-wider">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                          {myListings.slice(0, 5).map(l => {
                            const id = l._id || l.id;
                            const isRented = l.status === 'rented' || l.rented;
                            return (
                              <tr key={id} className="hover:bg-stone-50/60 transition-colors">
                                <td className="py-3 px-4 font-semibold text-stone-800 line-clamp-1">{l.title}</td>
                                <td className="py-3 px-4 text-stone-500 text-xs">{l.location}</td>
                                <td className="py-3 px-4 font-bold text-emerald-700">
                                  {Number(l.price) >= 1000000
                                    ? (Number(l.price) / 1e6).toFixed(1) + ' tr'
                                    : (l.price || '—')}
                                  /tháng
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                    isRented ? 'bg-teal-100 text-teal-700' : l.censored
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {isRented ? 'Đang thuê' : l.censored ? 'Còn trống' : 'Chờ duyệt'}
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
              </div>
            )}

            {/* ════════════ TAB: LISTINGS ════════════ */}
            {currentTab === 'listings' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-extrabold text-stone-900">Danh sách tin đăng</h2>
                  <button
                    onClick={() => goTab('add-listing')}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition"
                  >
                    <i className="fa-solid fa-circle-plus" /> Tạo tin mới
                  </button>
                </div>

                {loading ? <Spinner /> : myListings.length === 0 ? (
                  <EmptyState
                    icon="fa-list" title="Chưa có tin đăng" subtitle="Hãy tạo tin đăng đầu tiên"
                    action={
                      <button onClick={() => goTab('add-listing')} className="mt-4 px-5 py-2 bg-emerald-600 text-white text-sm font-bold rounded-full">
                        + Tạo ngay
                      </button>
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {myListings.map(l => {
                      const id = l._id || l.id;
                      const isRented = l.status === 'rented' || l.rented;
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-4 p-4 border border-stone-100 rounded-2xl bg-stone-50/50 hover:bg-white hover:border-emerald-100 hover:shadow-sm transition-all"
                        >
                          <img
                            src={l.image || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=120&q=70'}
                            alt={l.title}
                            className="w-16 h-16 object-cover rounded-xl border border-stone-100 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-stone-900 text-sm line-clamp-1">{l.title}</p>
                            <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">
                              <i className="fa-solid fa-location-dot mr-1 text-emerald-400" />
                              {l.location}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-xs font-bold text-emerald-700">
                                {Number(l.price) >= 1000000
                                  ? (Number(l.price) / 1e6).toFixed(1) + ' tr/tháng'
                                  : (l.price || '—') + '/tháng'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isRented ? 'bg-teal-100 text-teal-700'
                                  : l.censored ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {isRented ? 'Đang thuê' : l.censored ? 'Đã duyệt' : 'Chờ duyệt'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => goTab('add-listing', { editId: id })}
                              className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition"
                              title="Sửa"
                            >
                              <i className="fa-solid fa-pen-to-square text-xs" />
                            </button>
                            <button
                              onClick={() => handleDeleteListing(id)}
                              className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                              title="Xóa"
                            >
                              <i className="fa-solid fa-trash text-xs" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ════════════ TAB: ADD/EDIT LISTING ════════════ */}
            {currentTab === 'add-listing' && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  {editId && (
                    <button onClick={() => goTab('listings')} className="text-stone-400 hover:text-stone-700 transition">
                      <i className="fa-solid fa-arrow-left" />
                    </button>
                  )}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">
                      {editId ? 'Chỉnh sửa tin' : 'Đăng tin mới'}
                    </p>
                    <h2 className="text-lg font-extrabold text-stone-900">
                      {editId ? 'Cập nhật tin đăng phòng trọ' : 'Tạo tin đăng mới'}
                    </h2>
                  </div>
                </div>

                {/* Verification gate */}
                {user?.verificationStatus !== 'approved' && !editId && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <i className="fa-solid fa-triangle-exclamation text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-800">Tài khoản chưa xác minh</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Bạn cần hoàn thiện xác minh danh tính trước khi đăng tin.{' '}
                        <button onClick={() => goTab('verify')} className="font-bold underline">Xác minh ngay →</button>
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleListingSubmit} className="space-y-6 max-w-3xl">
                  {/* Basic info */}
                  <section className="bg-stone-50 rounded-2xl p-5 border border-stone-100">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <i className="fa-solid fa-info text-emerald-600 text-xs" />
                      </div>
                      <h3 className="font-bold text-sm text-stone-800">Thông tin cơ bản</h3>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className={labelCls}>Tên hiển thị / Tiêu đề</label>
                        <input required className={inputCls} value={listTitle} onChange={e => setListTitle(e.target.value)}
                          placeholder="Căn hộ Studio cao cấp đầy đủ tiện nghi Quận 1" />
                      </div>
                      <div>
                        <label className={labelCls}>Loại hình</label>
                        <select className={inputCls} value={listType} onChange={e => setListType(e.target.value)}>
                          {ROOM_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Giá thuê (VND/tháng)</label>
                        <input required type="number" className={inputCls} value={listPrice}
                          onChange={e => setListPrice(e.target.value)} placeholder="5500000" />
                      </div>
                      <div>
                        <label className={labelCls}>Diện tích (m²)</label>
                        <input type="number" className={inputCls} value={listArea}
                          onChange={e => setListArea(e.target.value)} placeholder="25" />
                      </div>
                      <div>
                        <label className={labelCls}>Số điện thoại liên hệ</label>
                        <input type="tel" className={inputCls} value={listPhone}
                          onChange={e => setListPhone(e.target.value)} placeholder="0901234567" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelCls}>Địa chỉ chi tiết</label>
                        <input required className={inputCls} value={listLocation}
                          onChange={e => setListLocation(e.target.value)}
                          placeholder="Số nhà, đường, phường, quận, thành phố..." />
                      </div>
                    </div>
                  </section>

                  {/* Amenities */}
                  <section className="bg-stone-50 rounded-2xl p-5 border border-stone-100">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <i className="fa-solid fa-circle-check text-emerald-600 text-xs" />
                      </div>
                      <h3 className="font-bold text-sm text-stone-800">Tiện ích tích hợp</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {AMENITIES_LIST.map(item => (
                        <label
                          key={item}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer select-none text-xs font-medium transition-all ${
                            listAmenities.includes(item)
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                              : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={listAmenities.includes(item)}
                            onChange={() => toggleAmenity(item)}
                            className="rounded text-emerald-600 focus:ring-emerald-400 border-stone-300"
                          />
                          {item}
                        </label>
                      ))}
                    </div>
                  </section>

                  {/* Description */}
                  <section className="bg-stone-50 rounded-2xl p-5 border border-stone-100">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <i className="fa-solid fa-align-left text-emerald-600 text-xs" />
                      </div>
                      <h3 className="font-bold text-sm text-stone-800">Mô tả chi tiết</h3>
                    </div>
                    <textarea
                      rows={5} className={inputCls + ' resize-none'} value={listDesc}
                      onChange={e => setListDesc(e.target.value)}
                      placeholder="Mô tả nội thất, tiện nghi, giờ giấc, camera an ninh..."
                    />
                  </section>

                  {/* Image */}
                  <section className="bg-stone-50 rounded-2xl p-5 border border-stone-100">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <i className="fa-solid fa-image text-emerald-600 text-xs" />
                      </div>
                      <h3 className="font-bold text-sm text-stone-800">Hình ảnh phòng</h3>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>URL ảnh trực tuyến</label>
                        <input type="url" className={inputCls} value={listImageUrl}
                          onChange={e => setListImageUrl(e.target.value)}
                          placeholder="https://images.unsplash.com/..." />
                      </div>
                      <div>
                        <label className={labelCls}>Hoặc tải ảnh lên</label>
                        <input
                          type="file" accept="image/*"
                          onChange={e => setListImageFile(e.target.files[0] || null)}
                          className="w-full text-xs text-stone-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition"
                        />
                      </div>
                    </div>
                    {(listImageUrl || listImageFile) && (
                      <div className="mt-3">
                        <p className="text-xs text-stone-400 mb-1">Xem trước:</p>
                        <img
                          src={listImageFile ? URL.createObjectURL(listImageFile) : listImageUrl}
                          alt="preview"
                          className="w-40 h-28 object-cover rounded-xl border border-stone-200"
                        />
                      </div>
                    )}
                  </section>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button" onClick={() => goTab('listings')}
                      className="px-6 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-sm transition"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit" disabled={listSubmitting}
                      className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition shadow-sm"
                    >
                      {listSubmitting
                        ? <><i className="fa-solid fa-circle-notch fa-spin mr-2" />{editId ? 'Đang lưu...' : 'Đang đăng...'}</>
                        : (editId ? 'Lưu cập nhật' : 'Đăng tin')}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ════════════ TAB: APPOINTMENTS ════════════ */}
            {currentTab === 'appointments' && (
              <div>
                <h2 className="text-lg font-extrabold text-stone-900 mb-5">Lịch hẹn xem phòng</h2>

                {/* Filter tabs */}
                <div className="flex gap-1 mb-6 p-1 bg-stone-100 rounded-xl w-fit">
                  {[
                    { val: 'all', label: 'Tất cả' },
                    { val: 'pending', label: 'Chờ xác nhận' },
                    { val: 'approved', label: 'Đã xác nhận' },
                    { val: 'cancelled', label: 'Đã hủy' },
                  ].map(f => (
                    <button
                      key={f.val}
                      onClick={() => setApptFilter(f.val)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        apptFilter === f.val
                          ? 'bg-white shadow-sm text-emerald-700 font-bold'
                          : 'text-stone-500 hover:text-stone-700'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {loading ? <Spinner /> : filteredAppts.length === 0 ? (
                  <EmptyState icon="fa-calendar-xmark" title="Không có lịch hẹn" subtitle="Chưa có yêu cầu xem phòng nào." />
                ) : (
                  <div className="space-y-3">
                    {filteredAppts.map(appt => {
                      const id = appt._id || appt.id;
                      return (
                        <div
                          key={id}
                          className={`flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl border transition-all ${
                            appt.status === 'cancelled' ? 'bg-stone-50 border-stone-100 opacity-70' : 'bg-white border-stone-100 hover:border-emerald-100 hover:shadow-sm'
                          }`}
                        >
                          <img
                            src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=120&q=70"
                            alt="room"
                            className="w-24 h-16 rounded-xl object-cover shrink-0"
                          />
                          <div className="flex-1">
                            <h4 className="font-bold text-stone-900 text-sm">{appt.roomTitle || appt.listingTitle}</h4>
                            <p className="text-xs text-stone-500 mt-0.5">
                              <i className="fa-solid fa-user mr-1.5 text-stone-300" />
                              {appt.tenantName || appt.visitorName} · {appt.tenantPhone || appt.phone}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-1.5 w-fit border border-emerald-100">
                              <span><i className="fa-solid fa-calendar mr-1" />{appt.date}</span>
                              <span className="w-1 h-1 rounded-full bg-emerald-300" />
                              <span><i className="fa-solid fa-clock mr-1" />{appt.time}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              appt.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : appt.status === 'pending' ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                : 'bg-stone-100 text-stone-500 border border-stone-200'
                            }`}>
                              {appt.status === 'approved' ? 'Đã xác nhận' : appt.status === 'pending' ? 'Chờ xác nhận' : 'Đã hủy'}
                            </span>
                            {appt.status === 'pending' && (
                              <div className="flex gap-2 mt-1">
                                <button
                                  onClick={() => handleApptAction(appt, 'approved')}
                                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-full transition"
                                >
                                  Xác nhận
                                </button>
                                <button
                                  onClick={() => handleApptAction(appt, 'cancelled')}
                                  className="px-4 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold rounded-full transition border border-stone-200"
                                >
                                  Từ chối
                                </button>
                              </div>
                            )}
                            {appt.tenantPhone && (
                              <a href={`tel:${appt.tenantPhone}`} className="text-xs text-emerald-600 font-bold hover:underline">
                                <i className="fa-solid fa-phone mr-1" />Gọi khách
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ════════════ TAB: TENANTS ════════════ */}
            {currentTab === 'tenants' && (
              <div>
                <h2 className="text-lg font-extrabold text-stone-900 mb-5">Quản lý khách thuê</h2>

                {/* Search & filter */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <div className="relative flex-1">
                    <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-300 text-sm" />
                    <input
                      type="text" className={inputCls + ' pl-10'} placeholder="Tìm tên khách hoặc phòng..."
                      value={tenantSearch} onChange={e => setTenantSearch(e.target.value)}
                    />
                  </div>
                  <select
                    className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-600 focus:ring-2 focus:ring-emerald-400 outline-none"
                    value={tenantStatus} onChange={e => setTenantStatus(e.target.value)}
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="Đang ở">Đang ở</option>
                    <option value="Sắp hết hạn">Sắp hết hạn</option>
                    <option value="Trễ thanh toán">Trễ thanh toán</option>
                  </select>
                </div>

                {loading ? <Spinner /> : filteredTenants.length === 0 ? (
                  <EmptyState icon="fa-users" title="Chưa có khách thuê" subtitle="Khách đã xác nhận lịch hẹn sẽ hiện ở đây." />
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-stone-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-100 text-left">
                          {['Khách thuê', 'Phòng', 'Điện thoại', 'Ngày bắt đầu', 'Trạng thái'].map(h => (
                            <th key={h} className="py-3 px-4 text-xs font-semibold text-stone-400 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-50">
                        {filteredTenants.map(t => {
                          const name = t.tenantName || t.visitorName || '—';
                          const initials = name.substring(0, 2).toUpperCase();
                          const statusColors = {
                            'Đang ở': 'bg-emerald-100 text-emerald-700',
                            'Sắp hết hạn': 'bg-amber-100 text-amber-700',
                            'Trễ thanh toán': 'bg-red-100 text-red-700',
                          };
                          return (
                            <tr key={t._id || t.id} className="hover:bg-stone-50/60 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                                    {initials}
                                  </div>
                                  <div>
                                    <p className="font-bold text-stone-800">{name}</p>
                                    <p className="text-[11px] text-stone-400">{t.tenantEmail || ''}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-stone-600">{t.roomTitle || '—'}</td>
                              <td className="py-3 px-4 text-stone-500">{t.tenantPhone || '—'}</td>
                              <td className="py-3 px-4 text-stone-500">{t.date || '—'}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[t.tenantStatus] || 'bg-stone-100 text-stone-500'}`}>
                                  {t.tenantStatus || 'Đang ở'}
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
            )}

            {/* ════════════ TAB: PACKAGES ════════════ */}
            {currentTab === 'packages' && (
              <div>
                <h2 className="text-lg font-extrabold text-stone-900 mb-2">Gói dịch vụ</h2>
                <p className="text-sm text-stone-500 mb-6">Nâng cấp gói để đăng tin ưu tiên và hiển thị nổi bật hơn.</p>

                {/* Current subscription */}
                {mySubscription && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
                      <i className="fa-solid fa-crown text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-emerald-800 text-sm">Đang dùng: {mySubscription.packageName}</p>
                      <p className="text-xs text-emerald-600">
                        Hết hạn: {mySubscription.expiresAt ? new Date(mySubscription.expiresAt).toLocaleDateString('vi-VN') : '—'}
                      </p>
                    </div>
                  </div>
                )}

                {loading ? <Spinner /> : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {packages.length === 0 ? (
                      // Fallback mock packages
                      [
                        { id: 'basic', name: 'Cơ bản', price: 99000, duration: 30, features: ['5 tin đăng', 'Hiển thị thường', 'Hỗ trợ email'] },
                        { id: 'pro', name: 'Pro', price: 299000, duration: 30, features: ['20 tin đăng', 'Ưu tiên hiển thị', 'Huy hiệu Pro', 'Hỗ trợ 24/7'], popular: true },
                        { id: 'premium', name: 'Premium', price: 599000, duration: 30, features: ['Không giới hạn tin', 'Vị trí TOP', 'Huy hiệu Vàng', 'Quản lý nâng cao'] },
                      ].map(pkg => (
                        <div
                          key={pkg.id}
                          className={`rounded-2xl border p-5 flex flex-col transition-all hover:-translate-y-0.5 ${
                            pkg.popular
                              ? 'border-emerald-400 bg-gradient-to-b from-emerald-50 to-white shadow-md shadow-emerald-100'
                              : 'border-stone-200 bg-white'
                          }`}
                        >
                          {pkg.popular && (
                            <span className="self-start px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider mb-3">
                              Phổ biến nhất
                            </span>
                          )}
                          <p className="font-extrabold text-stone-900 text-base">{pkg.name}</p>
                          <p className="text-2xl font-extrabold text-emerald-700 mt-1">
                            {pkg.price.toLocaleString('vi-VN')}₫
                            <span className="text-sm font-normal text-stone-400"> /tháng</span>
                          </p>
                          <ul className="mt-4 space-y-2 flex-1">
                            {pkg.features.map(f => (
                              <li key={f} className="flex items-center gap-2 text-xs text-stone-600">
                                <i className="fa-solid fa-circle-check text-emerald-500 text-[10px]" />
                                {f}
                              </li>
                            ))}
                          </ul>
                          <button
                            onClick={() => sendPaymentLink(pkg)}
                            disabled={payosLoading}
                            className={`mt-5 w-full py-2.5 rounded-xl text-sm font-bold transition ${
                              pkg.popular
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                : 'border border-emerald-600 text-emerald-600 hover:bg-emerald-50'
                            } disabled:opacity-60`}
                          >
                            {payosLoading ? <i className="fa-solid fa-circle-notch fa-spin" /> : 'Mua ngay'}
                          </button>
                        </div>
                      ))
                    ) : packages.map(pkg => (
                      <div key={pkg._id || pkg.id} className="rounded-2xl border border-stone-200 bg-white p-5 flex flex-col">
                        <p className="font-extrabold text-stone-900">{pkg.name}</p>
                        <p className="text-2xl font-extrabold text-emerald-700 mt-1">
                          {(pkg.price || 0).toLocaleString('vi-VN')}₫
                          <span className="text-sm font-normal text-stone-400"> /tháng</span>
                        </p>
                        <p className="text-xs text-stone-400 mt-1">{pkg.description}</p>
                        <button
                          onClick={() => handleBuyPackage(pkg)}
                          disabled={payosLoading}
                          className="mt-4 w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition disabled:opacity-60"
                        >
                          {payosLoading ? <i className="fa-solid fa-circle-notch fa-spin" /> : 'Đăng ký'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Transaction history */}
                <div>
                  <h3 className="font-bold text-stone-800 text-sm mb-3">Lịch sử giao dịch</h3>
                  {transactions.length === 0 ? (
                    <p className="text-sm text-stone-400 py-6 text-center">Chưa có giao dịch nào.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-stone-100">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-stone-50 border-b border-stone-100 text-left">
                            {['Gói', 'Số tiền', 'Ngày', 'Trạng thái'].map(h => (
                              <th key={h} className="py-3 px-4 text-xs font-semibold text-stone-400 uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                          {transactions.map(tx => (
                            <tr key={tx._id || tx.id} className="hover:bg-stone-50/60">
                              <td className="py-3 px-4 font-semibold text-stone-700">{tx.packageName || '—'}</td>
                              <td className="py-3 px-4 font-bold text-emerald-700">{(tx.amount || 0).toLocaleString('vi-VN')}₫</td>
                              <td className="py-3 px-4 text-stone-400 text-xs">{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('vi-VN') : '—'}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                  tx.status === 'success' || tx.status === 'paid'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : tx.status === 'pending'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {tx.status === 'success' || tx.status === 'paid' ? 'Thành công'
                                    : tx.status === 'pending' ? 'Đang xử lý' : 'Thất bại'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════════════ TAB: CHATS ════════════ */}
            {currentTab === 'chats' && (
              <div>
                <h2 className="text-lg font-extrabold text-stone-900 mb-4">Hộp thư tin nhắn</h2>
                <div className="border border-stone-200 rounded-2xl overflow-hidden flex h-[520px]">
                  {/* Conversation list */}
                  <div className="w-56 shrink-0 border-r border-stone-100 bg-stone-50 flex flex-col">
                    <div className="px-3 py-3 border-b border-stone-100 bg-white">
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Hội thoại</p>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {loading ? (
                        <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /></div>
                      ) : conversations.length === 0 ? (
                        <p className="text-xs text-stone-400 text-center py-6 px-3">Chưa có hội thoại nào</p>
                      ) : conversations.map(conv => {
                        const convId = conv._id || conv.id;
                        const isActive = activeChatId === convId;
                        return (
                          <button
                            key={convId}
                            onClick={() => { selectConversation(conv); }}
                            className={`w-full text-left px-3 py-3 border-b border-stone-50 text-xs font-semibold transition-all ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border-l-2 border-l-emerald-600'
                                : 'text-stone-600 hover:bg-stone-100'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {(conv.otherUserName || conv.name || 'K').substring(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-stone-700 truncate">{conv.otherUserName || conv.name || 'Khách'}</p>
                                <p className="text-[10px] text-stone-400 truncate">{conv.lastMessage || '...'}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Chat panel */}
                  <div className="flex-1 flex flex-col bg-white min-w-0">
                    {activeChatId ? (
                      <>
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-stone-100 bg-white flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                            {activeChatName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-stone-800 text-sm">{activeChatName}</p>
                            <div className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="text-[10px] text-emerald-600 font-semibold">Đang hoạt động</span>
                            </div>
                          </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/30">
                          {chatMessages.length === 0 ? (
                            <p className="text-xs text-stone-400 text-center py-8">Bắt đầu cuộc trò chuyện!</p>
                          ) : chatMessages.map((m, i) => (
                            <div key={i} className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-xs shadow-sm ${
                                m.sender === 'me'
                                  ? 'bg-emerald-600 text-white rounded-tr-sm'
                                  : 'bg-white border border-stone-200 text-stone-700 rounded-tl-sm'
                              }`}>
                                <p>{m.text}</p>
                                <p className={`text-[9px] mt-1 ${m.sender === 'me' ? 'text-emerald-200' : 'text-stone-400'}`}>{m.time}</p>
                              </div>
                            </div>
                          ))}
                          <div ref={chatEndRef} />
                        </div>

                        {/* Quick replies */}
                        <div className="px-4 pt-2 pb-0 flex gap-2 overflow-x-auto">
                          {['Phòng vẫn còn trống ạ', 'Anh/chị có thể xem phòng chiều nay không?', 'Cảm ơn anh/chị đã liên hệ!'].map(qr => (
                            <button
                              key={qr}
                              onClick={() => setMsgInput(qr)}
                              className="shrink-0 text-[10px] font-semibold px-3 py-1.5 bg-stone-100 hover:bg-emerald-50 text-stone-600 hover:text-emerald-700 rounded-full border border-stone-200 hover:border-emerald-200 transition-all whitespace-nowrap"
                            >
                              {qr}
                            </button>
                          ))}
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSendMsg} className="px-4 py-3 border-t border-stone-100 flex gap-2">
                          <input
                            type="text"
                            value={msgInput}
                            onChange={e => setMsgInput(e.target.value)}
                            placeholder="Nhập tin nhắn..."
                            className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none transition"
                          />
                          <button
                            type="submit"
                            className="w-9 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center transition active:scale-95"
                          >
                            <i className="fa-solid fa-paper-plane text-xs" />
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-stone-400">
                        <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mb-3">
                          <i className="fa-solid fa-comment-dots text-2xl text-stone-300" />
                        </div>
                        <p className="text-sm font-semibold">Chọn một hội thoại để bắt đầu</p>
                        <p className="text-xs mt-1">Danh sách khách nhắn tin sẽ hiển thị ở cột trái</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ════════════ TAB: VERIFY ════════════ */}
            {currentTab === 'verify' && (
              <div>
                <h2 className="text-lg font-extrabold text-stone-900 mb-2">Xác minh danh tính chủ trọ</h2>
                <p className="text-sm text-stone-500 mb-6">
                  Hoàn thiện hồ sơ xác minh để được đăng tin, hiển thị huy hiệu đã xác minh và tăng độ tin cậy.
                </p>

                {/* Current status */}
                <div className={`flex items-center gap-3 p-4 rounded-2xl border mb-6 ${
                  verifyStatus === 'approved' ? 'bg-emerald-50 border-emerald-200'
                    : verifyStatus === 'pending' ? 'bg-amber-50 border-amber-200'
                    : verifyStatus === 'rejected' ? 'bg-red-50 border-red-200'
                    : 'bg-stone-50 border-stone-200'
                }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${verifyBadge.cls}`}>
                    <i className={`fa-solid ${verifyBadge.icon}`} />
                  </div>
                  <div>
                    <p className="font-bold text-stone-800 text-sm">Trạng thái: <span className={verifyBadge.cls.split(' ')[1]}>{verifyBadge.label}</span></p>
                    {verifyStatus === 'approved' && (
                      <p className="text-xs text-emerald-600 mt-0.5">Tài khoản của bạn đã được xác minh. Bạn có thể đăng tin tự do.</p>
                    )}
                    {verifyStatus === 'pending' && (
                      <p className="text-xs text-amber-700 mt-0.5">Hồ sơ đang được Admin xem xét. Vui lòng chờ 1-3 ngày làm việc.</p>
                    )}
                    {verifyStatus === 'rejected' && (
                      <p className="text-xs text-red-700 mt-0.5">Hồ sơ bị từ chối. Vui lòng gửi lại với tài liệu hợp lệ.</p>
                    )}
                    {!verifyStatus && (
                      <p className="text-xs text-stone-500 mt-0.5">Bạn chưa gửi hồ sơ xác minh nào.</p>
                    )}
                  </div>
                </div>

                {verifyStatus !== 'approved' && (
                  <form onSubmit={handleVerifySubmit} className="space-y-5 max-w-xl">
                    {/* CCCD */}
                    <section className="bg-stone-50 rounded-2xl p-5 border border-stone-100">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <i className="fa-solid fa-id-card text-emerald-600 text-xs" />
                        </div>
                        <h3 className="font-bold text-sm text-stone-800">Căn cước công dân (CCCD)</h3>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>Mặt trước CCCD *</label>
                          <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${cccdFront ? 'border-emerald-400 bg-emerald-50' : 'border-stone-200 bg-white hover:border-stone-300'}`}>
                            {cccdFront ? (
                              <div>
                                <i className="fa-solid fa-circle-check text-emerald-500 text-lg mb-1" />
                                <p className="text-xs text-emerald-700 font-semibold truncate">{cccdFront.name}</p>
                              </div>
                            ) : (
                              <>
                                <i className="fa-solid fa-upload text-stone-300 text-xl mb-1" />
                                <p className="text-xs text-stone-400">Tải lên ảnh</p>
                              </>
                            )}
                            <input
                              type="file" accept="image/*"
                              onChange={e => setCccdFront(e.target.files[0] || null)}
                              className="mt-2 w-full text-xs text-stone-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white file:text-stone-600 file:border file:border-stone-200"
                            />
                          </div>
                        </div>
                        <div>
                          <label className={labelCls}>Mặt sau CCCD *</label>
                          <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${cccdBack ? 'border-emerald-400 bg-emerald-50' : 'border-stone-200 bg-white hover:border-stone-300'}`}>
                            {cccdBack ? (
                              <div>
                                <i className="fa-solid fa-circle-check text-emerald-500 text-lg mb-1" />
                                <p className="text-xs text-emerald-700 font-semibold truncate">{cccdBack.name}</p>
                              </div>
                            ) : (
                              <>
                                <i className="fa-solid fa-upload text-stone-300 text-xl mb-1" />
                                <p className="text-xs text-stone-400">Tải lên ảnh</p>
                              </>
                            )}
                            <input
                              type="file" accept="image/*"
                              onChange={e => setCccdBack(e.target.files[0] || null)}
                              className="mt-2 w-full text-xs text-stone-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white file:text-stone-600 file:border file:border-stone-200"
                            />
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Property docs */}
                    <section className="bg-stone-50 rounded-2xl p-5 border border-stone-100">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <i className="fa-solid fa-file-lines text-emerald-600 text-xs" />
                        </div>
                        <h3 className="font-bold text-sm text-stone-800">Giấy tờ nhà trọ <span className="font-normal text-stone-400">(tùy chọn)</span></h3>
                      </div>
                      <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${propertyDoc ? 'border-emerald-400 bg-emerald-50' : 'border-stone-200 bg-white hover:border-stone-300'}`}>
                        {propertyDoc ? (
                          <div>
                            <i className="fa-solid fa-circle-check text-emerald-500 text-lg mb-1" />
                            <p className="text-xs text-emerald-700 font-semibold">{propertyDoc.name}</p>
                          </div>
                        ) : (
                          <>
                            <i className="fa-solid fa-file-pdf text-stone-300 text-2xl mb-1" />
                            <p className="text-xs text-stone-400">Giấy chứng nhận quyền sở hữu, hợp đồng thuê đất...</p>
                          </>
                        )}
                        <input
                          type="file" accept="image/*,.pdf"
                          onChange={e => setPropertyDoc(e.target.files[0] || null)}
                          className="mt-2 w-full text-xs text-stone-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white file:text-stone-600 file:border file:border-stone-200"
                        />
                      </div>
                    </section>

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2 text-xs text-blue-700">
                      <i className="fa-solid fa-circle-info mt-0.5" />
                      <span>Thông tin và tài liệu của bạn được mã hóa và bảo mật. Chỉ Admin Locafy mới có thể xem xét hồ sơ xác minh.</span>
                    </div>

                    <button
                      type="submit" disabled={verifySubmitting}
                      className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition shadow-sm"
                    >
                      {verifySubmitting
                        ? <><i className="fa-solid fa-circle-notch fa-spin mr-2" />Đang gửi...</>
                        : 'Gửi hồ sơ xác minh'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ════════════ TAB: PROFILE ════════════ */}
            {currentTab === 'profile' && (
              <div>
                <h2 className="text-lg font-extrabold text-stone-900 mb-6">Cài đặt hồ sơ</h2>

                {/* Avatar summary */}
                <div className="bg-stone-50 border border-stone-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-5 mb-8">
                  <div className="relative shrink-0">
                    <div className="w-20 h-20 rounded-full bg-emerald-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-md">
                      {(user?.name || user?.username || 'U').substring(0, 2).toUpperCase()}
                    </div>
                    <button className="absolute bottom-0 right-0 w-7 h-7 bg-white border border-stone-200 rounded-full flex items-center justify-center shadow text-stone-500 hover:text-stone-700">
                      <i className="fa-solid fa-camera text-[10px]" />
                    </button>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-extrabold text-stone-900 text-lg">{user?.name || user?.username}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${verifyBadge.cls}`}>
                        <i className={`fa-solid ${verifyBadge.icon} mr-1`} />
                        {verifyBadge.label}
                      </span>
                    </div>
                    <p className="text-sm text-stone-400">Chủ nhà · Đối tác Locafy từ {new Date(user?.createdAt || Date.now()).getFullYear()}</p>
                  </div>
                </div>

                <form onSubmit={handleProfileSave} className="max-w-xl space-y-5">
                  {/* Personal info */}
                  <section className="bg-stone-50 rounded-2xl p-5 border border-stone-100">
                    <div className="flex items-center gap-2 mb-4">
                      <i className="fa-solid fa-user text-emerald-600" />
                      <h3 className="font-bold text-sm text-stone-800">Thông tin cá nhân</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className={labelCls}>Họ và tên</label>
                        <input type="text" className={inputCls} value={profileName}
                          onChange={e => setProfileName(e.target.value)} placeholder="Nguyễn Văn A" />
                      </div>
                      <div>
                        <label className={labelCls}>Email</label>
                        <input type="email" className={inputCls} value={profileEmail}
                          onChange={e => setProfileEmail(e.target.value)} placeholder="email@example.com" />
                      </div>
                      <div>
                        <label className={labelCls}>Số điện thoại</label>
                        <input type="tel" className={inputCls} value={profilePhone}
                          onChange={e => setProfilePhone(e.target.value)} placeholder="0901234567" />
                      </div>
                    </div>
                  </section>

                  {/* Notifications */}
                  <section className="bg-stone-50 rounded-2xl p-5 border border-stone-100">
                    <div className="flex items-center gap-2 mb-4">
                      <i className="fa-solid fa-bell text-emerald-600" />
                      <h3 className="font-bold text-sm text-stone-800">Cài đặt thông báo</h3>
                    </div>
                    <div className="space-y-4">
                      {[
                        { label: 'Email thông báo', desc: 'Hóa đơn, cập nhật quan trọng', id: 'notify-email' },
                        { label: 'Tin nhắn khách thuê', desc: 'Nhận thông báo khi có tin nhắn mới', id: 'notify-chat' },
                      ].map(n => (
                        <div key={n.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-stone-700">{n.label}</p>
                            <p className="text-xs text-stone-400">{n.desc}</p>
                          </div>
                          <label className="relative flex items-center cursor-pointer">
                            <input type="checkbox" defaultChecked className="sr-only peer" />
                            <div className="w-10 h-5 bg-stone-200 rounded-full peer peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5 peer-checked:after:border-white" />
                          </label>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Success/error message */}
                  {profileMsg && (
                    <div className={`px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                      profileMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      <i className={`fa-solid ${profileMsg.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} />
                      {profileMsg.text}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="submit" disabled={profileSaving}
                      className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition shadow-sm"
                    >
                      {profileSaving ? <><i className="fa-solid fa-circle-notch fa-spin mr-2" />Đang lưu...</> : 'Lưu thay đổi'}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/logout')}
                      className="px-6 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-xl text-sm transition"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </form>
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  );
};

export default LandlordDashboard;
