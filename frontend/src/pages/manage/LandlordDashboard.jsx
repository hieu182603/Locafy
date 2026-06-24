import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LocafyApi } from '../../services/api';
import { socket } from '../../services/socket';

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

// ─── Constants ────────────────────────────────────────────────────────────────
const AMENITIES_LIST = [
  'Máy lạnh', 'Wifi Free', 'Chỗ để xe', 'Máy giặt', 'Tủ lạnh',
  'Nóng lạnh', 'Ban công', 'Thang máy', 'An ninh 24/7', 'Khóa vân tay', 'Kệ bếp',
];
const ROOM_TYPES = ['Căn hộ Studio', 'Phòng trọ khép kín', 'Chung cư mini', 'Nhà nguyên căn'];

const ROOM_TYPE_LABELS = {
  single: 'Phòng đơn / Khép kín',
  shared: 'Phòng ở ghép',
  mini_apartment: 'Căn hộ mini',
  apartment: 'Căn hộ nguyên căn',
};

const TAB_GROUPS = [
  {
    title: 'Hoạt động',
    items: [
      { id: 'overview', icon: 'fa-chart-pie', label: 'Tổng quan' },
      { id: 'properties', icon: 'fa-building', label: 'Nhà & Phòng' },
      { id: 'listings', icon: 'fa-list', label: 'Tin đăng' },
      { id: 'add-listing', icon: 'fa-circle-plus', label: 'Tạo tin đăng' },
    ]
  },
  {
    title: 'Quản lý',
    items: [
      { id: 'appointments', icon: 'fa-calendar-check', label: 'Lịch hẹn' },
      { id: 'tenants', icon: 'fa-users', label: 'Khách thuê' },
      { id: 'chats', icon: 'fa-comment-dots', label: 'Chat' },
    ]
  },
  {
    title: 'Tài khoản',
    items: [
      { id: 'packages', icon: 'fa-crown', label: 'Gói dịch vụ' },
      { id: 'verify', icon: 'fa-shield-halved', label: 'Xác minh' },
      { id: 'profile', icon: 'fa-gear', label: 'Hồ sơ' },
    ]
  }
];

// ─── Spinner ───────────────────────────────────────────────────────────────────
const Spinner = () => (
  <div className="flex justify-center items-center py-16">
    <div className="w-8 h-8 border-3 border-seller-200 border-t-emerald-600 rounded-full animate-spin" />
  </div>
);

// ─── EmptyState ────────────────────────────────────────────────────────────────
const EmptyState = ({ icon, title, subtitle, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-seller-50 text-seller-500 flex items-center justify-center mb-4 shadow-inner">
      <i className={`fa-solid ${icon} text-2xl`} />
    </div>
    <h3 className="text-base font-bold text-gray-800 mb-1">{title}</h3>
    {subtitle && <p className="text-xs text-gray-400 max-w-xs leading-relaxed mb-5">{subtitle}</p>}
    {action}
  </div>
);

// ─── StatCard ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, iconBg, iconColor, label, value, badge, badgeColor }) => (
  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-premium-sm hover-lift transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
        <i className={`fa-solid ${icon} ${iconColor} text-base`} />
      </div>
      {badge && (
        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
      )}
    </div>
    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{label}</p>
    <p className="text-2xl font-black mt-1 text-gray-900">{value}</p>
  </div>
);

// ─── VerificationBanner ───────────────────────────────────────────────────────
const VerificationBanner = ({ status, onGoVerify }) => {
  if (status === 'approved') return null;
  const isPending = status === 'pending';
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold mb-6 border ${isPending
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
        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-current hover:bg-gray-50 transition whitespace-nowrap"
      >
        Xác minh ngay
      </button>
    </div>
  );
};

// ─── CardCarousel ─────────────────────────────────────────────────────────────
const CardCarousel = ({ imageUrls, height = 'h-36' }) => {
  const [index, setIndex] = React.useState(0);
  if (!imageUrls || imageUrls.length === 0) {
    return (
      <div className={`w-full ${height} rounded-xl bg-gray-50 flex flex-col items-center justify-center border border-dashed border-gray-200 mb-3 text-gray-400 shrink-0`}>
        <i className="fa-solid fa-image text-lg mb-1" />
        <span className="text-[10px]">Chưa có ảnh</span>
      </div>
    );
  }

  const handlePrev = (e) => {
    e.stopPropagation();
    setIndex(prev => (prev === 0 ? imageUrls.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setIndex(prev => (prev === imageUrls.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className={`relative w-full ${height} rounded-xl overflow-hidden mb-3 border border-gray-100 group shrink-0`}>
      <img
        src={imageUrls[index]}
        alt="preview"
        className="w-full h-full object-cover transition-all duration-300"
      />
      {imageUrls.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/80 hover:bg-white text-gray-800 flex items-center justify-center shadow transition-all opacity-0 group-hover:opacity-100 border-0 cursor-pointer text-xs"
          >
            <i className="fa-solid fa-chevron-left" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/80 hover:bg-white text-gray-800 flex items-center justify-center shadow transition-all opacity-0 group-hover:opacity-100 border-0 cursor-pointer text-xs"
          >
            <i className="fa-solid fa-chevron-right" />
          </button>
          <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs">
            {index + 1}/{imageUrls.length}
          </span>
        </>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const LandlordDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'overview';
  const editId = searchParams.get('editId') || '';

  // Custom Toast State and Auto-detect Type
  const [toast, setToast] = useState(null);
  const alert = useCallback((msg, type = 'success') => {
    let finalType = type;
    const lower = String(msg).toLowerCase();
    if (
      lower.includes('lỗi') ||
      lower.includes('thất bại') ||
      lower.includes('chưa') ||
      lower.includes('không') ||
      lower.includes('yêu cầu') ||
      lower.includes('bắt buộc') ||
      lower.includes('hủy')
    ) {
      finalType = 'error';
    }
    setToast({ message: msg, type: finalType });
  }, []);

  // Auto dismiss toast after 4s
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const goTab = useCallback((tab, extra = {}) => {
    setSearchParams({ tab, ...extra });
  }, [setSearchParams]);

  // ── Shared data ─────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [myListings, setMyListings] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [apptFilter, setApptFilter] = useState('all');
  const [tenants, setTenants] = useState([]);
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantStatus, setTenantStatus] = useState('all');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteText, setNoteText] = useState('');

  // ── Listing Form ─────────────────────────────────────────────────────────────
  const [listTitle, setListTitle] = useState('');
  const [listType, setListType] = useState(ROOM_TYPES[0]);
  const [listPrice, setListPrice] = useState('');
  const [listArea, setListArea] = useState('');
  const [listPhone, setListPhone] = useState('');
  const [listLocation, setListLocation] = useState('');
  const [listDesc, setListDesc] = useState('');
  const [listAmenities, setListAmenities] = useState([]);
  const [listImageUrls, setListImageUrls] = useState([]);
  const [listSubmitting, setListSubmitting] = useState(false);

  // ── Packages / PayOS ────────────────────────────────────────────────────────
  const [packages, setPackages] = useState([]);
  const [mySubscription, setMySubscription] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [payosLoading, setPayosLoading] = useState(false);

  // ── Chat ────────────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState('');
  const [activeChatName, setActiveChatName] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const chatEndRef = useRef(null);

  // ── Profile ──────────────────────────────────────────────────────────────────
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null); // { text, type }

  // ── Verify ──────────────────────────────────────────────────────────────────
  const [cccdFront, setCccdFront] = useState(null);
  const [cccdBack, setCccdBack] = useState(null);
  const [propertyDoc, setPropertyDoc] = useState(null);
  const [verifySubmitting, setVerifySubmitting] = useState(false);

  // Properties & Rooms Management States
  const [myProperties, setMyProperties] = useState([]);
  const [propertyRooms, setPropertyRooms] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [propLoading, setPropLoading] = useState(false);
  const [roomLoading, setRoomLoading] = useState(false);

  // Property Form Modal States
  const [propModalOpen, setPropModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [propName, setPropName] = useState('');
  const [propAddress, setPropAddress] = useState('');
  const [propWard, setPropWard] = useState('');
  const [propDistrict, setPropDistrict] = useState('');
  const [propProvince, setPropProvince] = useState('');
  const [propDesc, setPropDesc] = useState('');
  const [propAmenities, setPropAmenities] = useState([]);
  const [propSubmitting, setPropSubmitting] = useState(false);
  const [propImageUrls, setPropImageUrls] = useState([]);
  const [propImageLoading, setPropImageLoading] = useState(false);

  // Room Form Modal States
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomName, setRoomName] = useState('');
  const [roomTypeState, setRoomTypeState] = useState('single');
  const [roomArea, setRoomArea] = useState('');
  const [roomMaxOccupants, setRoomMaxOccupants] = useState(1);
  const [roomPrice, setRoomPrice] = useState('');
  const [roomDeposit, setRoomDeposit] = useState('');
  const [roomElectricity, setRoomElectricity] = useState('');
  const [roomWater, setRoomWater] = useState('');
  const [roomInternet, setRoomInternet] = useState('');
  const [roomParking, setRoomParking] = useState('');
  const [roomAmenitiesState, setRoomAmenitiesState] = useState([]);
  const [roomRules, setRoomRules] = useState('');
  const [roomImageUrls, setRoomImageUrls] = useState([]);
  const [roomImageLoading, setRoomImageLoading] = useState(false);
  const [roomSubmitting, setRoomSubmitting] = useState(false);

  // Listing creation Property/Room links
  const [listingPropertyId, setListingPropertyId] = useState('');
  const [listingRoomId, setListingRoomId] = useState('');
  const [listingRooms, setListingRooms] = useState([]);
  const [listingRoomsLoading, setListingRoomsLoading] = useState(false);
  const [listImageLoading, setListImageLoading] = useState(false);

  // Verification Upload URLs & Extra fields
  const [cccdFrontUrl, setCccdFrontUrl] = useState('');
  const [cccdBackUrl, setCccdBackUrl] = useState('');
  const [propertyDocUrl, setPropertyDocUrl] = useState('');
  const [cccdFrontLoading, setCccdFrontLoading] = useState(false);
  const [cccdBackLoading, setCccdBackLoading] = useState(false);
  const [propDocLoading, setPropDocLoading] = useState(false);
  const [verifySellerType, setVerifySellerType] = useState('owner');
  const [verifyBusinessName, setVerifyBusinessName] = useState('');
  const [verifyContactAddress, setVerifyContactAddress] = useState('');

  // ── Overview stats ───────────────────────────────────────────────────────────
  const [overviewStats, setOverviewStats] = useState({
    totalListings: 0, activeListings: 0,
    pendingAppts: 0, revenue: 0,
  });

  // Load rooms when selected property changes
  useEffect(() => {
    if (currentTab === 'properties' && selectedPropertyId) {
      setRoomLoading(true);
      LocafyApi.getRoomsByProperty(selectedPropertyId)
        .then((res) => {
          setPropertyRooms(res.data || []);
        })
        .catch(console.error)
        .finally(() => setRoomLoading(false));
    }
  }, [currentTab, selectedPropertyId]);

  // Load rooms for listing creation when property ID changes
  useEffect(() => {
    if (listingPropertyId) {
      setListingRoomsLoading(true);
      LocafyApi.getRoomsByProperty(listingPropertyId)
        .then((res) => {
          setListingRooms(res.data || []);
        })
        .catch(console.error)
        .finally(() => setListingRoomsLoading(false));
    } else {
      setListingRooms([]);
    }
  }, [listingPropertyId]);

  // ─── Fetch data per tab ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const fetchTab = async () => {
      try {
        switch (currentTab) {
          case 'overview': {
            const [listingsRes, apptsRes] = await Promise.all([
              LocafyApi.getMyListings({ limit: 100 }),
              LocafyApi.getAppointments(),
            ]);
            const listings = listingsRes.data || [];
            const appts = apptsRes.data || [];
            setMyListings(listings);
            const revenue = listings.reduce((s, l) => {
              if (l.status === 'rented' || l.rented) return s + (Number(l.price) || 0);
              return s;
            }, 0);
            setOverviewStats({
              totalListings: listings.filter(l => l.status !== 'deleted').length,
              activeListings: listings.filter(l => l.status === 'approved').length,
              pendingAppts: appts.filter(a => a.status === 'pending').length,
              revenue,
            });
            break;
          }
          case 'properties': {
            setPropLoading(true);
            try {
              const res = await LocafyApi.getMyProperties();
              setMyProperties(res.data || []);
              if (res.data && res.data.length > 0 && !selectedPropertyId) {
                setSelectedPropertyId(res.data[0]._id || res.data[0].id);
              }
            } catch (err) {
              console.error(err);
            } finally {
              setPropLoading(false);
            }
            break;
          }
          case 'listings': {
            const res = await LocafyApi.getMyListings({ limit: 100 });
            setMyListings(res.data || []);
            break;
          }
          case 'add-listing': {
            const propsRes = await LocafyApi.getMyProperties();
            setMyProperties(propsRes.data || []);
            if (editId) {
              try {
                const res = await LocafyApi.getMyListingDetail(editId);
                const r = res.data;
                if (r) {
                  setListTitle(r.title || '');
                  setListType(r.roomType || 'single');
                  setListPrice(r.price || '');
                  setListArea(r.area || '');
                  setListPhone(r.contactPhone || r.contact || user?.phone || '');
                  setListLocation(r.addressLine || r.location || '');
                  setListDesc(r.description || '');
                  setListAmenities(r.amenities ? (Array.isArray(r.amenities) ? r.amenities : r.amenities.split(',').map(s => s.trim())) : []);
                  setListImageUrls(r.imageUrls || (r.image ? [r.image] : []));
                  setListingPropertyId(r.property?._id || r.property || '');
                  setListingRoomId(r.room?._id || r.room || '');
                }
              } catch { }
            } else {
              setListTitle(''); setListType('single'); setListPrice('');
              setListArea(''); setListPhone(user?.phone || ''); setListLocation('');
              setListDesc(''); setListAmenities([]); setListImageUrls([]);
              setListingPropertyId(''); setListingRoomId('');
            }
            break;
          }
          case 'verify': {
            try {
              const res = await LocafyApi.getSellerProfile();
              if (res.data) {
                setVerifySellerType(res.data.sellerType || 'owner');
                setVerifyBusinessName(res.data.businessName || '');
                setVerifyContactAddress(res.data.contactAddress || '');
                setCccdFrontUrl(res.data.idCardFrontUrl || '');
                setCccdBackUrl(res.data.idCardBackUrl || '');
                setPropertyDocUrl(res.data.propertyDocUrls?.[0] || '');
              }
            } catch (err) {
              console.error('Lỗi tải thông tin xác minh:', err);
            }
            break;
          }
          case 'appointments': {
            const res = await LocafyApi.getAppointments();
            setAppointments(res.data || []);
            break;
          }
          case 'tenants': {
            const res = await LocafyApi.getAppointments({ limit: 100 });
            const data = res.data || [];
            setTenants(data.filter(a => ['confirmed', 'completed', 'pending', 'proposed'].includes(a.status)));
            break;
          }
          case 'packages': {
            const [pkgsRes, subRes, txnsRes] = await Promise.all([
              LocafyApi.getServicePackages(),
              LocafyApi.getMySubscription().catch(() => null),
              LocafyApi.getMyTransactions().catch(() => []),
            ]);
            setPackages(pkgsRes.data || []);
            setMySubscription(subRes?.data || null);
            setTransactions(txnsRes.data || []);
            break;
          }
          case 'chats': {
            const res = await LocafyApi.getConversations();
            const convs = res.data || [];
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
        const res = await LocafyApi.getMessages(activeChatId);
        const msgs = res.data || [];
        setChatMessages(msgs.map(m => ({
          sender: m.senderUsername === user.username || m.senderId === user._id || (m.sender?._id || m.sender) === user._id ? 'me' : 'them',
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
        sender: (msg.senderUsername === user.username || msg.senderId === user._id || (msg.sender?._id || msg.sender) === user._id) ? 'me' : 'them',
        text: msg.text || msg.content,
        time: msg.time || new Date().toISOString(),
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

  // Submit listing (create or edit), asDraft=true → lưu nháp
  const handleListingSubmit = async (e, asDraft = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!listTitle || !listingRoomId) {
      alert('Vui lòng chọn phòng và điền tiêu đề tin đăng.');
      return;
    }
    if (!asDraft && user.verificationStatus !== 'approved') {
      alert('Tài khoản chưa được xác minh. Vui lòng hoàn thiện hồ sơ xác minh trước.');
      return;
    }
    setListSubmitting(true);
    try {
      const payload = {
        roomId: listingRoomId,
        title: listTitle,
        description: listDesc,
        imageUrls: listImageUrls,
        videoUrl: '',
        availableFrom: null,
        asDraft,
      };
      if (editId) {
        await LocafyApi.updateSellerListing(editId, { title: listTitle, description: listDesc, imageUrls: listImageUrls });
        alert(asDraft ? 'Đã lưu nháp.' : 'Cập nhật tin đăng thành công!');
      } else {
        await LocafyApi.createSellerListing(payload);
        alert(asDraft ? 'Đã lưu nháp. Bạn có thể gửi duyệt sau.' : 'Đã gửi tin đăng. Chờ Admin phê duyệt.');
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
      await LocafyApi.deleteSellerListing(id);
      setMyListings(prev => prev.filter(l => l._id !== id && l.id !== id));
    } catch { alert('Xóa thất bại.'); }
  };

  // Save seller note on appointment
  const handleSaveNote = async (apptId) => {
    try {
      await LocafyApi.updateAppointmentNote(apptId, noteText);
      setTenants(prev => prev.map(t => t._id === apptId ? { ...t, sellerNote: noteText } : t));
      setEditingNoteId(null);
    } catch { alert('Không thể lưu ghi chú.'); }
  };

  // Submit draft for review
  const handleSubmitDraft = async (id) => {
    try {
      await LocafyApi.submitSellerListing(id);
      setMyListings(prev => prev.map(l => (l._id === id ? { ...l, status: 'pending' } : l)));
    } catch (err) {
      alert('Lỗi: ' + (err.message || 'Không thể gửi duyệt'));
    }
  };

  const handleListingImagesUpload = async (files) => {
    if (!files || files.length === 0) return;
    setListImageLoading(true);
    try {
      const uploadPromises = Array.from(files).map(file => LocafyApi.uploadFile(file));
      const results = await Promise.all(uploadPromises);
      const urls = results.map(res => res.ok && res.url).filter(Boolean);
      if (urls.length > 0) {
        setListImageUrls(prev => [...prev, ...urls]);
      } else {
        alert('Upload ảnh thất bại.');
      }
    } catch (err) {
      alert('Lỗi upload ảnh: ' + err.message);
    } finally {
      setListImageLoading(false);
    }
  };

  const handleListingRoomChange = (roomId) => {
    setListingRoomId(roomId);
    const room = listingRooms.find(r => (r._id === roomId || r.id === roomId));
    if (room) {
      setListPrice(room.price || '');
      setListArea(room.area || '');
      setListType(room.roomType || 'single');
      setListAmenities(room.amenities || []);
      if (room.name) {
        const prop = myProperties.find(p => (p._id === listingPropertyId || p.id === listingPropertyId));
        const propName = prop ? prop.name : '';
        const roomTypeLabel = ROOM_TYPE_LABELS[room.roomType] || 'Phòng trọ';
        setListTitle(`${roomTypeLabel} ${room.name} - ${propName}`);
      }
    }
  };

  const handlePropertyImagesUpload = async (files) => {
    if (!files || files.length === 0) return;
    setPropImageLoading(true);
    try {
      const uploadPromises = Array.from(files).map(file => LocafyApi.uploadFile(file));
      const results = await Promise.all(uploadPromises);
      const urls = results.map(res => res.ok && res.url).filter(Boolean);
      if (urls.length > 0) {
        setPropImageUrls(prev => [...prev, ...urls]);
      } else {
        alert('Upload ảnh thất bại.');
      }
    } catch (err) {
      alert('Lỗi upload ảnh: ' + err.message);
    } finally {
      setPropImageLoading(false);
    }
  };

  const handleRoomImagesUpload = async (files) => {
    if (!files || files.length === 0) return;
    setRoomImageLoading(true);
    try {
      const uploadPromises = Array.from(files).map(file => LocafyApi.uploadFile(file));
      const results = await Promise.all(uploadPromises);
      const urls = results.map(res => res.ok && res.url).filter(Boolean);
      if (urls.length > 0) {
        setRoomImageUrls(prev => [...prev, ...urls]);
      } else {
        alert('Upload ảnh thất bại.');
      }
    } catch (err) {
      alert('Lỗi upload ảnh: ' + err.message);
    } finally {
      setRoomImageLoading(false);
    }
  };

  const handleAddPropertyOpen = () => {
    setEditingProperty(null);
    setPropName('');
    setPropAddress('');
    setPropWard('');
    setPropDistrict('');
    setPropProvince('');
    setPropDesc('');
    setPropAmenities([]);
    setPropImageUrls([]);
    setPropModalOpen(true);
  };

  // Property Handlers
  const handlePropertySubmit = async (e) => {
    e.preventDefault();
    if (!propName || !propAddress) {
      alert('Vui lòng điền tên nhà trọ và địa chỉ.');
      return;
    }
    setPropSubmitting(true);
    try {
      const payload = {
        name: propName,
        addressLine: propAddress,
        ward: propWard,
        district: propDistrict,
        province: propProvince,
        description: propDesc,
        commonAmenities: propAmenities,
        imageUrls: propImageUrls,
      };
      if (editingProperty) {
        const res = await LocafyApi.updateProperty(editingProperty._id || editingProperty.id, payload);
        alert('Cập nhật nhà trọ thành công!');
        setMyProperties(prev => prev.map(p => (p._id === editingProperty._id || p.id === editingProperty.id) ? res.data : p));
      } else {
        const res = await LocafyApi.createProperty(payload);
        alert('Thêm nhà trọ thành công!');
        setMyProperties(prev => [res.data, ...prev]);
        setSelectedPropertyId(res.data._id);
      }
      setPropModalOpen(false);
      setPropName(''); setPropAddress(''); setPropWard(''); setPropDistrict(''); setPropProvince(''); setPropDesc(''); setPropAmenities([]); setEditingProperty(null); setPropImageUrls([]);
    } catch (err) {
      alert('Lỗi lưu nhà trọ: ' + (err.message || ''));
    } finally {
      setPropSubmitting(false);
    }
  };

  const handleDeleteProperty = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa (ẩn) nhà trọ này? Tất cả các phòng thuộc nhà trọ này cũng sẽ bị ảnh hưởng.')) return;
    try {
      await LocafyApi.deleteProperty(id);
      alert('Đã ẩn nhà trọ thành công.');
      setMyProperties(prev => prev.filter(p => p._id !== id && p.id !== id));
      if (selectedPropertyId === id) {
        setSelectedPropertyId('');
        setPropertyRooms([]);
      }
    } catch (err) {
      alert('Xóa nhà trọ thất bại: ' + (err.message || ''));
    }
  };

  const handleEditPropertyOpen = (prop) => {
    setEditingProperty(prop);
    setPropName(prop.name || '');
    setPropAddress(prop.addressLine || '');
    setPropWard(prop.ward || '');
    setPropDistrict(prop.district || '');
    setPropProvince(prop.province || '');
    setPropDesc(prop.description || '');
    setPropAmenities(prop.commonAmenities || []);
    setPropImageUrls(prop.imageUrls || []);
    setPropModalOpen(true);
  };

  // Room Handlers
  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPropertyId) {
      alert('Vui lòng chọn một nhà trọ trước khi thêm phòng.');
      return;
    }
    if (!roomTypeState || !roomArea || !roomPrice) {
      alert('Vui lòng nhập đầy đủ các trường bắt buộc (Loại phòng, Diện tích, Giá thuê).');
      return;
    }
    setRoomSubmitting(true);
    try {
      const payload = {
        propertyId: selectedPropertyId,
        name: roomName,
        roomType: roomTypeState,
        area: Number(roomArea),
        maxOccupants: Number(roomMaxOccupants),
        price: Number(roomPrice),
        deposit: Number(roomDeposit || 0),
        electricityRate: roomElectricity ? Number(roomElectricity) : null,
        waterRate: roomWater ? Number(roomWater) : null,
        internetFee: roomInternet ? Number(roomInternet) : null,
        parkingFee: roomParking ? Number(roomParking) : null,
        amenities: roomAmenitiesState,
        rules: roomRules,
        imageUrls: roomImageUrls,
      };

      if (editingRoom) {
        const res = await LocafyApi.updateRoom(editingRoom._id || editingRoom.id, payload);
        alert('Cập nhật phòng thành công!');
        setPropertyRooms(prev => prev.map(r => (r._id === editingRoom._id || r.id === editingRoom.id) ? res.data : r));
      } else {
        const res = await LocafyApi.createRoom(payload);
        alert('Thêm phòng thành công!');
        setPropertyRooms(prev => [res.data, ...prev]);
      }
      setRoomModalOpen(false);
      setRoomName(''); setRoomTypeState('single'); setRoomArea(''); setRoomMaxOccupants(1); setRoomPrice(''); setRoomDeposit(''); setRoomElectricity(''); setRoomWater(''); setRoomInternet(''); setRoomParking(''); setRoomAmenitiesState([]); setRoomRules(''); setEditingRoom(null); setRoomImageUrls([]);
    } catch (err) {
      alert('Lỗi lưu phòng: ' + (err.message || ''));
    } finally {
      setRoomSubmitting(false);
    }
  };

  const handleDeleteRoom = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa (ẩn) phòng này?')) return;
    try {
      await LocafyApi.deleteRoom(id);
      alert('Đã ẩn phòng thành công.');
      setPropertyRooms(prev => prev.filter(r => r._id !== id && r.id !== id));
    } catch (err) {
      alert('Xóa phòng thất bại: ' + (err.message || ''));
    }
  };

  const handleEditRoomOpen = (room) => {
    setEditingRoom(room);
    setRoomName(room.name || '');
    setRoomTypeState(room.roomType || 'single');
    setRoomArea(room.area || '');
    setRoomMaxOccupants(room.maxOccupants || 1);
    setRoomPrice(room.price || '');
    setRoomDeposit(room.deposit || '');
    setRoomElectricity(room.electricityRate || '');
    setRoomWater(room.waterRate || '');
    setRoomInternet(room.internetFee || '');
    setRoomParking(room.parkingFee || '');
    setRoomAmenitiesState(room.amenities || []);
    setRoomRules(room.rules || '');
    setRoomImageUrls(room.imageUrls || []);
    setRoomModalOpen(true);
  };

  const handleCloneRoomOpen = (room) => {
    setEditingRoom(null);
    setRoomName((room.name || 'Phòng') + ' (Bản sao)');
    setRoomTypeState(room.roomType || 'single');
    setRoomArea(room.area || '');
    setRoomMaxOccupants(room.maxOccupants || 1);
    setRoomPrice(room.price || '');
    setRoomDeposit(room.deposit || '');
    setRoomElectricity(room.electricityRate || '');
    setRoomWater(room.waterRate || '');
    setRoomInternet(room.internetFee || '');
    setRoomParking(room.parkingFee || '');
    setRoomAmenitiesState(room.amenities || []);
    setRoomRules(room.rules || '');
    setRoomImageUrls(room.imageUrls || []);
    setRoomModalOpen(true);
  };

  const handleUploadFile = async (file, type) => {
    if (!file) return;
    if (type === 'cccdFront') {
      setCccdFrontLoading(true);
      try {
        const res = await LocafyApi.uploadFile(file);
        if (res.ok && res.url) {
          setCccdFrontUrl(res.url);
          setCccdFront(file);
        } else {
          alert('Upload ảnh CCCD mặt trước thất bại.');
        }
      } catch (err) {
        alert('Lỗi upload: ' + err.message);
      } finally {
        setCccdFrontLoading(false);
      }
    } else if (type === 'cccdBack') {
      setCccdBackLoading(true);
      try {
        const res = await LocafyApi.uploadFile(file);
        if (res.ok && res.url) {
          setCccdBackUrl(res.url);
          setCccdBack(file);
        } else {
          alert('Upload ảnh CCCD mặt sau thất bại.');
        }
      } catch (err) {
        alert('Lỗi upload: ' + err.message);
      } finally {
        setCccdBackLoading(false);
      }
    } else if (type === 'propertyDoc') {
      setPropDocLoading(true);
      try {
        const res = await LocafyApi.uploadFile(file);
        if (res.ok && res.url) {
          setPropertyDocUrl(res.url);
          setPropertyDoc(file);
        } else {
          alert('Upload tài liệu nhà trọ thất bại.');
        }
      } catch (err) {
        alert('Lỗi upload: ' + err.message);
      } finally {
        setPropDocLoading(false);
      }
    }
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
    LocafyApi.sendMessage({ conversationId: activeChatId, content: msgInput }).catch(() => { });
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
  const { updateUser } = useAuth();

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!cccdFrontUrl || !cccdBackUrl) {
      alert('Vui lòng tải lên và chờ hoàn tất tải ảnh CCCD mặt trước và mặt sau.');
      return;
    }
    setVerifySubmitting(true);
    try {
      const payload = {
        idCardFrontUrl: cccdFrontUrl,
        idCardBackUrl: cccdBackUrl,
        propertyDocUrls: propertyDocUrl ? [propertyDocUrl] : [],
        sellerType: verifySellerType,
        contactAddress: verifyContactAddress,
        businessName: verifyBusinessName
      };
      await LocafyApi.submitVerification(payload);
      alert('Hồ sơ xác minh đã được gửi! Chúng tôi sẽ kiểm tra trong 1-3 ngày làm việc.');
      updateUser({ verificationStatus: 'pending' });
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
  const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-seller-500 focus:border-seller-500 focus:bg-white outline-none transition-all';
  const labelCls = 'block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide';

  // ─── Verification status badge ───────────────────────────────────────────
  const verifyStatus = user?.verificationStatus;
  const verifyBadge = {
    approved: { cls: 'bg-seller-100 text-seller-700', label: 'Đã xác minh', icon: 'fa-circle-check' },
    pending: { cls: 'bg-amber-100 text-amber-700', label: 'Đang chờ duyệt', icon: 'fa-clock' },
    rejected: { cls: 'bg-red-100 text-red-700', label: 'Bị từ chối', icon: 'fa-circle-xmark' },
  }[verifyStatus] || { cls: 'bg-gray-100 text-gray-500', label: 'Chưa xác minh', icon: 'fa-question-circle' };

  // ════════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="w-full h-screen overflow-hidden flex bg-gray-50" style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      {/* ── Sidebar ── */}
      <aside className="w-64 border-r border-gray-150 bg-white flex flex-col justify-between shrink-0 h-full p-5">
        <div className="flex flex-col flex-grow overflow-hidden">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2.5 px-3 py-4 mb-4 border-b border-gray-50 shrink-0">
            <Link to="/" className="flex items-center gap-2.5 text-seller-700 hover:opacity-90 transition">
              <div className="w-9 h-9 rounded-xl bg-seller-600 flex items-center justify-center text-white font-extrabold shadow-premium-sm shadow-seller-500/10">
                <i className="fa-solid fa-house-chimney text-base" />
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-gray-900 leading-none block">Locafy</span>
                <span className="text-[10px] block font-bold text-seller-600 uppercase tracking-wider mt-0.5">Kênh Chủ Trọ</span>
              </div>
            </Link>
          </div>

          {/* Categorized Navigation items */}
          <nav className="flex-1 space-y-5 overflow-y-auto px-1">
            {TAB_GROUPS.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-1">
                <p className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">{group.title}</p>
                <div className="space-y-0.5">
                  {group.items.map(tab => {
                    const isActive = currentTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => goTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border-0 ${isActive
                            ? 'bg-seller-600 text-white shadow-premium-md shadow-seller-500/20 active:scale-[0.98]'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-seller-700'
                          }`}
                      >
                        <i className={`fa-solid ${tab.icon} w-4 text-center text-sm`} />
                        <span className="flex-grow">{tab.label}</span>
                        {tab.id === 'verify' && verifyStatus !== 'approved' && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-amber-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Bottom Profile/Actions */}
        <div className="pt-4 border-t border-gray-150 space-y-2 mt-auto shrink-0">
          {/* User profile row */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-8.5 h-8.5 rounded-lg object-cover shrink-0 shadow-sm" />
            ) : (
              <div className="w-8.5 h-8.5 rounded-lg bg-gradient-to-br from-seller-500 to-seller-700 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                {getInitials(user?.name || user?.username)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-900 text-[13px] truncate leading-tight">{user?.name || user?.username || '—'}</p>
              <p className="text-[10px] text-gray-400 truncate mt-0.5 leading-none">{user?.email}</p>
            </div>
          </div>

          {/* Log out */}
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-all text-center cursor-pointer bg-white"
          >
            <i className="fa-solid fa-right-from-bracket text-[10px]" /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-grow h-full flex flex-col min-w-0">
        {/* Verification banner if present */}
        {verifyStatus !== 'approved' && (
          <div className="px-6 pt-6 shrink-0">
            <VerificationBanner status={verifyStatus} onGoVerify={() => goTab('verify')} />
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-6 md:p-10 bg-gray-50/50">

          {/* ════════════ TAB: OVERVIEW ════════════ */}
          {currentTab === 'overview' && (
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 mb-6">Tổng quan</h2>

              {/* Stats grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                  icon="fa-list" iconBg="bg-seller-50" iconColor="text-seller-600"
                  label="Tổng tin đăng"
                  value={overviewStats.totalListings}
                  badge={`${overviewStats.activeListings} còn trống`}
                  badgeColor="bg-seller-50 text-seller-700"
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
                  icon="fa-shield-halved"
                  iconBg={
                    verifyStatus === 'approved'
                      ? 'bg-seller-50'
                      : verifyStatus === 'pending'
                        ? 'bg-amber-50'
                        : 'bg-red-50'
                  }
                  iconColor={
                    verifyStatus === 'approved'
                      ? 'text-seller-600'
                      : verifyStatus === 'pending'
                        ? 'text-amber-600'
                        : 'text-red-500'
                  }
                  label="Trạng thái TK"
                  value={verifyBadge.label}
                />
              </div>

              {/* Bar chart (visual mock) */}
              <div className="bg-white rounded-2xl p-6 mb-8 border border-gray-100 shadow-premium-sm hover-lift transition-all">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-sm">Hiệu quả đăng tin</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">Số lượt xem tin đăng & liên hệ trực tuyến</p>
                  </div>
                  <span className="text-xs font-bold text-seller-700 bg-seller-50 border border-seller-100 px-3 py-1 rounded-full">4 tuần qua</span>
                </div>
                <div className="flex items-end justify-between gap-4 h-36 px-2">
                  {[
                    { h: 35, label: 'Tuần 1', views: '124 lượt' },
                    { h: 58, label: 'Tuần 2', views: '210 lượt' },
                    { h: 80, label: 'Tuần 3', views: '320 lượt' },
                    { h: 95, label: 'Tuần 4', views: '450 lượt', active: true }
                  ].map((item, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap z-10">
                        {item.views}
                      </div>
                      <div className="w-full bg-gray-50 rounded-xl h-28 flex items-end overflow-hidden border border-gray-100/50">
                        <div
                          className={`w-full rounded-t-lg transition-all duration-700 origin-bottom scale-y-100 group-hover:scale-y-[1.02] ${item.active
                              ? 'bg-gradient-to-t from-emerald-600 to-teal-500'
                              : 'bg-seller-100 group-hover:bg-seller-200'
                            }`}
                          style={{ height: `${item.h}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-bold ${item.active ? 'text-seller-700' : 'text-gray-400'}`}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent listings table */}
              <div>
                <div className="flex justify-between items-center mb-5">
                  <h3 className="font-extrabold text-gray-900 text-sm">Tin đăng gần đây</h3>
                  <button onClick={() => goTab('listings')} className="text-xs text-seller-600 font-bold hover:text-seller-700 transition">
                    Xem tất cả →
                  </button>
                </div>
                {loading ? <Spinner /> : myListings.length === 0 ? (
                  <EmptyState
                    icon="fa-list"
                    title="Chưa có tin đăng nào"
                    subtitle="Tạo tin đăng đầu tiên để bắt đầu cho thuê"
                    action={
                      <button onClick={() => goTab('add-listing')} className="mt-4 px-5 py-2.5 bg-seller-600 hover:bg-seller-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all hover-lift active:scale-95 border-0 cursor-pointer">
                        + Tạo tin đăng
                      </button>
                    }
                  />
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-premium-sm bg-white">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="py-3 px-5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phòng</th>
                          <th className="py-3 px-5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Khu vực</th>
                          <th className="py-3 px-5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Giá</th>
                          <th className="py-3 px-5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {myListings.slice(0, 5).map(l => {
                          const id = l._id || l.id;
                          const isRented = l.status === 'rented' || l.rented;
                          return (
                            <tr key={id} className="hover:bg-gray-50/40 transition-colors">
                              <td className="py-4 px-5 font-bold text-gray-800 line-clamp-1">{l.title}</td>
                              <td className="py-4 px-5 text-gray-400 text-xs truncate max-w-[200px]">{l.addressLine || l.location}</td>
                              <td className="py-4 px-5 font-extrabold text-seller-700">
                                {Number(l.price) >= 1000000
                                  ? (Number(l.price) / 1e6).toFixed(1) + ' tr'
                                  : (l.price || '—')}
                                /tháng
                              </td>
                              <td className="py-4 px-5">
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold border ${isRented ? 'bg-teal-50 border-teal-200 text-teal-700' : l.censored
                                    ? 'bg-seller-50 border-seller-200 text-seller-700'
                                    : 'bg-amber-50 border-amber-200 text-amber-700'
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

          {/* ── ════════════ TAB: LISTINGS ════════════ ── */}
          {currentTab === 'listings' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">Danh sách tin đăng</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Quản lý và cập nhật các tin đăng cho thuê phòng</p>
                </div>
                <button
                  onClick={() => goTab('add-listing')}
                  className="flex items-center gap-2 bg-seller-600 hover:bg-seller-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm hover-lift active:scale-95 border-0 cursor-pointer"
                >
                  <i className="fa-solid fa-circle-plus text-sm" /> Tạo tin mới
                </button>
              </div>

              {loading ? <Spinner /> : myListings.length === 0 ? (
                <EmptyState
                  icon="fa-list" title="Chưa có tin đăng" subtitle="Hãy tạo tin đăng đầu tiên của bạn để khách hàng có thể tìm kiếm."
                  action={
                    <button onClick={() => goTab('add-listing')} className="mt-4 px-5 py-2.5 bg-seller-600 hover:bg-seller-700 text-white text-xs font-bold rounded-xl shadow-sm hover-lift active:scale-95 border-0 cursor-pointer">
                      + Tạo tin ngay
                    </button>
                  }
                />
              ) : (
                <div className="space-y-4">
                  {myListings.filter(l => l.status !== 'deleted').map(l => {
                    const id = l._id || l.id;
                    const STATUS = {
                      draft:    { cls: 'bg-gray-100 border-gray-200 text-gray-600',       label: 'Nháp' },
                      pending:  { cls: 'bg-amber-50 border-amber-200 text-amber-700',     label: 'Chờ duyệt' },
                      approved: { cls: 'bg-seller-50 border-seller-200 text-seller-700',  label: 'Đã duyệt' },
                      rejected: { cls: 'bg-red-50 border-red-200 text-red-700',           label: 'Bị từ chối' },
                      hidden:   { cls: 'bg-gray-50 border-gray-200 text-gray-500',        label: 'Đang ẩn' },
                      expired:  { cls: 'bg-gray-100 border-gray-300 text-gray-500',       label: 'Hết hạn' },
                    };
                    const badge = STATUS[l.status] || STATUS.pending;
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-5 p-5 border border-gray-100 rounded-2xl bg-white shadow-premium-sm hover-lift hover:border-seller-200 transition-all duration-300"
                      >
                        <img
                          src={l.imageUrls?.[0] || l.image || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=120&q=70'}
                          alt={l.title}
                          className="w-20 h-20 object-cover rounded-xl border border-gray-150 shrink-0 shadow-sm"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 text-base line-clamp-1">{l.title}</h4>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-1 flex items-center gap-1">
                            <i className="fa-solid fa-location-dot text-seller-500 shrink-0 text-[10px]" />
                            <span>{l.district ? `${l.district}, ${l.province}` : (l.addressLine || '—')}</span>
                          </p>
                          {l.status === 'rejected' && l.rejectedReason && (
                            <p className="mt-1 text-[11px] text-red-600 bg-red-50 rounded-lg px-2.5 py-1 line-clamp-1">
                              <i className="fa-solid fa-circle-exclamation mr-1" />{l.rejectedReason}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2.5">
                            <span className="text-sm font-black text-seller-700 bg-seller-50/50 border border-seller-100/50 px-2.5 py-0.5 rounded-lg">
                              {Number(l.price) >= 1000000
                                ? (Number(l.price) / 1e6).toFixed(1) + ' tr/tháng'
                                : (l.price || '—') + '/tháng'}
                            </span>
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {l.status === 'draft' && (
                            <button
                              onClick={() => handleSubmitDraft(id)}
                              className="px-3 py-1.5 text-seller-700 bg-seller-50 hover:bg-seller-100 rounded-xl transition border border-seller-200 cursor-pointer text-xs font-bold active:scale-95"
                              title="Gửi duyệt"
                            >
                              <i className="fa-solid fa-paper-plane mr-1" />Gửi duyệt
                            </button>
                          )}
                          <button
                            onClick={() => goTab('add-listing', { editId: id })}
                            className="p-2.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl transition border-0 cursor-pointer shadow-xs active:scale-95"
                            title="Sửa"
                          >
                            <i className="fa-solid fa-pen-to-square text-sm" />
                          </button>
                          <button
                            onClick={() => handleDeleteListing(id)}
                            className="p-2.5 text-danger-600 bg-red-50 hover:bg-red-100 rounded-xl transition border-0 cursor-pointer shadow-xs active:scale-95"
                            title="Xóa"
                          >
                            <i className="fa-solid fa-trash text-sm" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── ════════════ TAB: PROPERTIES & ROOMS ════════════ ── */}
          {currentTab === 'properties' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">Quản lý Nhà trọ & Phòng</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Quản lý cơ sở vật chất của bạn để bắt đầu đăng tin</p>
                </div>
                <div className="flex gap-2.5">
                  <button
                    onClick={handleAddPropertyOpen}
                    className="flex items-center gap-2 bg-seller-600 hover:bg-seller-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm hover-lift active:scale-95 cursor-pointer border-0"
                  >
                    <i className="fa-solid fa-plus text-xs" /> Thêm nhà trọ
                  </button>
                  {selectedPropertyId && (
                    <button
                      onClick={() => {
                        setEditingRoom(null);
                        setRoomName(''); setRoomTypeState('single'); setRoomArea(''); setRoomMaxOccupants(1); setRoomPrice(''); setRoomDeposit(''); setRoomElectricity(''); setRoomWater(''); setRoomInternet(''); setRoomParking(''); setRoomAmenitiesState([]); setRoomRules('');
                        setRoomModalOpen(true);
                      }}
                      className="flex items-center gap-2 bg-white hover:bg-gray-50 text-seller-700 border border-seller-200 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm hover-lift active:scale-95 cursor-pointer"
                    >
                      <i className="fa-solid fa-plus text-xs" /> Thêm phòng
                    </button>
                  )}
                </div>
              </div>

              {propLoading ? <Spinner /> : myProperties.length === 0 ? (
                <EmptyState
                  icon="fa-building"
                  title="Chưa có nhà trọ nào"
                  subtitle="Hãy thêm tòa nhà/nhà trọ đầu tiên của bạn để có thể quản lý các phòng."
                  action={
                    <button
                      onClick={handleAddPropertyOpen}
                      className="mt-4 px-5 py-2.5 bg-seller-600 hover:bg-seller-700 text-white text-xs font-bold rounded-xl shadow-sm hover-lift active:scale-95 cursor-pointer border-0"
                    >
                      + Thêm nhà trọ đầu tiên
                    </button>
                  }
                />
              ) : (
                <div className="grid lg:grid-cols-[320px_1fr] gap-6 items-start">
                  {/* Left: Properties list */}
                  <div className="space-y-3.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Danh sách nhà trọ ({myProperties.length})</p>
                    <div className="max-h-[550px] overflow-y-auto pr-1.5 space-y-3.5">
                      {myProperties.map(p => {
                        const isSelected = selectedPropertyId === p._id || selectedPropertyId === p.id;
                        return (
                          <div
                            key={p._id || p.id}
                            onClick={() => setSelectedPropertyId(p._id || p.id)}
                            className={`p-4.5 rounded-2xl border text-left transition-all duration-350 cursor-pointer ${isSelected
                                ? 'border-seller-500 bg-seller-50/20 shadow-premium-sm ring-1 ring-seller-500/20'
                                : 'border-gray-100 bg-white hover:border-seller-200 hover:shadow-premium-sm hover-lift'
                              }`}
                          >
                            <CardCarousel imageUrls={p.imageUrls || (p.image ? [p.image] : [])} height="h-28" />
                            <div className="flex justify-between items-start gap-1">
                              <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{p.name}</h4>
                              <div className="flex gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => handleEditPropertyOpen(p)}
                                  className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition border-0 bg-transparent cursor-pointer shadow-none active:scale-90"
                                  title="Sửa nhà trọ"
                                >
                                  <i className="fa-solid fa-pen text-[10px]" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProperty(p._id || p.id)}
                                  className="p-1.5 text-gray-400 hover:text-danger-600 hover:bg-red-50 rounded-lg transition border-0 bg-transparent cursor-pointer shadow-none active:scale-90"
                                  title="Xóa nhà trọ"
                                >
                                  <i className="fa-solid fa-trash text-[10px]" />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-gray-450 mt-2 line-clamp-2 flex items-start gap-1">
                              <i className="fa-solid fa-location-dot text-seller-500 mt-0.5 shrink-0 text-[10px]" />
                              <span className="leading-tight">{[p.addressLine, p.ward, p.district, p.province].filter(Boolean).join(', ')}</span>
                            </p>
                            {p.description && (
                              <p className="text-[10px] text-gray-400 mt-2.5 bg-gray-50 border border-gray-100 rounded-lg p-1.5 italic line-clamp-1">{p.description}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: Rooms list */}
                  <div className="border border-gray-100 rounded-2xl p-6 bg-white shadow-premium-sm">
                    {selectedPropertyId ? (
                      <div>
                        <div className="flex items-center justify-between border-b border-gray-50 pb-4.5 mb-5">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-seller-600 mb-0.5">Phòng thuộc tòa nhà</p>
                            <h3 className="font-extrabold text-gray-900 text-base">
                              {myProperties.find(p => (p._id === selectedPropertyId || p.id === selectedPropertyId))?.name || 'Nhà trọ'}
                            </h3>
                          </div>
                          <button
                            onClick={() => {
                              setEditingRoom(null);
                              setRoomName(''); setRoomTypeState('single'); setRoomArea(''); setRoomMaxOccupants(1); setRoomPrice(''); setRoomDeposit(''); setRoomElectricity(''); setRoomWater(''); setRoomInternet(''); setRoomParking(''); setRoomAmenitiesState([]); setRoomRules('');
                              setRoomModalOpen(true);
                            }}
                            className="px-4 py-2 bg-seller-600 hover:bg-seller-700 text-white rounded-xl text-xs font-bold transition shadow-sm hover-lift active:scale-95 cursor-pointer border-0"
                          >
                            + Thêm phòng mới
                          </button>
                        </div>

                        {roomLoading ? (
                          <Spinner />
                        ) : propertyRooms.length === 0 ? (
                          <EmptyState
                            icon="fa-door-open"
                            title="Chưa có phòng nào"
                            subtitle="Thêm phòng đầu tiên cho nhà trọ này để bắt đầu quản lý cho thuê."
                            action={
                              <button
                                onClick={() => {
                                  setEditingRoom(null);
                                  setRoomName(''); setRoomTypeState('single'); setRoomArea(''); setRoomMaxOccupants(1); setRoomPrice(''); setRoomDeposit(''); setRoomElectricity(''); setRoomWater(''); setRoomInternet(''); setRoomParking(''); setRoomAmenitiesState([]); setRoomRules('');
                                  setRoomModalOpen(true);
                                }}
                                className="mt-4 px-5 py-2.5 bg-seller-600 hover:bg-seller-700 text-white text-xs font-bold rounded-xl shadow-sm hover-lift active:scale-95 cursor-pointer border-0"
                              >
                                + Thêm phòng trọ đầu tiên
                              </button>
                            }
                          />
                        ) : (
                          <div className="grid sm:grid-cols-2 gap-5">
                            {propertyRooms.map(room => {
                              return (
                                <div
                                  key={room._id || room.id}
                                  className="p-5 rounded-2xl border border-gray-100 bg-white shadow-premium-sm hover:border-seller-200 hover:shadow-premium-md hover-lift transition-all duration-300 flex flex-col justify-between"
                                >
                                  <div>
                                    <CardCarousel imageUrls={room.imageUrls || []} height="h-36" />
                                    <div className="flex justify-between items-start mb-2.5">
                                      <div>
                                        <h4 className="font-bold text-gray-900 text-sm">{room.name || 'Không tên'}</h4>
                                        <span className="inline-block px-2 py-0.5 mt-1.5 bg-gray-50 border border-gray-200/50 text-gray-400 rounded-full text-[9px] font-bold">
                                          {ROOM_TYPE_LABELS[room.roomType] || room.roomType}
                                        </span>
                                      </div>
                                      <div className="flex gap-0.5">
                                        <button
                                          onClick={() => handleCloneRoomOpen(room)}
                                          className="p-1.5 text-gray-400 hover:text-seller-600 hover:bg-seller-50 rounded-lg transition border-0 bg-transparent cursor-pointer active:scale-90"
                                          title="Nhân bản phòng"
                                        >
                                          <i className="fa-solid fa-copy text-xs" />
                                        </button>
                                        <button
                                          onClick={() => handleEditRoomOpen(room)}
                                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition border-0 bg-transparent cursor-pointer active:scale-90"
                                          title="Sửa phòng"
                                        >
                                          <i className="fa-solid fa-pen text-xs" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteRoom(room._id || room.id)}
                                          className="p-1.5 text-gray-400 hover:text-danger-600 rounded-lg transition border-0 bg-transparent cursor-pointer active:scale-90"
                                          title="Xóa phòng"
                                        >
                                          <i className="fa-solid fa-trash text-xs" />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4 pt-4 border-t border-gray-50 text-xs text-gray-500">
                                      <div>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-0.5">Giá thuê</span>
                                        <span className="font-extrabold text-seller-700">{(room.price || 0).toLocaleString('vi-VN')}₫</span>
                                      </div>
                                      <div>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-0.5">Diện tích</span>
                                        <span className="font-bold text-gray-900">{room.area} m²</span>
                                      </div>
                                      <div>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-0.5">Số người tối đa</span>
                                        <span className="font-bold text-gray-900">{room.maxOccupants} người</span>
                                      </div>
                                      <div>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-0.5">Tiền cọc</span>
                                        <span className="font-bold text-gray-900">{(room.deposit || 0).toLocaleString('vi-VN')}₫</span>
                                      </div>
                                    </div>

                                    {/* Utilities */}
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 pt-3 border-t border-gray-50 text-[10px] text-gray-500 bg-gray-50/50 p-2.5 rounded-xl">
                                      {(room.electricityRate !== undefined && room.electricityRate !== null) && (
                                        <div className="flex items-center gap-1.5">
                                          <i className="fa-solid fa-bolt text-amber-500 w-3 text-center" />
                                          <span>Điện: <strong className="text-gray-700">{room.electricityRate.toLocaleString('vi-VN')}đ</strong></span>
                                        </div>
                                      )}
                                      {(room.waterRate !== undefined && room.waterRate !== null) && (
                                        <div className="flex items-center gap-1.5">
                                          <i className="fa-solid fa-droplet text-blue-500 w-3 text-center" />
                                          <span>Nước: <strong className="text-gray-700">{room.waterRate.toLocaleString('vi-VN')}đ</strong></span>
                                        </div>
                                      )}
                                      {(room.internetFee !== undefined && room.internetFee !== null) && (
                                        <div className="flex items-center gap-1.5">
                                          <i className="fa-solid fa-wifi text-indigo-500 w-3 text-center" />
                                          <span>Mạng: <strong className="text-gray-700">{room.internetFee.toLocaleString('vi-VN')}đ</strong></span>
                                        </div>
                                      )}
                                      {(room.parkingFee !== undefined && room.parkingFee !== null) && (
                                        <div className="flex items-center gap-1.5">
                                          <i className="fa-solid fa-motorcycle text-seller-600 w-3 text-center" />
                                          <span>Xe: <strong className="text-gray-700">{room.parkingFee.toLocaleString('vi-VN')}đ</strong></span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {room.amenities && room.amenities.length > 0 && (
                                    <div className="mt-4.5">
                                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1.5">Tiện ích phòng</span>
                                      <div className="flex flex-wrap gap-1.5">
                                        {room.amenities.slice(0, 3).map((a, i) => (
                                          <span key={i} className="px-2 py-0.5 bg-seller-50 border border-seller-100/50 text-seller-700 rounded-lg text-[9px] font-bold">{a}</span>
                                        ))}
                                        {room.amenities.length > 3 && (
                                          <span className="px-2 py-0.5 bg-gray-50 border border-gray-200/50 text-gray-400 rounded-lg text-[9px] font-bold">+{room.amenities.length - 3}</span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white">
                        <i className="fa-solid fa-arrow-left text-3xl mb-3 text-seller-500 animate-pulse" />
                        <p className="text-sm font-semibold text-gray-800">Chọn một nhà trọ bên trái</p>
                        <p className="text-xs mt-1 text-gray-400">Bạn sẽ xem và quản lý được danh sách phòng thuộc tòa nhà đó.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════ TAB: ADD/EDIT LISTING ════════════ */}
          {currentTab === 'add-listing' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                {editId && (
                  <button onClick={() => goTab('listings')} className="text-gray-400 hover:text-gray-700 transition">
                    <i className="fa-solid fa-arrow-left" />
                  </button>
                )}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-seller-600">
                    {editId ? 'Chỉnh sửa tin' : 'Đăng tin mới'}
                  </p>
                  <h2 className="text-lg font-extrabold text-gray-900">
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

              <form onSubmit={handleListingSubmit} className="space-y-6 max-w-5xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* Cột trái: Thông tin & Liên kết */}
                  <div className="space-y-6">
                    {/* Select Property and Room */}
                    <section className="bg-white rounded-2xl p-5 border border-gray-100 shadow-premium-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-seller-100 flex items-center justify-center">
                          <i className="fa-solid fa-house-laptop text-seller-600 text-xs" />
                        </div>
                        <h3 className="font-bold text-sm text-gray-800">Liên kết Nhà & Phòng</h3>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>Chọn Nhà trọ / Tòa nhà *</label>
                          <select
                            required
                            className={inputCls}
                            value={listingPropertyId}
                            onChange={e => {
                              const val = e.target.value;
                              setListingPropertyId(val);
                              setListingRoomId('');
                              const prop = myProperties.find(p => (p._id === val || p.id === val));
                              if (prop) {
                                const addr = [prop.addressLine, prop.ward, prop.district, prop.province].filter(Boolean).join(', ');
                                setListLocation(addr);
                              } else {
                                setListLocation('');
                              }
                            }}
                          >
                            <option value="">-- Chọn Nhà trọ --</option>
                            {myProperties.map(p => (
                              <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
                            ))}
                          </select>
                          {myProperties.length === 0 && (
                            <p className="text-xs text-red-500 mt-1">
                              Bạn chưa có nhà trọ nào. Vui lòng{' '}
                              <button type="button" onClick={() => goTab('properties')} className="underline font-bold text-seller-600 bg-transparent border-0 cursor-pointer">
                                tạo nhà trọ mới
                              </button>{' '}
                              trước khi đăng tin.
                            </p>
                          )}
                        </div>
                        <div>
                          <label className={labelCls}>Chọn phòng *</label>
                          <select
                            required
                            disabled={!listingPropertyId}
                            className={inputCls}
                            value={listingRoomId}
                            onChange={e => handleListingRoomChange(e.target.value)}
                          >
                            <option value="">-- Chọn Phòng --</option>
                            {listingRooms.map(r => (
                              <option key={r._id || r.id} value={r._id || r.id}>{r.name || 'Không tên'}</option>
                            ))}
                          </select>
                          {listingPropertyId && listingRooms.length === 0 && !listingRoomsLoading && (
                            <p className="text-xs text-red-500 mt-1">
                              Nhà trọ này chưa có phòng nào. Vui lòng{' '}
                              <button type="button" onClick={() => goTab('properties')} className="underline font-bold text-seller-600 bg-transparent border-0 cursor-pointer">
                                thêm phòng trọ mới
                              </button>{' '}
                              vào nhà trọ này.
                            </p>
                          )}
                        </div>
                      </div>
                    </section>

                    {/* Basic info */}
                    <section className="bg-white rounded-2xl p-5 border border-gray-100 shadow-premium-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-seller-100 flex items-center justify-center">
                          <i className="fa-solid fa-info text-seller-600 text-xs" />
                        </div>
                        <h3 className="font-bold text-sm text-gray-800">Thông tin cơ bản tin đăng</h3>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className={labelCls}>Tên hiển thị / Tiêu đề tin đăng *</label>
                          <input required className={inputCls} value={listTitle} onChange={e => setListTitle(e.target.value)}
                            placeholder="Căn hộ Studio cao cấp đầy đủ tiện nghi Quận 1" />
                        </div>
                        <div>
                          <label className={labelCls}>Loại hình phòng</label>
                          <select disabled className={inputCls + ' bg-gray-100 cursor-not-allowed'} value={listType} onChange={e => setListType(e.target.value)}>
                            <option value="single">Phòng đơn / Khép kín</option>
                            <option value="shared">Phòng ở ghép</option>
                            <option value="mini_apartment">Căn hộ mini</option>
                            <option value="apartment">Căn hộ nguyên căn</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Giá thuê (VND/tháng) *</label>
                          <input required type="number" className={inputCls} value={listPrice}
                            onChange={e => setListPrice(e.target.value)} placeholder="5500000" />
                        </div>
                        <div>
                          <label className={labelCls}>Diện tích (m²) *</label>
                          <input required type="number" className={inputCls} value={listArea}
                            onChange={e => setListArea(e.target.value)} placeholder="25" />
                        </div>
                        <div>
                          <label className={labelCls}>Số điện thoại liên hệ</label>
                          <input type="tel" className={inputCls} value={listPhone}
                            onChange={e => setListPhone(e.target.value)} placeholder="0901234567" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={labelCls}>Địa chỉ chi tiết (Prefilled từ Nhà trọ)</label>
                          <input required readOnly className={inputCls + ' bg-gray-100 cursor-not-allowed'} value={listLocation}
                            placeholder="Chọn nhà trọ ở trên để tự động nhập địa chỉ" />
                        </div>
                      </div>
                    </section>

                    {/* Description */}
                    <section className="bg-white rounded-2xl p-5 border border-gray-100 shadow-premium-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-seller-100 flex items-center justify-center">
                          <i className="fa-solid fa-align-left text-seller-600 text-xs" />
                        </div>
                        <h3 className="font-bold text-sm text-gray-800">Mô tả chi tiết</h3>
                      </div>
                      <textarea
                        rows={5} className={inputCls + ' resize-none'} value={listDesc}
                        onChange={e => setListDesc(e.target.value)}
                        placeholder="Mô tả nội thất, tiện nghi, giờ giấc, camera an ninh..."
                      />
                    </section>
                  </div>

                  {/* Cột phải: Hình ảnh & Tiện ích */}
                  <div className="space-y-6">
                    {/* Image Upload Zone */}
                    <section className="bg-white rounded-2xl p-5 border border-gray-100 shadow-premium-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-seller-100 flex items-center justify-center">
                          <i className="fa-solid fa-image text-seller-600 text-xs" />
                        </div>
                        <h3 className="font-bold text-sm text-gray-800">Hình ảnh tin đăng</h3>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className={labelCls}>Tải ảnh lên (Chọn nhiều ảnh)</label>
                          <input
                            type="file" accept="image/*" multiple
                            onChange={e => handleListingImagesUpload(e.target.files)}
                            className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-seller-50 file:text-seller-700 hover:file:bg-seller-100 transition cursor-pointer mb-3"
                          />
                          {listImageLoading && (
                            <div className="text-xs text-seller-600 font-semibold flex items-center gap-1.5 mb-3">
                              <i className="fa-solid fa-circle-notch fa-spin animate-spin" />
                              Đang tải ảnh lên...
                            </div>
                          )}
                        </div>

                        <div>
                          <label className={labelCls}>Hoặc thêm ảnh bằng URL liên kết</label>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              placeholder="https://images.unsplash.com/..."
                              className={`${inputCls} flex-1`}
                              id="online-image-url-input"
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = e.target.value.trim();
                                  if (val) {
                                    setListImageUrls(prev => [...prev, val]);
                                    e.target.value = '';
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById('online-image-url-input');
                                const val = input?.value.trim();
                                if (val) {
                                  setListImageUrls(prev => [...prev, val]);
                                  if (input) input.value = '';
                                }
                              }}
                              className="px-4 py-2.5 bg-seller-600 hover:bg-seller-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer border-0"
                            >
                              Thêm
                            </button>
                          </div>
                        </div>

                        {listImageUrls && listImageUrls.length > 0 && (
                          <div>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Ảnh đã thêm ({listImageUrls.length})</p>
                            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto p-1 border border-gray-50 rounded-xl">
                              {listImageUrls.map((url, index) => (
                                <div key={index} className="relative border border-gray-200 rounded-xl overflow-hidden h-28 w-full group shadow-sm">
                                  <img
                                    src={url}
                                    alt={`preview-${index}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setListImageUrls(prev => prev.filter((_, i) => i !== index))}
                                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition border-0 cursor-pointer shadow"
                                  >
                                    <i className="fa-solid fa-xmark text-xs" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Amenities */}
                    <section className="bg-white rounded-2xl p-5 border border-gray-100 shadow-premium-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-seller-100 flex items-center justify-center">
                          <i className="fa-solid fa-circle-check text-seller-600 text-xs" />
                        </div>
                        <h3 className="font-bold text-sm text-gray-800">Tiện ích tích hợp</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {AMENITIES_LIST.map(item => (
                          <label
                            key={item}
                            className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer select-none text-xs font-medium transition-all ${listAmenities.includes(item)
                                ? 'border-seller-400 bg-seller-50 text-seller-800'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={listAmenities.includes(item)}
                              onChange={() => toggleAmenity(item)}
                              className="rounded text-seller-600 focus:ring-seller-500 border-gray-300"
                            />
                            {item}
                          </label>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-150 justify-end">
                  <button
                    type="button" onClick={() => goTab('listings')}
                    className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition cursor-pointer border-0"
                  >
                    Hủy bỏ
                  </button>
                  {!editId && (
                    <button
                      type="button" disabled={listSubmitting || listImageLoading}
                      onClick={(e) => handleListingSubmit(e, true)}
                      className="px-6 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 disabled:opacity-60 text-gray-700 font-bold rounded-xl text-sm transition cursor-pointer"
                    >
                      {listSubmitting ? <i className="fa-solid fa-circle-notch fa-spin" /> : <><i className="fa-regular fa-floppy-disk mr-1.5" />Lưu nháp</>}
                    </button>
                  )}
                  <button
                    type="submit" disabled={listSubmitting || listImageLoading}
                    className="px-8 py-2.5 bg-seller-600 hover:bg-seller-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition shadow-sm cursor-pointer border-0"
                  >
                    {listSubmitting
                      ? <><i className="fa-solid fa-circle-notch fa-spin mr-2" />{editId ? 'Đang lưu...' : 'Đang đăng...'}</>
                      : (editId ? 'Lưu cập nhật' : <><i className="fa-solid fa-paper-plane mr-1.5" />Gửi duyệt</>)}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ════════════ TAB: APPOINTMENTS ════════════ */}
          {currentTab === 'appointments' && (
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 mb-5">Lịch hẹn xem phòng</h2>

              {/* Filter tabs */}
              <div className="flex gap-1 mb-6 p-1 bg-gray-100 rounded-xl w-fit">
                {[
                  { val: 'all', label: 'Tất cả' },
                  { val: 'pending', label: 'Chờ xác nhận' },
                  { val: 'approved', label: 'Đã xác nhận' },
                  { val: 'cancelled', label: 'Đã hủy' },
                ].map(f => (
                  <button
                    key={f.val}
                    onClick={() => setApptFilter(f.val)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${apptFilter === f.val
                        ? 'bg-white shadow-sm text-seller-700 font-bold'
                        : 'text-gray-500 hover:text-gray-700'
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
                        className={`flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-2xl border transition-all ${appt.status === 'cancelled' ? 'bg-gray-50 border-gray-100 opacity-70' : 'bg-white border-gray-100 hover:border-seller-100 hover:shadow-sm'
                          }`}
                      >
                        <img
                          src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=120&q=70"
                          alt="room"
                          className="w-24 h-16 rounded-xl object-cover shrink-0"
                        />
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-sm">{appt.roomTitle || appt.listingTitle}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            <i className="fa-solid fa-user mr-1.5 text-gray-300" />
                            {appt.tenantName || appt.visitorName} · {appt.tenantPhone || appt.phone}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-seller-700 bg-seller-50 rounded-lg px-2.5 py-1.5 w-fit border border-seller-100">
                            <span><i className="fa-solid fa-calendar mr-1" />{appt.date}</span>
                            <span className="w-1 h-1 rounded-full bg-seller-300" />
                            <span><i className="fa-solid fa-clock mr-1" />{appt.time}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${appt.status === 'approved' ? 'bg-seller-100 text-seller-700 border border-seller-200'
                              : appt.status === 'pending' ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                : 'bg-gray-100 text-gray-500 border border-gray-200'
                            }`}>
                            {appt.status === 'approved' ? 'Đã xác nhận' : appt.status === 'pending' ? 'Chờ xác nhận' : 'Đã hủy'}
                          </span>
                          {appt.status === 'pending' && (
                            <div className="flex gap-2 mt-1">
                              <button
                                onClick={() => handleApptAction(appt, 'approved')}
                                className="px-4 py-1.5 bg-seller-600 hover:bg-seller-700 text-white text-xs font-bold rounded-full transition"
                              >
                                Xác nhận
                              </button>
                              <button
                                onClick={() => handleApptAction(appt, 'cancelled')}
                                className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-full transition border border-gray-200"
                              >
                                Từ chối
                              </button>
                            </div>
                          )}
                          {appt.tenantPhone && (
                            <a href={`tel:${appt.tenantPhone}`} className="text-xs text-seller-600 font-bold hover:underline">
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
              <h2 className="text-lg font-extrabold text-gray-900 mb-5">Quản lý khách thuê</h2>

              {/* Search & filter */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
                  <input
                    type="text" className={inputCls + ' pl-10'} placeholder="Tìm tên khách hoặc phòng..."
                    value={tenantSearch} onChange={e => setTenantSearch(e.target.value)}
                  />
                </div>
                <select
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-600 focus:ring-2 focus:ring-seller-500 outline-none"
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
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-left">
                        {['Khách thuê', 'Phòng', 'Điện thoại', 'Ngày hẹn', 'Trạng thái', 'Ghi chú'].map(h => (
                          <th key={h} className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredTenants.map(t => {
                        const apptId = t._id || t.id;
                        const user = t.user || {};
                        const name = user.name || t.tenantName || t.visitorName || '—';
                        const initials = name.substring(0, 2).toUpperCase();
                        const STATUS_APPT = {
                          pending:   { cls: 'bg-amber-100 text-amber-700',   label: 'Chờ xác nhận' },
                          confirmed: { cls: 'bg-seller-100 text-seller-700', label: 'Đã xác nhận' },
                          proposed:  { cls: 'bg-blue-100 text-blue-700',     label: 'Đề xuất lịch mới' },
                          completed: { cls: 'bg-gray-100 text-gray-600',     label: 'Đã xem phòng' },
                          no_show:   { cls: 'bg-red-100 text-red-600',       label: 'Không đến' },
                        };
                        const apptBadge = STATUS_APPT[t.status] || { cls: 'bg-gray-100 text-gray-500', label: t.status };
                        const isEditingNote = editingNoteId === apptId;
                        return (
                          <tr key={apptId} className="hover:bg-gray-50/60 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-seller-100 text-seller-700 flex items-center justify-center text-xs font-bold shrink-0">
                                  {initials}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-800">{name}</p>
                                  <p className="text-[11px] text-gray-400">{user.email || ''}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-gray-600 text-xs">{t.listing?.title || '—'}</td>
                            <td className="py-3 px-4 text-gray-500 text-xs">{user.phone || '—'}</td>
                            <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                              {t.scheduledAt ? new Date(t.scheduledAt).toLocaleDateString('vi-VN') : '—'}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${apptBadge.cls}`}>
                                {apptBadge.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 min-w-[180px]">
                              {isEditingNote ? (
                                <div className="flex gap-1.5 items-center">
                                  <input
                                    autoFocus
                                    value={noteText}
                                    onChange={e => setNoteText(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveNote(apptId); if (e.key === 'Escape') setEditingNoteId(null); }}
                                    placeholder="Nhập ghi chú..."
                                    className="border border-gray-200 rounded-lg px-2.5 py-1 text-xs flex-1 focus:outline-none focus:ring-1 focus:ring-seller-400"
                                  />
                                  <button onClick={() => handleSaveNote(apptId)} className="text-seller-600 hover:text-seller-700 text-xs font-bold">Lưu</button>
                                  <button onClick={() => setEditingNoteId(null)} className="text-gray-400 hover:text-gray-600 text-xs">Hủy</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setEditingNoteId(apptId); setNoteText(t.sellerNote || ''); }}
                                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-seller-600 group transition"
                                >
                                  <i className="fa-regular fa-pen-to-square opacity-0 group-hover:opacity-100 transition" />
                                  <span className={t.sellerNote ? 'text-gray-700' : 'text-gray-400 italic'}>
                                    {t.sellerNote || 'Thêm ghi chú...'}
                                  </span>
                                </button>
                              )}
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
              <h2 className="text-lg font-extrabold text-gray-900 mb-2">Gói dịch vụ</h2>
              <p className="text-sm text-gray-500 mb-6">Nâng cấp gói để đăng tin ưu tiên và hiển thị nổi bật hơn.</p>

              {/* Current subscription */}
              {mySubscription && (
                <div className="bg-seller-50 border border-seller-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-seller-600 flex items-center justify-center">
                    <i className="fa-solid fa-crown text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-seller-800 text-sm">Đang dùng: {mySubscription.packageName}</p>
                    <p className="text-xs text-seller-600">
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
                        className={`rounded-2xl border p-5 flex flex-col transition-all hover:-translate-y-0.5 ${pkg.popular
                            ? 'border-seller-400 bg-gradient-to-b from-emerald-50 to-white shadow-md shadow-seller-100'
                            : 'border-gray-200 bg-white'
                          }`}
                      >
                        {pkg.popular && (
                          <span className="self-start px-2.5 py-0.5 bg-seller-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider mb-3">
                            Phổ biến nhất
                          </span>
                        )}
                        <p className="font-extrabold text-gray-900 text-base">{pkg.name}</p>
                        <p className="text-2xl font-extrabold text-seller-700 mt-1">
                          {pkg.price.toLocaleString('vi-VN')}₫
                          <span className="text-sm font-normal text-gray-400"> /tháng</span>
                        </p>
                        <ul className="mt-4 space-y-2 flex-1">
                          {pkg.features.map(f => (
                            <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                              <i className="fa-solid fa-circle-check text-seller-500 text-[10px]" />
                              {f}
                            </li>
                          ))}
                        </ul>
                        <button
                          onClick={() => sendPaymentLink(pkg)}
                          disabled={payosLoading}
                          className={`mt-5 w-full py-2.5 rounded-xl text-sm font-bold transition ${pkg.popular
                              ? 'bg-seller-600 hover:bg-seller-700 text-white shadow-sm'
                              : 'border border-seller-600 text-seller-600 hover:bg-seller-50'
                            } disabled:opacity-60`}
                        >
                          {payosLoading ? <i className="fa-solid fa-circle-notch fa-spin" /> : 'Mua ngay'}
                        </button>
                      </div>
                    ))
                  ) : packages.map(pkg => (
                    <div key={pkg._id || pkg.id} className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col">
                      <p className="font-extrabold text-gray-900">{pkg.name}</p>
                      <p className="text-2xl font-extrabold text-seller-700 mt-1">
                        {(pkg.price || 0).toLocaleString('vi-VN')}₫
                        <span className="text-sm font-normal text-gray-400"> /tháng</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{pkg.description}</p>
                      <button
                        onClick={() => handleBuyPackage(pkg)}
                        disabled={payosLoading}
                        className="mt-4 w-full py-2 rounded-xl bg-seller-600 hover:bg-seller-700 text-white text-sm font-bold transition disabled:opacity-60"
                      >
                        {payosLoading ? <i className="fa-solid fa-circle-notch fa-spin" /> : 'Đăng ký'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Transaction history */}
              <div>
                <h3 className="font-bold text-gray-800 text-sm mb-3">Lịch sử giao dịch</h3>
                {transactions.length === 0 ? (
                  <p className="text-sm text-gray-400 py-6 text-center">Chưa có giao dịch nào.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-left">
                          {['Gói', 'Số tiền', 'Ngày', 'Trạng thái'].map(h => (
                            <th key={h} className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {transactions.map(tx => (
                          <tr key={tx._id || tx.id} className="hover:bg-gray-50/60">
                            <td className="py-3 px-4 font-semibold text-gray-700">{tx.packageName || '—'}</td>
                            <td className="py-3 px-4 font-bold text-seller-700">{(tx.amount || 0).toLocaleString('vi-VN')}₫</td>
                            <td className="py-3 px-4 text-gray-400 text-xs">{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('vi-VN') : '—'}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${tx.status === 'success' || tx.status === 'paid'
                                  ? 'bg-seller-100 text-seller-700'
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
              <h2 className="text-lg font-extrabold text-gray-900 mb-5">Hộp thư tin nhắn</h2>
              <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden flex h-[calc(100vh-230px)] min-h-[500px] shadow-premium-sm">
                {/* Conversation list */}
                <div className="w-72 shrink-0 border-r border-gray-100 bg-gray-50/50 flex flex-col">
                  <div className="px-4 py-4 border-b border-gray-100 bg-white shrink-0">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hội thoại</p>
                  </div>
                  <div className="flex-grow overflow-y-auto divide-y divide-gray-50 bg-white">
                    {loading ? (
                      <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-seller-500 border-t-transparent rounded-full animate-spin" /></div>
                    ) : conversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-150 flex items-center justify-center mb-2">
                          <i className="fa-solid fa-message text-gray-400 text-sm" />
                        </div>
                        <p className="text-xs text-gray-400 font-medium">Chưa có hội thoại nào</p>
                      </div>
                    ) : conversations.map(conv => {
                      const convId = conv._id || conv.id;
                      const isActive = activeChatId === convId;
                      return (
                        <button
                          key={convId}
                          onClick={() => { selectConversation(conv); }}
                          className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition-all border-0 cursor-pointer ${isActive
                              ? 'bg-seller-50/60 text-seller-800 font-bold border-l-3 border-l-seller-600'
                              : 'bg-transparent text-gray-600 hover:bg-gray-100/50'
                            }`}
                        >
                          {conv.otherUserAvatar ? (
                            <img src={conv.otherUserAvatar} alt="avatar" className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-100" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-seller-100 to-seller-200 text-seller-700 flex items-center justify-center text-xs font-black shrink-0 border border-seller-200/20">
                              {(conv.otherUserName || conv.name || 'K').substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between items-baseline mb-0.5">
                              <p className={`text-xs truncate ${isActive ? 'font-black text-gray-900' : 'font-bold text-gray-700'}`}>
                                {conv.otherUserName || conv.name || 'Khách'}
                              </p>
                              {conv.lastMessageAt && (
                                <span className="text-[9px] text-gray-450 font-medium">
                                  {new Date(conv.lastMessageAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                            <p className={`text-[11px] truncate ${isActive ? 'text-seller-700 font-medium' : 'text-gray-400'}`}>
                              {conv.lastMessage || 'Bắt đầu trò chuyện...'}
                            </p>
                          </div>
                          {conv.unreadBySeller > 0 && (
                            <span className="w-2 h-2 rounded-full bg-seller-500 shrink-0" />
                          )}
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
                      <div className="px-5 py-4 border-b border-gray-100 bg-white flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-seller-500 to-seller-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm shadow-seller-500/10">
                            {activeChatName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-extrabold text-gray-900 text-sm">{activeChatName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-[10px] text-emerald-600 font-bold tracking-wide uppercase">Đang hoạt động</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="flex-grow overflow-y-auto p-5 space-y-4 bg-gray-50/30">
                        {chatMessages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center mb-3 shadow-premium-sm">
                              <i className="fa-solid fa-comments text-seller-500 text-lg animate-bounce" />
                            </div>
                            <p className="text-xs text-gray-400 font-bold">Bắt đầu cuộc trò chuyện!</p>
                            <p className="text-[10px] text-gray-300 mt-0.5">Hãy chào khách một tiếng thật ấm áp nhé.</p>
                          </div>
                        ) : chatMessages.map((m, i) => (
                          <div key={i} className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-[12.5px] shadow-premium-sm ${m.sender === 'me'
                                ? 'bg-seller-600 text-white rounded-tr-sm'
                                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                              }`}>
                              <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                              <p className={`text-[9px] font-bold text-right mt-1.5 ${m.sender === 'me' ? 'text-seller-200' : 'text-gray-400'}`}>
                                {m.time ? new Date(m.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Quick replies */}
                      <div className="px-5 pt-3 pb-1 flex gap-2 overflow-x-auto shrink-0 border-t border-gray-50/50 bg-white">
                        {['Phòng vẫn còn trống ạ', 'Anh/chị có thể xem phòng chiều nay không?', 'Cảm ơn anh/chị đã liên hệ!'].map(qr => (
                          <button
                            key={qr}
                            onClick={() => setMsgInput(qr)}
                            className="shrink-0 text-[10.5px] font-bold px-3.5 py-2 bg-gray-50 hover:bg-seller-50 text-gray-650 hover:text-seller-700 rounded-full border border-gray-250 hover:border-seller-300 transition-all whitespace-nowrap cursor-pointer"
                          >
                            {qr}
                          </button>
                        ))}
                      </div>

                      {/* Input */}
                      <form onSubmit={handleSendMsg} className="px-5 py-3 border-t border-gray-100 flex gap-2.5 bg-white shrink-0">
                        <input
                          type="text"
                          value={msgInput}
                          onChange={e => setMsgInput(e.target.value)}
                          placeholder="Nhập tin nhắn..."
                          className="flex-grow bg-gray-50 border border-gray-250 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-seller-500 focus:border-seller-500 outline-none transition-all"
                        />
                        <button
                          type="submit"
                          className="w-11 h-11 bg-seller-600 hover:bg-seller-700 text-white rounded-xl flex items-center justify-center transition active:scale-95 cursor-pointer shadow-premium-sm shadow-seller-500/10 border-0"
                        >
                          <i className="fa-solid fa-paper-plane text-xs" />
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-center p-8 text-gray-400">
                      <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4 shadow-inner">
                        <i className="fa-solid fa-comment-dots text-2xl text-gray-300" />
                      </div>
                      <p className="text-sm font-bold text-gray-800">Chọn một cuộc hội thoại</p>
                      <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
                        Chọn một khách hàng ở cột trái để trả lời câu hỏi và giúp họ thuê phòng nhanh chóng hơn.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════════════ TAB: VERIFY ════════════ */}
          {currentTab === 'verify' && (
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 mb-2">Xác minh danh tính chủ trọ</h2>
              <p className="text-sm text-gray-500 mb-6">
                Hoàn thiện hồ sơ xác minh để được đăng tin, hiển thị huy hiệu đã xác minh và tăng độ tin cậy.
              </p>

              {/* Current status */}
              <div className={`flex items-center gap-3 p-4 rounded-2xl border mb-6 ${verifyStatus === 'approved' ? 'bg-seller-50 border-seller-200'
                  : verifyStatus === 'pending' ? 'bg-amber-50 border-amber-200'
                    : verifyStatus === 'rejected' ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${verifyBadge.cls}`}>
                  <i className={`fa-solid ${verifyBadge.icon}`} />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">Trạng thái: <span className={verifyBadge.cls.split(' ')[1]}>{verifyBadge.label}</span></p>
                  {verifyStatus === 'approved' && (
                    <p className="text-xs text-seller-600 mt-0.5">Tài khoản của bạn đã được xác minh. Bạn có thể đăng tin tự do.</p>
                  )}
                  {verifyStatus === 'pending' && (
                    <p className="text-xs text-amber-700 mt-0.5">Hồ sơ đang được Admin xem xét. Vui lòng chờ 1-3 ngày làm việc.</p>
                  )}
                  {verifyStatus === 'rejected' && (
                    <p className="text-xs text-red-700 mt-0.5">Hồ sơ bị từ chối. Vui lòng gửi lại với tài liệu hợp lệ.</p>
                  )}
                  {!verifyStatus && (
                    <p className="text-xs text-gray-500 mt-0.5">Bạn chưa gửi hồ sơ xác minh nào.</p>
                  )}
                </div>
              </div>

              {verifyStatus !== 'approved' && (
                <form onSubmit={handleVerifySubmit} className="space-y-5 max-w-xl">
                  {/* Hồ sơ kinh doanh */}
                  <section className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-seller-100 flex items-center justify-center">
                        <i className="fa-solid fa-briefcase text-seller-600 text-xs" />
                      </div>
                      <h3 className="font-bold text-sm text-gray-800">Thông tin kinh doanh</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className={labelCls}>Vai trò chủ trọ *</label>
                        <select
                          required
                          className={inputCls}
                          value={verifySellerType}
                          onChange={e => setVerifySellerType(e.target.value)}
                        >
                          <option value="owner">Chủ sở hữu nhà trọ (Owner)</option>
                          <option value="manager">Quản lý nhà trọ (Manager)</option>
                          <option value="broker">Môi giới (Broker)</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Tên thương hiệu / Tên kinh doanh</label>
                        <input
                          type="text"
                          className={inputCls}
                          value={verifyBusinessName}
                          onChange={e => setVerifyBusinessName(e.target.value)}
                          placeholder="Ví dụ: Hệ thống phòng trọ Minh Anh"
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Địa chỉ liên hệ chính *</label>
                        <input
                          required
                          type="text"
                          className={inputCls}
                          value={verifyContactAddress}
                          onChange={e => setVerifyContactAddress(e.target.value)}
                          placeholder="Số nhà, tên đường, quận/huyện..."
                        />
                      </div>
                    </div>
                  </section>

                  {/* CCCD */}
                  <section className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-seller-100 flex items-center justify-center">
                        <i className="fa-solid fa-id-card text-seller-600 text-xs" />
                      </div>
                      <h3 className="font-bold text-sm text-gray-800">Căn cước công dân (CCCD)</h3>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Mặt trước CCCD *</label>
                        <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${cccdFrontUrl ? 'border-seller-400 bg-seller-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                          {cccdFrontLoading ? (
                            <div className="py-2"><i className="fa-solid fa-circle-notch fa-spin text-seller-600 text-lg mb-1 animate-spin" /><p className="text-xs text-gray-400">Đang tải lên...</p></div>
                          ) : cccdFrontUrl ? (
                            <div>
                              <i className="fa-solid fa-circle-check text-seller-500 text-lg mb-1" />
                              <p className="text-xs text-seller-700 font-semibold truncate">Đã tải ảnh lên</p>
                              <img src={cccdFrontUrl} alt="CCCD Front" className="mt-2 w-full h-24 object-cover rounded-lg border" />
                            </div>
                          ) : (
                            <>
                              <i className="fa-solid fa-upload text-gray-300 text-xl mb-1" />
                              <p className="text-xs text-gray-400">Tải lên ảnh</p>
                            </>
                          )}
                          <input
                            type="file" accept="image/*"
                            onChange={e => handleUploadFile(e.target.files[0], 'cccdFront')}
                            className="mt-2 w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white file:text-gray-600 file:border file:border-gray-200 cursor-pointer"
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>Mặt sau CCCD *</label>
                        <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${cccdBackUrl ? 'border-seller-400 bg-seller-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                          {cccdBackLoading ? (
                            <div className="py-2"><i className="fa-solid fa-circle-notch fa-spin text-seller-600 text-lg mb-1 animate-spin" /><p className="text-xs text-gray-400">Đang tải lên...</p></div>
                          ) : cccdBackUrl ? (
                            <div>
                              <i className="fa-solid fa-circle-check text-seller-500 text-lg mb-1" />
                              <p className="text-xs text-seller-700 font-semibold truncate">Đã tải ảnh lên</p>
                              <img src={cccdBackUrl} alt="CCCD Back" className="mt-2 w-full h-24 object-cover rounded-lg border" />
                            </div>
                          ) : (
                            <>
                              <i className="fa-solid fa-upload text-gray-300 text-xl mb-1" />
                              <p className="text-xs text-gray-400">Tải lên ảnh</p>
                            </>
                          )}
                          <input
                            type="file" accept="image/*"
                            onChange={e => handleUploadFile(e.target.files[0], 'cccdBack')}
                            className="mt-2 w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white file:text-gray-600 file:border file:border-gray-200 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Property docs */}
                  <section className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-seller-100 flex items-center justify-center">
                        <i className="fa-solid fa-file-lines text-seller-600 text-xs" />
                      </div>
                      <h3 className="font-bold text-sm text-gray-800">Giấy tờ nhà trọ <span className="font-normal text-gray-400">(tùy chọn)</span></h3>
                    </div>
                    <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${propertyDocUrl ? 'border-seller-400 bg-seller-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                      {propDocLoading ? (
                        <div className="py-2"><i className="fa-solid fa-circle-notch fa-spin text-seller-600 text-lg mb-1 animate-spin" /><p className="text-xs text-gray-400">Đang tải lên...</p></div>
                      ) : propertyDocUrl ? (
                        <div>
                          <i className="fa-solid fa-circle-check text-seller-500 text-lg mb-1" />
                          <p className="text-xs text-seller-700 font-semibold truncate">Đã tải tài liệu lên</p>
                          {propertyDocUrl.endsWith('.pdf') ? (
                            <div className="mt-2 p-3 bg-white border rounded-lg text-xs font-semibold text-gray-600 flex items-center justify-center gap-2">
                              <i className="fa-solid fa-file-pdf text-red-500 text-lg" />
                              <span>Tài liệu PDF</span>
                            </div>
                          ) : (
                            <img src={propertyDocUrl} alt="Property Doc" className="mt-2 max-w-xs mx-auto h-24 object-cover rounded-lg border" />
                          )}
                        </div>
                      ) : (
                        <>
                          <i className="fa-solid fa-file-pdf text-gray-300 text-2xl mb-1" />
                          <p className="text-xs text-gray-400">Giấy chứng nhận quyền sở hữu, hợp đồng thuê đất...</p>
                        </>
                      )}
                      <input
                        type="file" accept="image/*,.pdf"
                        onChange={e => handleUploadFile(e.target.files[0], 'propertyDoc')}
                        className="mt-2 w-full text-xs text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white file:text-gray-600 file:border file:border-gray-200 cursor-pointer"
                      />
                    </div>
                  </section>

                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2 text-xs text-blue-700">
                    <i className="fa-solid fa-circle-info mt-0.5" />
                    <span>Thông tin và tài liệu của bạn được mã hóa và bảo mật. Chỉ Admin Locafy mới có thể xem xét hồ sơ xác minh.</span>
                  </div>

                  <button
                    type="submit" disabled={verifySubmitting || cccdFrontLoading || cccdBackLoading || propDocLoading}
                    className="px-8 py-2.5 bg-seller-600 hover:bg-seller-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition shadow-sm cursor-pointer border-0"
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
              <h2 className="text-lg font-extrabold text-gray-900 mb-6">Cài đặt hồ sơ</h2>

              {/* Avatar summary */}
              <div className="bg-gradient-to-br from-seller-600 to-seller-800 rounded-2xl text-white shadow-premium-md p-6 flex flex-col sm:flex-row items-center gap-5 mb-8">
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-xl bg-white/10 backdrop-blur-md text-white flex items-center justify-center font-extrabold text-2xl shadow-md border border-white/20">
                    {(user?.name || user?.username || 'U').substring(0, 2).toUpperCase()}
                  </div>
                  <button className="absolute bottom-0 right-0 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow text-gray-500 hover:text-gray-700">
                    <i className="fa-solid fa-camera text-[10px]" />
                  </button>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-extrabold text-white text-lg">{user?.name || user?.username}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30">
                      <i className={`fa-solid ${verifyBadge.icon} mr-1`} />
                      {verifyBadge.label}
                    </span>
                  </div>
                  <p className="text-sm text-seller-100">Chủ nhà · Đối tác Locafy từ {new Date(user?.createdAt || Date.now()).getFullYear()}</p>
                </div>
              </div>

              <form onSubmit={handleProfileSave} className="max-w-xl space-y-5">
                {/* Personal info */}
                <section className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <i className="fa-solid fa-user text-seller-600" />
                    <h3 className="font-bold text-sm text-gray-800">Thông tin cá nhân</h3>
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
                <section className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <i className="fa-solid fa-bell text-seller-600" />
                    <h3 className="font-bold text-sm text-gray-800">Cài đặt thông báo</h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: 'Email thông báo', desc: 'Hóa đơn, cập nhật quan trọng', id: 'notify-email' },
                      { label: 'Tin nhắn khách thuê', desc: 'Nhận thông báo khi có tin nhắn mới', id: 'notify-chat' },
                    ].map(n => (
                      <div key={n.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-700">{n.label}</p>
                          <p className="text-xs text-gray-400">{n.desc}</p>
                        </div>
                        <label className="relative flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-seller-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5 peer-checked:after:border-white" />
                        </label>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Success/error message */}
                {profileMsg && (
                  <div className={`px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${profileMsg.type === 'success' ? 'bg-seller-50 text-seller-700 border border-seller-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    <i className={`fa-solid ${profileMsg.type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} />
                    {profileMsg.text}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="submit" disabled={profileSaving}
                    className="px-8 py-2.5 bg-seller-600 hover:bg-seller-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition shadow-sm"
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

      {/* ─── Property Modal ─── */}
      {propModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-205">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-extrabold text-gray-800 text-base">
                {editingProperty ? 'Chỉnh sửa nhà trọ' : 'Thêm nhà trọ mới'}
              </h3>
              <button
                onClick={() => setPropModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 transition bg-transparent border-0 cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg" />
              </button>
            </div>
            <form onSubmit={handlePropertySubmit} className="p-6 flex flex-col max-h-[85vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto mb-6 pr-1">
                {/* Cột trái: Thông tin địa lý & mô tả */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-seller-700 uppercase tracking-wider border-b border-gray-100 pb-2">Thông tin cơ bản & Vị trí</h4>
                  <div>
                    <label className={labelCls}>Tên nhà trọ / Tòa nhà *</label>
                    <input
                      required
                      type="text"
                      className={inputCls}
                      value={propName}
                      onChange={e => setPropName(e.target.value)}
                      placeholder="Ví dụ: Tòa nhà Minh Anh, Nhà trọ số 5"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Địa chỉ chi tiết (số nhà, ngõ, đường...) *</label>
                    <input
                      required
                      type="text"
                      className={inputCls}
                      value={propAddress}
                      onChange={e => setPropAddress(e.target.value)}
                      placeholder="Ví dụ: 123 Nguyễn Văn Cừ"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className={labelCls}>Phường/Xã</label>
                      <input
                        type="text"
                        className={inputCls}
                        value={propWard}
                        onChange={e => setPropWard(e.target.value)}
                        placeholder="Phường 2"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Quận/Huyện</label>
                      <input
                        type="text"
                        className={inputCls}
                        value={propDistrict}
                        onChange={e => setPropDistrict(e.target.value)}
                        placeholder="Quận 5"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Tỉnh/Thành</label>
                      <input
                        type="text"
                        className={inputCls}
                        value={propProvince}
                        onChange={e => setPropProvince(e.target.value)}
                        placeholder="TP.HCM"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Mô tả chung tòa nhà</label>
                    <textarea
                      rows={4}
                      className={inputCls + ' resize-none'}
                      value={propDesc}
                      onChange={e => setPropDesc(e.target.value)}
                      placeholder="Mô tả các đặc điểm chung (chỗ để xe rộng, giờ giấc tự do, camera an ninh...)"
                    />
                  </div>
                </div>

                {/* Cột phải: Hình ảnh & Tiện ích */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-seller-700 uppercase tracking-wider border-b border-gray-100 pb-2">Hình ảnh & Tiện ích chung</h4>
                  <div>
                    <label className={labelCls}>Hình ảnh nhà trọ / tòa nhà</label>
                    <input
                      type="file" accept="image/*" multiple
                      onChange={e => handlePropertyImagesUpload(e.target.files)}
                      className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-seller-50 file:text-seller-700 hover:file:bg-seller-100 transition cursor-pointer mb-3"
                    />
                    {propImageLoading && (
                      <div className="text-xs text-seller-600 font-semibold flex items-center gap-1.5 mb-3">
                        <i className="fa-solid fa-circle-notch fa-spin animate-spin" />
                        Đang tải ảnh lên...
                      </div>
                    )}
                    {propImageUrls && propImageUrls.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 mb-2 max-h-60 overflow-y-auto p-1 border border-gray-50 rounded-xl">
                        {propImageUrls.map((url, index) => (
                          <div key={index} className="relative border border-gray-200 rounded-xl overflow-hidden h-28 w-full group shadow-sm">
                            <img
                              src={url}
                              alt={`preview-${index}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setPropImageUrls(prev => prev.filter((_, i) => i !== index))}
                              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition border-0 cursor-pointer shadow"
                            >
                              <i className="fa-solid fa-xmark text-xs" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Tiện ích chung tòa nhà</label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {AMENITIES_LIST.map(item => {
                        const isChecked = propAmenities.includes(item);
                        return (
                          <label
                            key={item}
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer select-none text-[11px] font-semibold transition-all ${isChecked
                                ? 'border-seller-400 bg-seller-50/50 text-seller-800'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setPropAmenities(prev =>
                                  prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
                                );
                              }}
                              className="rounded text-seller-600 focus:ring-seller-500 border-gray-300"
                            />
                            {item}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-3 border-t border-gray-100 justify-end">
                <button
                  type="button"
                  onClick={() => setPropModalOpen(false)}
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer border-0 w-32"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={propSubmitting}
                  className="px-6 py-2.5 bg-seller-600 hover:bg-seller-700 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer border-0 w-32"
                >
                  {propSubmitting ? <><i className="fa-solid fa-circle-notch fa-spin mr-1 animate-spin" />Đang lưu...</> : 'Lưu thông tin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Room Modal ─── */}
      {roomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-205">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-extrabold text-gray-800 text-base">
                {editingRoom ? 'Chỉnh sửa thông tin phòng' : 'Thêm phòng mới'}
              </h3>
              <button
                onClick={() => setRoomModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 transition bg-transparent border-0 cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg" />
              </button>
            </div>
            <form onSubmit={handleRoomSubmit} className="p-6 flex flex-col max-h-[85vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto mb-6 pr-1">
                {/* Cột trái: Thông tin cơ bản & Chi phí */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-seller-700 uppercase tracking-wider border-b border-gray-100 pb-2">Thông tin cơ bản & Chi phí</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Tên phòng *</label>
                      <input
                        required
                        type="text"
                        className={inputCls}
                        value={roomName}
                        onChange={e => setRoomName(e.target.value)}
                        placeholder="Ví dụ: P.101, P.202"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Loại hình phòng *</label>
                      <select
                        className={inputCls}
                        value={roomTypeState}
                        onChange={e => setRoomTypeState(e.target.value)}
                      >
                        <option value="single">Phòng đơn / Khép kín</option>
                        <option value="shared">Phòng ở ghép</option>
                        <option value="mini_apartment">Căn hộ mini</option>
                        <option value="apartment">Căn hộ nguyên căn</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls}>Diện tích (m²) *</label>
                      <input
                        required
                        type="number"
                        className={inputCls}
                        value={roomArea}
                        onChange={e => setRoomArea(e.target.value)}
                        placeholder="25"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Số người tối đa *</label>
                      <input
                        required
                        type="number"
                        className={inputCls}
                        value={roomMaxOccupants}
                        onChange={e => setRoomMaxOccupants(e.target.value)}
                        placeholder="3"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Giá thuê (đ/tháng) *</label>
                      <input
                        required
                        type="number"
                        className={inputCls}
                        value={roomPrice}
                        onChange={e => setRoomPrice(e.target.value)}
                        placeholder="3500000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Tiền đặt cọc (đ)</label>
                      <input
                        type="number"
                        className={inputCls}
                        value={roomDeposit}
                        onChange={e => setRoomDeposit(e.target.value)}
                        placeholder="3500000"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Giá điện (đ/kWh)</label>
                      <input
                        type="number"
                        className={inputCls}
                        value={roomElectricity}
                        onChange={e => setRoomElectricity(e.target.value)}
                        placeholder="3500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className={labelCls}>Giá nước (đ/khối/người)</label>
                      <input
                        type="number"
                        className={inputCls}
                        value={roomWater}
                        onChange={e => setRoomWater(e.target.value)}
                        placeholder="20000"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Mạng/Internet (đ/th)</label>
                      <input
                        type="number"
                        className={inputCls}
                        value={roomInternet}
                        onChange={e => setRoomInternet(e.target.value)}
                        placeholder="100000"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Gửi xe (đ/tháng)</label>
                      <input
                        type="number"
                        className={inputCls}
                        value={roomParking}
                        onChange={e => setRoomParking(e.target.value)}
                        placeholder="100000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Nội quy phòng</label>
                    <textarea
                      rows={2}
                      className={inputCls + ' resize-none'}
                      value={roomRules}
                      onChange={e => setRoomRules(e.target.value)}
                      placeholder="Không nuôi thú cưng, đóng cửa trước 23h..."
                    />
                  </div>
                </div>

                {/* Cột phải: Hình ảnh & Tiện ích */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-seller-700 uppercase tracking-wider border-b border-gray-100 pb-2">Hình ảnh & Tiện ích trong phòng</h4>

                  <div>
                    <label className={labelCls}>Hình ảnh chi tiết phòng *</label>
                    <input
                      type="file" accept="image/*" multiple
                      onChange={e => handleRoomImagesUpload(e.target.files)}
                      className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-seller-50 file:text-seller-700 hover:file:bg-seller-100 transition cursor-pointer mb-3"
                    />
                    {roomImageLoading && (
                      <div className="text-xs text-seller-600 font-semibold flex items-center gap-1.5 mb-3 animate-pulse">
                        <i className="fa-solid fa-circle-notch fa-spin animate-spin" />
                        Đang tải ảnh lên...
                      </div>
                    )}
                    {roomImageUrls && roomImageUrls.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-3 max-h-48 overflow-y-auto p-1 border border-gray-50 rounded-xl">
                        {roomImageUrls.map((url, index) => (
                          <div key={index} className="relative border border-gray-200 rounded-xl overflow-hidden h-20 w-full group shadow-sm">
                            <img
                              src={url}
                              alt={`room-preview-${index}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setRoomImageUrls(prev => prev.filter((_, i) => i !== index))}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition border-0 cursor-pointer shadow"
                            >
                              <i className="fa-solid fa-xmark text-[10px]" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>Tiện ích tích hợp trong phòng</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {AMENITIES_LIST.map(item => {
                        const isChecked = roomAmenitiesState.includes(item);
                        return (
                          <label
                            key={item}
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer select-none text-[11px] font-semibold transition-all ${isChecked
                                ? 'border-seller-400 bg-seller-50/50 text-seller-800'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setRoomAmenitiesState(prev =>
                                  prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
                                );
                              }}
                              className="rounded text-seller-600 focus:ring-seller-500 border-gray-300"
                            />
                            {item}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100 justify-end">
                <button
                  type="button"
                  onClick={() => setRoomModalOpen(false)}
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer border-0 w-32"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={roomSubmitting}
                  className="px-6 py-2.5 bg-seller-600 hover:bg-seller-700 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer border-0 w-32"
                >
                  {roomSubmitting ? <><i className="fa-solid fa-circle-notch fa-spin mr-1 animate-spin" />Đang lưu...</> : 'Lưu thông tin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern Custom Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`flex items-center gap-3 px-4.5 py-3 rounded-xl shadow-lg border text-sm font-bold text-white ${toast.type === 'success' ? 'bg-emerald-600 border-emerald-500' :
              toast.type === 'error' ? 'bg-rose-600 border-rose-500' :
                'bg-blue-600 border-blue-500'
            }`}>
            <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check' :
                toast.type === 'error' ? 'fa-circle-xmark' :
                  'fa-circle-info'
              } text-base`} />
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 hover:opacity-80 transition bg-transparent border-0 text-white cursor-pointer flex items-center justify-center p-0.5"
            >
              <i className="fa-solid fa-xmark text-xs" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandlordDashboard;
