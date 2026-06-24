import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { LocafyApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// Amenity display map
const AMENITY_LABELS = {
  ac: { label: 'Điều hòa', icon: 'fa-solid fa-wind' },
  wifi: { label: 'Wi-Fi', icon: 'fa-solid fa-wifi' },
  water_heater: { label: 'Nước nóng', icon: 'fa-solid fa-fire' },
  fridge: { label: 'Tủ lạnh', icon: 'fa-solid fa-snowflake' },
  washing_machine: { label: 'Máy giặt', icon: 'fa-solid fa-jug-detergent' },
  parking: { label: 'Chỗ để xe', icon: 'fa-solid fa-square-parking' },
  security: { label: 'An ninh 24/7', icon: 'fa-solid fa-shield-halved' },
  camera: { label: 'Camera', icon: 'fa-solid fa-video' },
  kitchen: { label: 'Bếp nấu', icon: 'fa-solid fa-utensils' },
  balcony: { label: 'Ban công', icon: 'fa-solid fa-door-open' },
  elevator: { label: 'Thang máy', icon: 'fa-solid fa-elevator' },
  gym: { label: 'Phòng gym', icon: 'fa-solid fa-dumbbell' },
  pool: { label: 'Hồ bơi', icon: 'fa-solid fa-person-swimming' },
  tv: { label: 'TV', icon: 'fa-solid fa-tv' },
  bed: { label: 'Giường', icon: 'fa-solid fa-bed' },
  wardrobe: { label: 'Tủ quần áo', icon: 'fa-solid fa-box-archive' },
};

const ROOM_TYPE_LABELS = {
  room: 'Phòng trọ',
  mini_apartment: 'Căn hộ mini',
  apartment: 'Căn hộ',
  shared_room: 'Ở ghép',
  house: 'Nhà nguyên căn',
};

function formatPrice(p) {
  if (p == null) return 'Liên hệ';
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(1).replace('.0', '')} triệu/tháng`;
  return `${p.toLocaleString('vi-VN')} đ/tháng`;
}

function formatDeposit(p) {
  if (p == null) return 'Liên hệ';
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(1).replace('.0', '')} triệu`;
  return `${p.toLocaleString('vi-VN')} đ`;
}

function maskPhone(phone) {
  if (!phone) return '***** (Đăng nhập để xem)';
  if (phone.length >= 7) {
    return phone.slice(0, 2) + '*'.repeat(phone.length - 4) + phone.slice(-3);
  }
  return '***';
}

function buildAddress(listing) {
  const parts = [listing.addressLine, listing.ward, listing.district, listing.province].filter(Boolean);
  return parts.join(', ') || listing.addressLine || 'Chưa cung cấp';
}

// ─────────────────────────────────────────────────────────────────────────────
// Lightbox component
const Lightbox = ({ images, index, onClose, onPrev, onNext }) => {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl z-10 transition"
      >
        <i className="fa-solid fa-xmark"></i>
      </button>
      <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
        {index + 1} / {images.length}
      </span>
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/20 p-3 text-white transition"
        >
          <i className="fa-solid fa-chevron-left"></i>
        </button>
      )}
      <img
        src={images[index]}
        alt={`Ảnh ${index + 1}`}
        className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl"
        onClick={(e) => e.stopPropagation()}
      />
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/20 p-3 text-white transition"
        >
          <i className="fa-solid fa-chevron-right"></i>
        </button>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Modal wrapper
const Modal = ({ open, onClose, children }) => {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const Detail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedListings, setRelatedListings] = useState([]);

  // Gallery
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Favorite
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  // Modals
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Booking form
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [bookingDate, setBookingDate] = useState(tomorrowStr);
  const [bookingTime, setBookingTime] = useState('14:00');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Report form
  const [reportReason, setReportReason] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Phone reveal
  const [phoneRevealed, setPhoneRevealed] = useState(false);

  // Geocode status
  const [mapStatusText, setMapStatusText] = useState('');

  // Compare State
  const [isCompared, setIsCompared] = useState(false);

  // Initialize compared state
  useEffect(() => {
    try {
      const compared = JSON.parse(localStorage.getItem('locafy_compare') || '[]');
      setIsCompared(compared.includes(id));
    } catch (_) { }
  }, [id]);

  const handleToggleCompare = () => {
    try {
      let compared = JSON.parse(localStorage.getItem('locafy_compare') || '[]');
      if (compared.includes(id)) {
        compared = compared.filter(x => x !== id);
        setIsCompared(false);
      } else {
        if (compared.length >= 3) {
          alert('Bạn chỉ có thể so sánh tối đa 3 phòng trọ cùng lúc.');
          return;
        }
        compared.push(id);
        setIsCompared(true);
      }
      localStorage.setItem('locafy_compare', JSON.stringify(compared));
      window.dispatchEvent(new Event('storage'));
    } catch (_) { }
  };

  // ── Fetch listing ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchListing = async () => {
      setLoading(true);
      try {
        const { data } = await LocafyApi.getListing(id);
        setListing(data);
        setMapStatusText(`Vị trí: ${buildAddress(data)}`);

        if (user && user.role === 'user') {
          LocafyApi.recordListingView(id).catch(console.error);
        }

        // Check favorite state from API if logged in
        if (user) {
          try {
            const favs = await LocafyApi.getFavorites();
            setIsFavorite((favs.listings || favs || []).some((f) => (f._id || f) === data._id));
          } catch (_) { /* ignore */ }
        }

        // Fetch related listings (same district / roomType)
        try {
          const related = await LocafyApi.getListings({
            district: data.district,
            roomType: data.roomType,
            limit: 4,
            exclude: data._id,
          });
          setRelatedListings((related.data || related.listings || []).filter((r) => r._id !== data._id).slice(0, 4));
        } catch (_) { /* ignore */ }
      } catch (err) {
        console.error('Error fetching listing:', err);
        setError('Không tìm thấy phòng trọ hoặc xảy ra lỗi khi tải trang.');
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [id, user]);

  // ── Gallery helpers ────────────────────────────────────────────────────────
  const images = listing?.imageUrls?.length ? listing.imageUrls : [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80'
  ];

  const prevImage = useCallback(() => {
    setCurrentImageIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const nextImage = useCallback(() => {
    setCurrentImageIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  // ── Map helpers ────────────────────────────────────────────────────────────
  const getMapQuery = () => {
    if (listing?.location?.coordinates) {
      const [lng, lat] = listing.location.coordinates;
      return `${lat},${lng}`;
    }
    return buildAddress(listing);
  };

  const mapEmbedUrl = listing
    ? `https://maps.google.com/maps?q=${encodeURIComponent(getMapQuery())}&hl=vi&z=17&ie=UTF8&iwloc=near&output=embed`
    : '';

  const mapsUrl = listing?.location?.coordinates
    ? (() => {
      const [lng, lat] = listing.location.coordinates;
      return `https://www.google.com/maps/place/${encodeURIComponent(buildAddress(listing))}/@${lat},${lng},17z`;
    })()
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(buildAddress(listing ?? {}))}`;

  // ── Toggle Favorite ────────────────────────────────────────────────────────
  const handleToggleFavorite = async () => {
    if (!user) { setAuthModalOpen(true); return; }
    setFavLoading(true);
    try {
      const res = await LocafyApi.toggleFavorite(listing._id);
      setIsFavorite(res.isFavorite ?? !isFavorite);
    } catch (err) {
      console.error('Toggle favorite error:', err);
    } finally {
      setFavLoading(false);
    }
  };

  // ── Handle Booking submit ──────────────────────────────────────────────────
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!user) { setBookingModalOpen(false); setAuthModalOpen(true); return; }
    setBookingLoading(true);
    try {
      await LocafyApi.createAppointment({
        listingId: listing._id,
        date: bookingDate,
        time: bookingTime,
        notes: bookingNotes,
      });
      setBookingSuccess(true);
    } catch (err) {
      console.error('Booking error:', err);
      alert(err.data?.error || 'Đặt lịch thất bại. Vui lòng thử lại.');
    } finally {
      setBookingLoading(false);
    }
  };

  // ── Handle Chat ────────────────────────────────────────────────────────────
  const handleChatSeller = async () => {
    if (!user) { setAuthModalOpen(true); return; }
    try {
      const conv = await LocafyApi.getOrCreateConversation({
        sellerId: listing.seller._id,
        listingId: listing._id,
      });
      navigate(`/user?tab=chats&conversationId=${conv.data?._id || ''}`);
    } catch (err) {
      console.error('Chat error:', err);
      navigate('/user?tab=chats');
    }
  };

  // ── Handle Report submit ───────────────────────────────────────────────────
  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!user) { setReportModalOpen(false); setAuthModalOpen(true); return; }
    setReportLoading(true);
    try {
      await LocafyApi.createReport({
        entityType: 'listing',
        entityId: listing._id,
        reason: reportReason,
        description: reportDesc,
      });
      setReportSuccess(true);
    } catch (err) {
      console.error('Report error:', err);
      alert(err.data?.error || 'Báo cáo thất bại. Vui lòng thử lại.');
    } finally {
      setReportLoading(false);
    }
  };

  // ── Copy phone ────────────────────────────────────────────────────────────
  const handleCopyPhone = () => {
    const phone = listing?.seller?.phone || '';
    navigator.clipboard.writeText(phone).then(() => alert(`Đã sao chép số: ${phone}`)).catch(() => { });
  };

  // ── Loading / Error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
          <p className="text-sm text-stone-500">Đang tải thông tin phòng trọ...</p>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{error || 'Không tìm thấy phòng trọ'}</h2>
        <p className="text-gray-500 mb-6">Phòng trọ có thể đã bị xóa hoặc không tồn tại.</p>
        <Link to="/" className="inline-flex items-center gap-2 text-blue-600 hover:underline font-semibold">
          <i className="fa-solid fa-arrow-left"></i> Về trang chủ
        </Link>
      </div>
    );
  }

  const isOwner = user && (user.role === 'seller' || user.role === 'admin') && user._id === listing.seller?._id;
  const fullAddress = buildAddress(listing);
  const sellerPhone = listing.seller?.phone || '';
  const displayPhone = (user && phoneRevealed) ? sellerPhone : maskPhone(sellerPhone);

  return (
    <>
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
          >
            <i className="fa-solid fa-arrow-left"></i>
            Quay lại danh sách
          </Link>
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <i className="fa-solid fa-eye"></i>
            <span>{listing.viewCount || 0} lượt xem</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
          {/* ── LEFT COLUMN ──────────────────────────────────────────────── */}
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Gallery */}
            <div className="relative bg-slate-900">
              <img
                id="detail-image"
                className="w-full h-80 object-cover cursor-pointer"
                src={images[currentImageIndex]}
                alt={listing.title}
                onClick={() => setLightboxOpen(true)}
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80';
                }}
              />
              {/* Image count badge */}
              {images.length > 1 && (
                <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <i className="fa-regular fa-image text-[10px]"></i>
                  {currentImageIndex + 1}/{images.length}
                </div>
              )}
              {/* Expand button */}
              <button
                onClick={() => setLightboxOpen(true)}
                className="absolute bottom-3 left-3 bg-black/50 hover:bg-black/70 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 transition"
              >
                <i className="fa-solid fa-expand text-[10px]"></i> Xem ảnh
              </button>
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition"
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition"
                  >
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </>
              )}
              {/* Thumbnail strip */}
              {images.length > 1 && (
                <div className="absolute bottom-0 left-0 right-0 flex gap-1 p-2 overflow-x-auto bg-gradient-to-t from-black/40 to-transparent">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImageIndex(i)}
                      className={`shrink-0 w-14 h-10 rounded-lg overflow-hidden border-2 transition ${i === currentImageIndex ? 'border-white' : 'border-transparent opacity-70 hover:opacity-100'}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                {listing.isPinned && (
                  <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                    <i className="fa-solid fa-thumbtack mr-1"></i>Ghim
                  </span>
                )}
                {listing.isBoosted && (
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                    <i className="fa-solid fa-bolt mr-1"></i>Nổi bật
                  </span>
                )}
              </div>
            </div>

            <div className="p-6">
              {/* Title row */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p id="detail-type" className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                    {ROOM_TYPE_LABELS[listing.roomType] || 'Nhà trọ'}
                  </p>
                  <h1 id="detail-name" className="mt-2 text-2xl md:text-3xl font-bold text-gray-900 leading-snug">
                    {listing.title}
                  </h1>
                </div>
                {isOwner && (
                  <div className="flex gap-2 shrink-0">
                    <Link
                      to={`/manage/edit/${listing._id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition"
                    >
                      <i className="fa-solid fa-pen-to-square"></i> Sửa
                    </Link>
                  </div>
                )}
              </div>

              {/* Address */}
              <p id="detail-address" className="mt-3 flex items-start text-sm text-gray-500">
                <i className="fa-solid fa-location-dot mr-2 mt-0.5 text-blue-500 shrink-0"></i>
                {fullAddress}
              </p>

              {/* Stats row */}
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-stone-500">
                <span className="flex items-center gap-1">
                  <i className="fa-solid fa-calendar text-stone-400"></i>
                  Đăng {listing.createdAt ? new Date(listing.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                </span>
                {listing.availableFrom && (
                  <span className="flex items-center gap-1">
                    <i className="fa-solid fa-calendar-check text-green-400"></i>
                    Còn trống từ {new Date(listing.availableFrom).toLocaleDateString('vi-VN')}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <i className="fa-solid fa-heart text-rose-400"></i>
                  {listing.saveCount || 0} lượt lưu
                </span>
                <span className="flex items-center gap-1">
                  <i className="fa-solid fa-calendar-days text-blue-400"></i>
                  {listing.appointmentCount || 0} lịch hẹn
                </span>
              </div>

              {/* Description */}
              <div className="mt-5 border-t border-gray-100 pt-5">
                <h3 className="font-bold text-gray-900 text-lg mb-2">Mô tả phòng trọ</h3>
                <p id="detail-description" className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {listing.description || 'Chủ phòng trọ chưa bổ sung mô tả chi tiết.'}
                </p>
              </div>

              {/* Quick info cards */}
              <div className="mt-5 grid sm:grid-cols-2 gap-3">
                <div className="rounded-2xl bg-gray-50 p-3 border border-gray-100">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Loại phòng</p>
                  <p id="detail-room-count" className="mt-2 text-base font-bold text-gray-900">
                    {ROOM_TYPE_LABELS[listing.roomType] || 'Phòng trọ'}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-3 border border-gray-100">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Mức giá</p>
                  <p id="detail-price" className="mt-2 text-base font-bold text-red-500">{formatPrice(listing.price)}</p>
                </div>
                {listing.area && (
                  <div className="rounded-2xl bg-gray-50 p-3 border border-gray-100">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Diện tích</p>
                    <p className="mt-2 text-base font-bold text-gray-900">{listing.area} m²</p>
                  </div>
                )}
                {listing.deposit != null && (
                  <div className="rounded-2xl bg-gray-50 p-3 border border-gray-100">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Tiền cọc</p>
                    <p className="mt-2 text-base font-bold text-amber-600">{formatDeposit(listing.deposit)}</p>
                  </div>
                )}
              </div>

              {/* Room pricing details */}
              {listing.room && (
                <div className="mt-5 border-t border-gray-100 pt-5">
                  <h3 className="font-bold text-gray-900 text-lg mb-3">Chi phí hàng tháng</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {listing.room.electricityRate != null && (
                      <li className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <i className="fa-solid fa-bolt text-yellow-500 w-4 text-center"></i>
                          Tiền điện
                        </span>
                        <span className="font-semibold text-gray-900">{listing.room.electricityRate.toLocaleString('vi-VN')} đ/kWh</span>
                      </li>
                    )}
                    {listing.room.waterRate != null && (
                      <li className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <i className="fa-solid fa-droplet text-blue-400 w-4 text-center"></i>
                          Tiền nước
                        </span>
                        <span className="font-semibold text-gray-900">{listing.room.waterRate.toLocaleString('vi-VN')} đ/m³</span>
                      </li>
                    )}
                    {listing.room.internetFee != null && (
                      <li className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <i className="fa-solid fa-wifi text-green-500 w-4 text-center"></i>
                          Phí internet
                        </span>
                        <span className="font-semibold text-gray-900">{listing.room.internetFee.toLocaleString('vi-VN')} đ/tháng</span>
                      </li>
                    )}
                    {listing.room.parkingFee != null && (
                      <li className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <i className="fa-solid fa-square-parking text-stone-400 w-4 text-center"></i>
                          Phí gửi xe
                        </span>
                        <span className="font-semibold text-gray-900">{listing.room.parkingFee.toLocaleString('vi-VN')} đ/tháng</span>
                      </li>
                    )}
                    {listing.room.maxOccupants != null && (
                      <li className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <i className="fa-solid fa-users text-purple-400 w-4 text-center"></i>
                          Số người tối đa
                        </span>
                        <span className="font-semibold text-gray-900">{listing.room.maxOccupants} người</span>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Video */}
              {listing.videoUrl && (
                <div className="mt-5 border-t border-gray-100 pt-5">
                  <h3 className="font-bold text-gray-900 text-lg mb-3">Video phòng trọ</h3>
                  <div className="aspect-video rounded-2xl overflow-hidden bg-slate-900">
                    <video
                      src={listing.videoUrl}
                      controls
                      className="w-full h-full object-contain"
                      preload="metadata"
                    />
                  </div>
                </div>
              )}

              {/* Map section */}
              <section className="mt-6 rounded-3xl border border-gray-100 bg-white p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Bản đồ</p>
                    <h2 className="mt-1 text-lg font-bold text-gray-900">Vị trí trên bản đồ</h2>
                  </div>
                  <a
                    id="map-link"
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
                    Xem trên Google Maps
                  </a>
                </div>

                {user ? (
                  <div
                    id="map-container"
                    className="h-72 overflow-hidden rounded-2xl border border-gray-100 bg-slate-100"
                  >
                    <iframe
                      src={mapEmbedUrl}
                      title={listing.title}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="h-full w-full border-0"
                    />
                  </div>
                ) : (
                  <div
                    className="h-48 rounded-2xl border border-gray-100 bg-slate-50 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-100 transition"
                    onClick={() => setAuthModalOpen(true)}
                  >
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                      <i className="fa-solid fa-map-location-dot text-blue-600 text-xl"></i>
                    </div>
                    <p className="text-sm font-semibold text-gray-700">Xem địa chỉ và bản đồ sau khi đăng nhập</p>
                    <p className="text-xs text-gray-400">{fullAddress}</p>
                    <button
                      onClick={() => setAuthModalOpen(true)}
                      className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-full hover:bg-blue-700 transition"
                    >
                      Đăng nhập để xem bản đồ
                    </button>
                  </div>
                )}

                <p id="map-status" className="mt-2 text-xs text-gray-400">{mapStatusText}</p>
              </section>
            </div>
          </section>

          {/* ── RIGHT SIDEBAR ─────────────────────────────────────────── */}
          <aside className="space-y-4">
            {/* Quick Info */}
            <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Thông tin nhanh</p>
              <h2 className="mt-2 text-xl font-bold text-gray-900">Bảng thông tin</h2>
              <ul id="detail-info-list" className="mt-4 space-y-2.5 text-sm text-gray-600">
                <li className="flex items-start">
                  <i className="fa-solid fa-circle-check text-green-500 mt-1 mr-2.5 shrink-0"></i>
                  <span>
                    <strong className="text-gray-900">Loại hình:</strong>{' '}
                    {ROOM_TYPE_LABELS[listing.roomType] || 'Nhà trọ'}
                  </span>
                </li>
                <li className="flex items-start">
                  <i className="fa-solid fa-circle-check text-green-500 mt-1 mr-2.5 shrink-0"></i>
                  <span>
                    <strong className="text-gray-900">Vị trí:</strong> {listing.district}, {listing.province}
                  </span>
                </li>
                {listing.area && (
                  <li className="flex items-start">
                    <i className="fa-solid fa-circle-check text-green-500 mt-1 mr-2.5 shrink-0"></i>
                    <span>
                      <strong className="text-gray-900">Diện tích:</strong> {listing.area} m²
                    </span>
                  </li>
                )}
                {listing.deposit != null && (
                  <li className="flex items-start">
                    <i className="fa-solid fa-circle-check text-green-500 mt-1 mr-2.5 shrink-0"></i>
                    <span>
                      <strong className="text-gray-900">Tiền cọc:</strong> {formatDeposit(listing.deposit)}
                    </span>
                  </li>
                )}
                <li className="flex items-start">
                  {!user ? (
                    <button
                      onClick={() => setAuthModalOpen(true)}
                      className="flex items-start w-full text-left cursor-pointer"
                    >
                      <i className="fa-solid fa-circle-check text-green-500 mt-1 mr-2.5 shrink-0"></i>
                      <span className="text-blue-600 font-semibold hover:underline">
                        <strong className="text-gray-900 font-medium">Liên hệ:</strong>{' '}
                        {maskPhone(sellerPhone)} (Đăng nhập để xem)
                      </span>
                    </button>
                  ) : (
                    <>
                      <i className="fa-solid fa-circle-check text-green-500 mt-1 mr-2.5 shrink-0"></i>
                      <span>
                        <strong className="text-gray-900">Liên hệ:</strong>{' '}
                        {phoneRevealed ? sellerPhone : maskPhone(sellerPhone)}{' '}
                        {!phoneRevealed && sellerPhone && (
                          <button
                            onClick={() => setPhoneRevealed(true)}
                            className="text-blue-600 text-xs font-semibold hover:underline ml-1"
                          >
                            Hiển thị
                          </button>
                        )}
                      </span>
                    </>
                  )}
                </li>
              </ul>
            </section>

            {/* Amenities */}
            {listing.amenities?.length > 0 && (
              <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Tiện ích</p>
                <div id="detail-amenities" className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                  {listing.amenities.map((key, idx) => {
                    const info = AMENITY_LABELS[key] || { label: key, icon: 'fa-solid fa-check' };
                    return (
                      <span key={idx} className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-700 flex items-center gap-1.5">
                        <i className={`${info.icon} text-[10px]`}></i>
                        {info.label}
                      </span>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Seller card */}
            {listing.seller && (
              <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Chủ trọ</p>
                <div className="mt-4 flex items-center gap-3">
                  {listing.seller.avatarUrl ? (
                    <img
                      src={listing.seller.avatarUrl}
                      alt={listing.seller.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-blue-100 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {(listing.seller.name || 'C').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
                      {listing.seller.name}
                      {listing.seller.verificationStatus === 'approved' && (
                        <i className="fa-solid fa-circle-check text-blue-500 text-xs" title="Đã xác minh"></i>
                      )}
                    </h4>
                    <p className="text-xs text-gray-500">Người đăng tin xác thực</p>
                  </div>
                </div>
                {user && sellerPhone && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Số điện thoại</p>
                      <p className="text-base font-bold text-gray-900 mt-0.5">
                        {phoneRevealed ? sellerPhone : maskPhone(sellerPhone)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!phoneRevealed && (
                        <button
                          onClick={() => setPhoneRevealed(true)}
                          className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition text-xs font-semibold"
                          title="Hiện số"
                        >
                          <i className="fa-solid fa-eye"></i>
                        </button>
                      )}
                      {phoneRevealed && (
                        <button
                          onClick={handleCopyPhone}
                          className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition"
                          title="Sao chép số điện thoại"
                        >
                          <i className="fa-regular fa-copy"></i>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* CTA Actions */}
            <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Tương tác</p>
                <h2 className="mt-2 text-xl font-bold text-gray-900">Liên hệ & Đặt lịch</h2>
                <p className="mt-1 text-xs text-stone-500 leading-relaxed">
                  Hãy kết nối trực tiếp với chủ trọ hoặc đặt lịch xem phòng để trao đổi thêm.
                </p>
              </div>

              {/* Book appointment */}
              <button
                onClick={() => user ? setBookingModalOpen(true) : setAuthModalOpen(true)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 shadow-md shadow-blue-100 active:scale-[0.98]"
              >
                <i className="fa-solid fa-calendar-days"></i>
                Đặt lịch xem phòng
              </button>

              {/* Chat */}
              <button
                onClick={handleChatSeller}
                className="w-full py-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <i className="fa-solid fa-comment-dots"></i>
                Nhắn tin chủ nhà
              </button>

              {/* Zalo + Call */}
              {user && sellerPhone && phoneRevealed && (
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={`https://zalo.me/${sellerPhone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-[#0068ff] hover:bg-[#005ad9] text-white text-xs font-bold rounded-xl transition"
                  >
                    <i className="fa-solid fa-comment-sms"></i> Zalo
                  </a>
                  <a
                    href={`tel:${sellerPhone.replace(/\D/g, '')}`}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition"
                  >
                    <i className="fa-solid fa-phone"></i> Gọi điện
                  </a>
                </div>
              )}

              {(!user || !phoneRevealed) && (
                <div className="flex gap-3">
                  <button
                    onClick={() => user ? setPhoneRevealed(true) : setAuthModalOpen(true)}
                    className="flex-1 py-2.5 text-center text-xs font-bold bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition flex items-center justify-center gap-1.5"
                  >
                    <i className="fa-solid fa-phone"></i>
                    {user ? 'Hiện số điện thoại' : 'Gọi điện'}
                  </button>

                  <button
                    onClick={handleToggleFavorite}
                    disabled={favLoading}
                    className="flex-1 py-2.5 text-center text-xs font-bold bg-rose-50 text-rose-700 rounded-xl hover:bg-rose-100 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <i className={isFavorite ? 'fa-solid fa-heart text-rose-500' : 'fa-regular fa-heart'}></i>
                    {isFavorite ? 'Đã lưu' : 'Lưu tin'}
                  </button>
                </div>
              )}

              {user && phoneRevealed && (
                <button
                  onClick={handleToggleFavorite}
                  disabled={favLoading}
                  className="w-full py-2.5 text-center text-xs font-bold bg-rose-50 text-rose-700 rounded-xl hover:bg-rose-100 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <i className={isFavorite ? 'fa-solid fa-heart text-rose-500' : 'fa-regular fa-heart'}></i>
                  {isFavorite ? 'Đã lưu vào yêu thích' : 'Lưu tin vào yêu thích'}
                </button>
              )}

              {/* Compare */}
              <button
                onClick={handleToggleCompare}
                className={`w-full py-2.5 text-center text-xs font-bold rounded-xl border transition flex items-center justify-center gap-1.5 active:scale-[0.98] ${isCompared
                    ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold'
                    : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-600'
                  }`}
              >
                <i className={`fa-solid fa-scale-balanced ${isCompared ? 'text-blue-500' : 'text-stone-400'}`}></i>
                {isCompared ? 'Đã thêm vào so sánh' : 'Thêm vào so sánh'}
              </button>

              {/* Report */}
              <button
                onClick={() => user ? setReportModalOpen(true) : setAuthModalOpen(true)}
                className="w-full py-2 text-center text-xs font-semibold text-gray-400 hover:text-red-500 transition flex items-center justify-center gap-1.5"
              >
                <i className="fa-regular fa-flag"></i>
                Báo cáo tin đăng
              </button>
            </section>
          </aside>
        </div>

        {/* ── RELATED LISTINGS ─────────────────────────────────────────────── */}
        {relatedListings.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">Tin liên quan</h2>
              <Link to="/phong-tro" className="text-sm font-semibold text-blue-600 hover:underline">
                Xem thêm →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedListings.map((r) => (
                <Link
                  key={r._id}
                  to={`/house-detail/${r._id}`}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition group"
                >
                  <div className="h-40 bg-slate-100 overflow-hidden">
                    <img
                      src={r.imageUrls?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80'}
                      alt={r.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80'; }}
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                      {ROOM_TYPE_LABELS[r.roomType] || 'Nhà trọ'}
                    </p>
                    <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">{r.title}</h3>
                    <p className="mt-1 text-xs text-gray-500 flex items-center gap-1 line-clamp-1">
                      <i className="fa-solid fa-location-dot text-blue-400 shrink-0"></i>
                      {r.district}, {r.province}
                    </p>
                    <p className="mt-2 text-sm font-bold text-red-500">{formatPrice(r.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* LIGHTBOX */}
      {lightboxOpen && (
        <Lightbox
          images={images}
          index={currentImageIndex}
          onClose={() => setLightboxOpen(false)}
          onPrev={prevImage}
          onNext={nextImage}
        />
      )}

      {/* BOOKING MODAL */}
      <Modal open={bookingModalOpen} onClose={() => { setBookingModalOpen(false); setBookingSuccess(false); }}>
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full mx-4 shadow-2xl relative">
          <button
            onClick={() => { setBookingModalOpen(false); setBookingSuccess(false); }}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>

          {!bookingSuccess ? (
            <>
              <div className="text-center mb-6">
                <div className="bg-blue-50 text-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <i className="fa-solid fa-calendar-days text-lg"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Đặt Lịch Xem Phòng</h3>
                <p className="text-sm text-gray-500 mt-1">Vui lòng chọn thời gian thích hợp để đến xem phòng.</p>
              </div>

              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2" htmlFor="booking-date">
                    Ngày xem phòng
                  </label>
                  <div className="relative">
                    <i className="fa-regular fa-calendar absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input
                      type="date"
                      id="booking-date"
                      required
                      min={tomorrowStr}
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2" htmlFor="booking-time">
                    Giờ xem phòng
                  </label>
                  <div className="relative">
                    <i className="fa-regular fa-clock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input
                      type="time"
                      id="booking-time"
                      required
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2" htmlFor="booking-notes">
                    Ghi chú thêm
                  </label>
                  <textarea
                    id="booking-notes"
                    rows={3}
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="Ví dụ: Tôi muốn xem phòng vào buổi chiều, liên hệ tôi trước khi đến..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setBookingModalOpen(false)}
                    className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition text-sm"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={bookingLoading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-100 transition text-sm disabled:opacity-50"
                  >
                    {bookingLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <i className="fa-solid fa-spinner fa-spin"></i> Đang gửi...
                      </span>
                    ) : 'Xác nhận đặt'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="bg-green-50 text-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-circle-check text-3xl"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Đặt lịch thành công!</h3>
              <p className="text-sm text-gray-500 mb-6">
                Yêu cầu xem phòng <strong>{bookingDate}</strong> lúc <strong>{bookingTime}</strong> đã được gửi.
                Chủ nhà sẽ liên hệ xác nhận sớm.
              </p>
              <button
                onClick={() => { setBookingModalOpen(false); setBookingSuccess(false); }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* CONTACT / CHAT MODAL */}
      <Modal open={contactModalOpen} onClose={() => setContactModalOpen(false)}>
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full mx-4 shadow-2xl relative">
          <button
            onClick={() => setContactModalOpen(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>

          <div className="text-center mb-6">
            <div className="bg-green-50 text-green-600 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <i className="fa-solid fa-comment-dots text-lg"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-900">Liên Hệ Chủ Nhà</h3>
            <p className="text-sm text-gray-500 mt-1">Kết nối trực tiếp với chủ nhà để trao đổi thêm.</p>
          </div>

          {listing.seller && (
            <div className="bg-slate-50 rounded-2xl p-4 mb-5 border border-slate-100">
              <div className="flex items-center gap-3">
                {listing.seller.avatarUrl ? (
                  <img src={listing.seller.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                    {(listing.seller.name || 'C').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
                    {listing.seller.name}
                    {listing.seller.verificationStatus === 'approved' && (
                      <i className="fa-solid fa-circle-check text-blue-500 text-xs"></i>
                    )}
                  </h4>
                  <p className="text-xs text-gray-500">Người đăng tin xác thực</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200/60 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Số điện thoại</p>
                  <p className="text-base font-bold text-gray-900 mt-0.5">
                    {sellerPhone || 'Chưa cung cấp'}
                  </p>
                </div>
                {sellerPhone && (
                  <button
                    onClick={handleCopyPhone}
                    className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition"
                    title="Sao chép số điện thoại"
                  >
                    <i className="fa-regular fa-copy"></i>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {sellerPhone && (
              <>
                <a
                  href={`https://zalo.me/${sellerPhone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-[#0068ff] hover:bg-[#005ad9] text-white font-semibold rounded-xl transition text-sm"
                >
                  <i className="fa-solid fa-comment-sms"></i>
                  Nhắn tin Zalo
                </a>
                <a
                  href={`tel:${sellerPhone.replace(/\D/g, '')}`}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition text-sm"
                >
                  <i className="fa-solid fa-phone"></i>
                  Gọi điện trực tiếp
                </a>
              </>
            )}
            <button
              onClick={() => setContactModalOpen(false)}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition text-sm"
            >
              Đóng
            </button>
          </div>
        </div>
      </Modal>

      {/* AUTH REQUIRED MODAL */}
      <Modal open={authModalOpen} onClose={() => setAuthModalOpen(false)}>
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full mx-4 shadow-2xl relative">
          <button
            onClick={() => setAuthModalOpen(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>

          <div className="text-center mb-6">
            <div className="bg-blue-50 text-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <i className="fa-solid fa-lock text-lg"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-900">Yêu cầu Đăng nhập</h3>
            <p className="text-sm text-gray-500 mt-2">
              Vui lòng đăng nhập hoặc tạo tài khoản để có thể xem thông tin liên hệ của chủ nhà trọ.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              to={`/login?redirect=${encodeURIComponent(`/detail/${id}`)}`}
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition"
            >
              Đăng nhập
            </Link>
            <Link
              to={`/register?redirect=${encodeURIComponent(`/detail/${id}`)}`}
              className="block w-full text-center bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 font-semibold py-3 px-4 rounded-xl transition"
            >
              Đăng ký tài khoản
            </Link>
          </div>
        </div>
      </Modal>

      {/* REPORT MODAL */}
      <Modal open={reportModalOpen} onClose={() => { setReportModalOpen(false); setReportSuccess(false); }}>
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full mx-4 shadow-2xl relative">
          <button
            onClick={() => { setReportModalOpen(false); setReportSuccess(false); }}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>

          {!reportSuccess ? (
            <>
              <div className="text-center mb-6">
                <div className="bg-red-50 text-red-600 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <i className="fa-regular fa-flag text-lg"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Báo cáo tin đăng</h3>
                <p className="text-sm text-gray-500 mt-1">Giúp chúng tôi giữ nền tảng sạch và đáng tin cậy.</p>
              </div>

              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Lý do báo cáo
                  </label>
                  <select
                    required
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  >
                    <option value="">-- Chọn lý do --</option>
                    <option value="spam">Spam / Tin rác</option>
                    <option value="fake">Thông tin sai lệch / Lừa đảo</option>
                    <option value="price">Giá không đúng thực tế</option>
                    <option value="photo">Hình ảnh không đúng thực tế</option>
                    <option value="unavailable">Phòng đã cho thuê nhưng vẫn đăng</option>
                    <option value="other">Lý do khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Mô tả chi tiết (tùy chọn)
                  </label>
                  <textarea
                    rows={3}
                    value={reportDesc}
                    onChange={(e) => setReportDesc(e.target.value)}
                    placeholder="Mô tả thêm vấn đề bạn phát hiện..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition text-sm"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={reportLoading}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition text-sm disabled:opacity-50"
                  >
                    {reportLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <i className="fa-solid fa-spinner fa-spin"></i> Đang gửi...
                      </span>
                    ) : 'Gửi báo cáo'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="bg-green-50 text-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-circle-check text-3xl"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Đã gửi báo cáo!</h3>
              <p className="text-sm text-gray-500 mb-6">
                Cảm ơn bạn đã giúp Locafy trở nên đáng tin cậy hơn. Chúng tôi sẽ xem xét báo cáo của bạn.
              </p>
              <button
                onClick={() => { setReportModalOpen(false); setReportSuccess(false); }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default Detail;
