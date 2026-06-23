import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LocafyApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const AMENITIES_TO_COMPARE = [
  { key: 'ac', label: 'Điều hòa', icon: 'fa-wind' },
  { key: 'wifi', label: 'Wi-Fi', icon: 'fa-wifi' },
  { key: 'water_heater', label: 'Nước nóng', icon: 'fa-fire' },
  { key: 'fridge', label: 'Tủ lạnh', icon: 'fa-snowflake' },
  { key: 'washing_machine', label: 'Máy giặt', icon: 'fa-jug-detergent' },
  { key: 'parking', label: 'Chỗ để xe', icon: 'fa-square-parking' },
  { key: 'security', label: 'An ninh 24/7', icon: 'fa-shield-halved' },
  { key: 'kitchen', label: 'Bếp nấu', icon: 'fa-utensils' },
  { key: 'balcony', label: 'Ban công', icon: 'fa-door-open' },
  { key: 'elevator', label: 'Thang máy', icon: 'fa-elevator' },
];

const ROOM_TYPE_LABELS = {
  single: 'Phòng đơn',
  shared: 'Ở ghép',
  mini_apartment: 'Chung cư mini',
  apartment: 'Căn hộ nguyên căn',
};

function formatPrice(p) {
  if (p == null) return 'Liên hệ';
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(1).replace('.0', '')} triệu/tháng`;
  return `${p.toLocaleString('vi-VN')} đ/tháng`;
}

function formatDeposit(p) {
  if (p == null) return 'Không có';
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(1).replace('.0', '')} triệu`;
  return `${p.toLocaleString('vi-VN')} đ`;
}

function formatRate(rate, unit) {
  if (rate == null) return 'Chưa rõ';
  return `${rate.toLocaleString('vi-VN')} đ/${unit}`;
}

const ComparePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ids, setIds] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadIds = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('locafy_compare') || '[]');
      setIds(stored);
    } catch (_) {
      setIds([]);
    }
  };

  useEffect(() => {
    loadIds();
    window.addEventListener('storage', loadIds);
    return () => window.removeEventListener('storage', loadIds);
  }, []);

  useEffect(() => {
    if (ids.length === 0) {
      setListings([]);
      setLoading(false);
      return;
    }

    const fetchListings = async () => {
      setLoading(true);
      try {
        const promises = ids.map(async (id) => {
          try {
            const data = await LocafyApi.getListing(id);
            return data;
          } catch (err) {
            console.error(`Failed to fetch listing ${id}:`, err);
            return null;
          }
        });
        const results = await Promise.all(promises);
        setListings(results.filter(Boolean));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, [ids]);

  const handleRemove = (id) => {
    const updated = ids.filter((x) => x !== id);
    localStorage.setItem('locafy_compare', JSON.stringify(updated));
    setIds(updated);
    window.dispatchEvent(new Event('storage'));
  };

  const handleClearAll = () => {
    localStorage.removeItem('locafy_compare');
    setIds([]);
    setListings([]);
    window.dispatchEvent(new Event('storage'));
  };

  const handleChatSeller = async (sellerId, listingId) => {
    if (!user) {
      alert('Vui lòng đăng nhập để nhắn tin.');
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    try {
      const conv = await LocafyApi.getOrCreateConversation({
        sellerId,
        listingId,
      });
      navigate(`/user?tab=chats&conversationId=${conv._id || conv.conversationId}`);
    } catch (err) {
      console.error('Chat error:', err);
      navigate('/user?tab=chats');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-[3px] border-blue-100 border-t-blue-600 animate-spin" />
          <p className="text-xs text-gray-400 font-bold">Đang tải dữ liệu so sánh...</p>
        </div>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-scale-balanced text-2xl" />
          </div>
          <h2 className="text-lg font-black text-gray-900 mb-2">So sánh phòng trọ trống</h2>
          <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed mb-6">
            Bạn chưa chọn phòng nào để so sánh. Hãy quay lại danh sách phòng trọ và chọn "Thêm vào so sánh".
          </p>
          <Link
            to="/phong-tro"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-100"
          >
            <i className="fa-solid fa-compass" />
            Khám phá phòng trọ
          </Link>
        </div>
      </div>
    );
  }

  const columnsCount = listings.length;
  // Dynamic CSS grid columns based on listings count
  const gridStyle = {
    gridTemplateColumns: `200px repeat(${columnsCount}, minmax(240px, 1fr))`,
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <Link
              to="/phong-tro"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline mb-2"
            >
              <i className="fa-solid fa-arrow-left" />
              Quay lại tìm kiếm
            </Link>
            <h1 className="text-2xl font-black text-gray-900">So sánh tin đăng</h1>
            <p className="text-xs text-gray-400 mt-0.5">So sánh chi tiết tối đa 3 phòng trọ cùng lúc</p>
          </div>
          <button
            onClick={handleClearAll}
            className="sm:self-end inline-flex items-center gap-1.5 px-4 py-2 border border-red-100 hover:bg-red-50 text-red-600 text-xs font-bold rounded-xl transition"
          >
            <i className="fa-solid fa-trash-can" />
            Xóa tất cả
          </button>
        </div>

        {/* Comparison Table Wrapper */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              
              {/* Row: Headers */}
              <div className="grid border-b border-gray-100 bg-slate-50/50" style={gridStyle}>
                <div className="p-6 flex items-center font-black text-xs text-slate-400 uppercase tracking-wider">
                  Thông tin phòng
                </div>
                {listings.map((l) => (
                  <div key={l._id} className="p-6 border-l border-gray-100 relative group">
                    <button
                      onClick={() => handleRemove(l._id)}
                      className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 shadow-sm border border-gray-100 flex items-center justify-center transition"
                      title="Xóa khỏi so sánh"
                    >
                      <i className="fa-solid fa-xmark text-xs" />
                    </button>
                    <img
                      src={l.imageUrls?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=300&q=80'}
                      alt={l.title}
                      className="w-full h-36 rounded-2xl object-cover mb-4 shadow-sm"
                    />
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      {ROOM_TYPE_LABELS[l.roomType] || 'Phòng trọ'}
                    </span>
                    <h3 className="font-extrabold text-gray-800 text-sm mt-2 line-clamp-2 min-h-[40px] leading-snug">
                      {l.title}
                    </h3>
                  </div>
                ))}
              </div>

              {/* Row: Price */}
              <div className="grid border-b border-gray-100 items-center hover:bg-slate-50/30" style={gridStyle}>
                <div className="p-4 px-6 text-xs font-bold text-gray-500">Giá thuê</div>
                {listings.map((l) => (
                  <div key={l._id} className="p-4 px-6 border-l border-gray-100 font-black text-red-500 text-sm">
                    {formatPrice(l.price)}
                  </div>
                ))}
              </div>

              {/* Row: Deposit */}
              <div className="grid border-b border-gray-100 items-center hover:bg-slate-50/30" style={gridStyle}>
                <div className="p-4 px-6 text-xs font-bold text-gray-500">Tiền đặt cọc</div>
                {listings.map((l) => (
                  <div key={l._id} className="p-4 px-6 border-l border-gray-100 text-xs font-bold text-gray-700">
                    {formatDeposit(l.deposit)}
                  </div>
                ))}
              </div>

              {/* Row: Area */}
              <div className="grid border-b border-gray-100 items-center hover:bg-slate-50/30" style={gridStyle}>
                <div className="p-4 px-6 text-xs font-bold text-gray-500">Diện tích</div>
                {listings.map((l) => (
                  <div key={l._id} className="p-4 px-6 border-l border-gray-100 text-xs font-bold text-gray-700">
                    {l.area} m²
                  </div>
                ))}
              </div>

              {/* Row: Location */}
              <div className="grid border-b border-gray-100 items-center hover:bg-slate-50/30" style={gridStyle}>
                <div className="p-4 px-6 text-xs font-bold text-gray-500">Khu vực</div>
                {listings.map((l) => (
                  <div key={l._id} className="p-4 px-6 border-l border-gray-100 text-xs text-gray-600 leading-relaxed">
                    <span className="font-bold text-gray-700 block mb-0.5">{l.district}, {l.province}</span>
                    <span className="text-[11px] text-gray-400">{l.addressLine}</span>
                  </div>
                ))}
              </div>

              {/* Row: Electricity */}
              <div className="grid border-b border-gray-100 items-center hover:bg-slate-50/30" style={gridStyle}>
                <div className="p-4 px-6 text-xs font-bold text-gray-500">Giá điện</div>
                {listings.map((l) => (
                  <div key={l._id} className="p-4 px-6 border-l border-gray-100 text-xs text-gray-700">
                    {formatRate(l.room?.electricityRate, 'kWh')}
                  </div>
                ))}
              </div>

              {/* Row: Water */}
              <div className="grid border-b border-gray-100 items-center hover:bg-slate-50/30" style={gridStyle}>
                <div className="p-4 px-6 text-xs font-bold text-gray-500">Giá nước</div>
                {listings.map((l) => (
                  <div key={l._id} className="p-4 px-6 border-l border-gray-100 text-xs text-gray-700">
                    {formatRate(l.room?.waterRate, 'khối/người')}
                  </div>
                ))}
              </div>

              {/* Row: Internet */}
              <div className="grid border-b border-gray-100 items-center hover:bg-slate-50/30" style={gridStyle}>
                <div className="p-4 px-6 text-xs font-bold text-gray-500">Phí Internet</div>
                {listings.map((l) => (
                  <div key={l._id} className="p-4 px-6 border-l border-gray-100 text-xs text-gray-700">
                    {l.room?.internetFee != null ? `${l.room.internetFee.toLocaleString('vi-VN')} đ/tháng` : 'Không có / Miễn phí'}
                  </div>
                ))}
              </div>

              {/* Row: Parking */}
              <div className="grid border-b border-gray-100 items-center hover:bg-slate-50/30" style={gridStyle}>
                <div className="p-4 px-6 text-xs font-bold text-gray-500">Phí gửi xe</div>
                {listings.map((l) => (
                  <div key={l._id} className="p-4 px-6 border-l border-gray-100 text-xs text-gray-700">
                    {l.room?.parkingFee != null ? `${l.room.parkingFee.toLocaleString('vi-VN')} đ/tháng` : 'Không có / Miễn phí'}
                  </div>
                ))}
              </div>

              {/* Row: Max Occupants */}
              <div className="grid border-b border-gray-100 items-center hover:bg-slate-50/30" style={gridStyle}>
                <div className="p-4 px-6 text-xs font-bold text-gray-500">Số người ở tối đa</div>
                {listings.map((l) => (
                  <div key={l._id} className="p-4 px-6 border-l border-gray-100 text-xs text-gray-700 font-bold">
                    {l.room?.maxOccupants || l.maxOccupants || 1} người
                  </div>
                ))}
              </div>

              {/* Row: Rules */}
              <div className="grid border-b border-gray-100 items-start hover:bg-slate-50/30" style={gridStyle}>
                <div className="p-4 px-6 text-xs font-bold text-gray-500 mt-2">Nội quy quy định</div>
                {listings.map((l) => (
                  <div key={l._id} className="p-4 px-6 border-l border-gray-100 text-xs text-gray-500 leading-relaxed italic max-h-40 overflow-y-auto">
                    {l.room?.rules || l.description || 'Không có yêu cầu đặc biệt.'}
                  </div>
                ))}
              </div>

              {/* Section Header: Amenities */}
              <div className="grid border-b border-gray-100 bg-slate-50/50" style={gridStyle}>
                <div className="p-4 px-6 text-xs font-black text-slate-500 uppercase tracking-wide">
                  Tiện ích nổi bật
                </div>
                {listings.map((l) => (
                  <div key={l._id} className="p-4 px-6 border-l border-gray-100" />
                ))}
              </div>

              {/* Rows: Individual Amenities */}
              {AMENITIES_TO_COMPARE.map((amenity) => (
                <div key={amenity.key} className="grid border-b border-gray-100 items-center hover:bg-slate-50/30" style={gridStyle}>
                  <div className="p-4 px-6 text-xs font-semibold text-gray-600 flex items-center gap-2">
                    <i className={`fa-solid ${amenity.icon} text-[10px] w-4 text-center text-slate-400`} />
                    {amenity.label}
                  </div>
                  {listings.map((l) => {
                    const hasAmenity = (l.amenities || []).includes(amenity.key) || (l.room?.amenities || []).includes(amenity.key);
                    return (
                      <div key={l._id} className="p-4 px-6 border-l border-gray-100 text-center flex justify-start">
                        {hasAmenity ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                            <i className="fa-solid fa-circle-check text-[9px]" /> Có
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            <i className="fa-solid fa-circle-minus text-[9px]" /> Không
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Row: Actions */}
              <div className="grid bg-slate-50/20" style={gridStyle}>
                <div className="p-6 px-6" />
                {listings.map((l) => (
                  <div key={l._id} className="p-6 border-l border-gray-100 flex flex-col gap-2">
                    <Link
                      to={`/house-detail/${l._id}`}
                      className="w-full text-center py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-100"
                    >
                      Xem chi tiết
                    </Link>
                    <button
                      onClick={() => handleChatSeller(l.seller?._id, l._id)}
                      className="w-full py-2.5 bg-white hover:bg-slate-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl transition"
                    >
                      Nhắn tin chủ trọ
                    </button>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ComparePage;
