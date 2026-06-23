import React from 'react';
import { Link } from 'react-router-dom';

const ROOM_TYPE_LABELS = {
  single: 'Phòng đơn',
  shared: 'Ở ghép',
  mini_apartment: 'Căn hộ mini',
  apartment: 'Căn hộ',
};

const ListingCard = ({ listing }) => {
  const {
    _id,
    title,
    roomType,
    ward,
    district,
    price,
    area,
    imageUrls,
    status,
    isPinned,
    isBoosted,
  } = listing;

  // Format price helper (VND)
  const formatPrice = (p) => {
    if (!p && p !== 0) return 'Liên hệ';
    if (p >= 1000000) {
      return `${(p / 1000000).toFixed(1).replace('.0', '')} triệu/tháng`;
    }
    return `${p.toLocaleString('vi-VN')} VND/tháng`;
  };

  const coverImage =
    (imageUrls && imageUrls.length > 0 && imageUrls[0]) ||
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=500&q=80';

  const addressDisplay = [ward, district].filter(Boolean).join(', ');

  const roomTypeLabel = ROOM_TYPE_LABELS[roomType] || roomType || 'Phòng trọ';

  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg transition duration-200 flex flex-col h-full">
      <Link to={`/house-detail/${_id}`} className="relative h-48 block overflow-hidden">
        <img
          src={coverImage}
          alt={title}
          className="w-full h-full object-cover hover:scale-105 transition duration-300"
          onError={(e) => {
            e.target.src =
              'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=500&q=80';
          }}
        />

        {/* Top-left badges: pinned / boosted */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {isPinned && (
            <span className="bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-xs font-bold shadow">
              Ghim
            </span>
          )}
          {isBoosted && (
            <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs font-bold shadow">
              Đang đẩy tin
            </span>
          )}
        </div>

        {/* Top-right: rented status badge */}
        {status === 'rented' && (
          <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow">
            Đã Thuê
          </div>
        )}
      </Link>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-gray-900 line-clamp-1">
              <Link to={`/house-detail/${_id}`} className="hover:text-blue-600 transition">
                {title}
              </Link>
            </h3>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded shrink-0">
              {roomTypeLabel}
            </span>
          </div>

          {addressDisplay && (
            <p className="text-sm text-gray-500 mt-2 flex items-center">
              <i className="fa-solid fa-location-dot mr-2 text-gray-400 shrink-0"></i>
              <span className="line-clamp-1">{addressDisplay}</span>
            </p>
          )}

          {area && (
            <p className="text-sm text-gray-500 mt-1 flex items-center">
              <i className="fa-solid fa-vector-square mr-2 text-gray-400 shrink-0"></i>
              <span>{area} m²</span>
            </p>
          )}
        </div>

        <div className="mt-4">
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
            <span className="flex items-center">
              <i className="fa-solid fa-house-user mr-2 text-blue-500"></i>
              <span>Nhà trọ</span>
            </span>
            <span className="font-semibold text-red-500">{formatPrice(price)}</span>
          </div>

          <Link
            to={`/house-detail/${_id}`}
            className="mt-4 block text-center rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition"
          >
            Xem thông tin
          </Link>
        </div>
      </div>
    </article>
  );
};

export default ListingCard;
