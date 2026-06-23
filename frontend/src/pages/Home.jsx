import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LocafyApi } from '../services/api';
import ListingCard from '../components/ListingCard';

// ─── Skeleton Card ──────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
    <div className="h-48 bg-gray-200" />
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="h-5 bg-gray-200 rounded w-3/5" />
        <div className="h-5 bg-gray-200 rounded w-1/5" />
      </div>
      <div className="h-4 bg-gray-200 rounded w-4/5" />
      <div className="h-4 bg-gray-200 rounded w-2/5" />
      <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
        <div className="h-4 bg-gray-200 rounded w-1/4" />
        <div className="h-4 bg-gray-200 rounded w-1/4" />
      </div>
      <div className="h-10 bg-gray-200 rounded-xl mt-1" />
    </div>
  </div>
);

// ─── roomType label map ──────────────────────────────────────────────────────
const ROOM_TYPE_LABELS = {
  single: 'Phòng đơn',
  shared: 'Phòng ở ghép',
  mini_apartment: 'Căn hộ mini',
  apartment: 'Căn hộ',
};

const getRoomTypeLabel = (type) => ROOM_TYPE_LABELS[type] || type || 'Phòng trọ';

// ─── Price helpers ───────────────────────────────────────────────────────────
const getPriceMillions = (price) => {
  if (!price && price !== 0) return 0;
  // price stored in VND (e.g. 3_200_000) or already as millions (3.2)
  const n = Number(price);
  return n >= 1000 ? n / 1_000_000 : n;
};

const matchesPrice = (priceVal, priceMil) => {
  if (priceVal === 'all') return true;
  if (priceVal === 'under-2') return priceMil < 2;
  if (priceVal === '2-4') return priceMil >= 2 && priceMil <= 4;
  if (priceVal === '4-7') return priceMil > 4 && priceMil <= 7;
  if (priceVal === 'over-7') return priceMil > 7;
  return true;
};

// ─── Feature items ───────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: 'fa-solid fa-bolt',
    color: 'text-yellow-500',
    bg: 'bg-yellow-50',
    title: 'Cập nhật liên tục',
    desc: 'Tin đăng mới được cập nhật hàng ngày, đảm bảo thông tin luôn mới nhất và chính xác nhất.',
  },
  {
    icon: 'fa-solid fa-shield-halved',
    color: 'text-green-600',
    bg: 'bg-green-50',
    title: 'Thông tin tin cậy',
    desc: 'Mọi tin đăng đều được kiểm duyệt kỹ trước khi hiển thị, tránh tin giả và lừa đảo.',
  },
  {
    icon: 'fa-solid fa-magnifying-glass-location',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    title: 'Tìm kiếm dễ dàng',
    desc: 'Bộ lọc thông minh giúp bạn tìm được phòng phù hợp theo giá, vị trí và loại phòng.',
  },
  {
    icon: 'fa-solid fa-headset',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    title: 'Hỗ trợ 24/7',
    desc: 'Đội ngũ hỗ trợ luôn sẵn sàng giải đáp thắc mắc và hỗ trợ bạn trong quá trình thuê phòng.',
  },
];

// ─── Stats ───────────────────────────────────────────────────────────────────
const STATS = [
  { value: '500+', label: 'Tin đăng hoạt động', icon: 'fa-solid fa-house-chimney' },
  { value: '2,000+', label: 'Người thuê hài lòng', icon: 'fa-solid fa-users' },
  { value: '50+', label: 'Chủ nhà đã đăng ký', icon: 'fa-solid fa-building-user' },
  { value: '4.9★', label: 'Đánh giá trung bình', icon: 'fa-solid fa-star' },
];

// ─── Home Component ──────────────────────────────────────────────────────────
const Home = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const data = await LocafyApi.getListings({ status: 'approved' });
        // Accept both array response and { listings: [...] } shape
        const arr = Array.isArray(data) ? data : (data?.listings ?? []);
        const approved = arr.filter((item) => item.status === 'approved');
        setListings(approved);
      } catch (err) {
        console.error('Home: failed to load listings', err);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, []);

  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      const term = searchTerm.toLowerCase().trim();
      const location = [item.ward, item.district, item.province, item.addressLine]
        .filter(Boolean)
        .join(', ')
        .toLowerCase();
      const matchSearch =
        !term ||
        (item.title || '').toLowerCase().includes(term) ||
        location.includes(term) ||
        (item.description || '').toLowerCase().includes(term);

      const priceMil = getPriceMillions(item.price);
      const matchPrice = matchesPrice(priceFilter, priceMil);

      return matchSearch && matchPrice;
    });
  }, [listings, searchTerm, priceFilter]);

  const displayListings = filteredListings.slice(0, 6);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (priceFilter !== 'all') params.set('price', priceFilter);
    navigate('/phong-tro?' + params.toString());
  };

  return (
    <div className="bg-gray-50 text-gray-800">

      {/* ── Hero Section ── */}
      <section className="bg-gradient-to-r from-blue-700 to-indigo-800 py-8 sm:py-10 md:py-20 px-2.5 sm:px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="text-[1.55rem] sm:text-[2rem] md:text-5xl font-extrabold text-white mb-4 leading-[1.1] max-w-full mx-auto px-1">
            Tìm Phòng Trọ Hoàn Hảo Cùng{' '}
            <span className="text-yellow-400">Locafy</span>
          </h1>
          <p className="text-blue-100 text-sm sm:text-base md:text-lg mb-6 sm:mb-8 max-w-full sm:max-w-2xl mx-auto leading-relaxed px-1">
            Kênh thông tin phòng trọ, nhà thuê nguyên căn, căn hộ dịch vụ uy tín và cập nhật liên tục mỗi ngày.
          </p>

          {/* Search box */}
          <form
            onSubmit={handleSearch}
            className="bg-white p-3 sm:p-4 md:p-6 rounded-2xl shadow-2xl text-left"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="min-w-0">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Tìm kiếm
                </label>
                <div className="relative">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Nhập từ khóa để tìm nhà..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Khoảng giá
                </label>
                <div className="relative">
                  <i className="fa-solid fa-tags absolute left-3 top-3.5 text-gray-400" />
                  <select
                    value={priceFilter}
                    onChange={(e) => setPriceFilter(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  >
                    <option value="all">Tất cả mức giá</option>
                    <option value="under-2">Dưới 2 triệu</option>
                    <option value="2-4">2 triệu - 4 triệu</option>
                    <option value="4-7">4 triệu - 7 triệu</option>
                    <option value="over-7">Trên 7 triệu</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition duration-200 shadow-md"
              >
                <i className="fa-solid fa-magnifying-glass" />
                Tìm kiếm
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ── Listings Section ── */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 mb-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
              Khu vực nổi bật
            </p>
            <h2 className="text-2xl font-bold text-gray-900 mt-2">
              Hòa Lạc, Thạch Thất, Hà Nội
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {loading
                ? 'Đang tải danh sách...'
                : `Hiển thị ${displayListings.length} kết quả • Danh sách nhà trọ, căn hộ và chung cư mini gần khu vực`}
            </p>
          </div>
          <Link
            to="/phong-tro"
            className="inline-flex items-center justify-center rounded-full border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition self-start md:self-auto"
          >
            Xem tất cả phòng
            <i className="fa-solid fa-arrow-right-long ml-2" />
          </Link>
        </div>

        {/* Empty state */}
        {!loading && filteredListings.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-8 sm:px-6 sm:py-10 text-center text-gray-600">
            <i className="fa-solid fa-magnifying-glass text-2xl text-blue-500 mb-3 block" />
            <p className="text-lg font-semibold text-gray-900">Không tìm thấy kết quả phù hợp</p>
            <p className="mt-1 text-sm text-gray-500">
              Hãy thử từ khóa khác hoặc đổi khoảng giá để tìm phòng phù hợp hơn.
            </p>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : displayListings.map((listing) => (
                <ListingCard key={listing._id} listing={listing} />
              ))}
        </div>

        {/* View-all CTA */}
        {!loading && filteredListings.length > 6 && (
          <div className="text-center mt-8">
            <Link
              to="/phong-tro"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl text-sm transition duration-200 shadow-md"
            >
              <i className="fa-solid fa-list" />
              Xem tất cả {filteredListings.length} tin đăng
            </Link>
          </div>
        )}
      </section>

      {/* ── Features Section ── */}
      <section className="bg-white py-12 sm:py-16 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 mb-2">
              Tại sao chọn Locafy
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              Nền tảng tìm trọ tin cậy hàng đầu
            </h2>
            <p className="text-gray-500 mt-3 max-w-2xl mx-auto text-sm sm:text-base">
              Locafy giúp kết nối người thuê và chủ nhà một cách nhanh chóng, minh bạch và an toàn.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4`}
                >
                  <i className={`${f.icon} ${f.color} text-xl`} />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Section ── */}
      <section className="bg-gradient-to-r from-blue-700 to-indigo-800 py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            {STATS.map((s) => (
              <div key={s.label} className="text-white">
                <div className="flex justify-center mb-2">
                  <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center">
                    <i className={`${s.icon} text-xl text-white`} />
                  </div>
                </div>
                <p className="text-3xl sm:text-4xl font-extrabold text-white">{s.value}</p>
                <p className="text-blue-100 text-sm mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="bg-white py-12 sm:py-16 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 text-center">
          <div className="bg-blue-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <i className="fa-solid fa-circle-plus text-blue-600 text-2xl" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3">
            Bạn có phòng muốn cho thuê?
          </h2>
          <p className="text-gray-500 text-sm sm:text-base mb-8 max-w-xl mx-auto leading-relaxed">
            Đăng tin miễn phí trên Locafy và tiếp cận hàng nghìn người thuê đang tìm kiếm phòng trọ phù hợp mỗi ngày.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl text-sm transition duration-200 shadow-md"
            >
              <i className="fa-solid fa-circle-plus" />
              Đăng Tin Miễn Phí
            </Link>
            <Link
              to="/phong-tro"
              className="inline-flex items-center justify-center gap-2 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-8 py-3 rounded-xl text-sm transition duration-200"
            >
              <i className="fa-solid fa-magnifying-glass" />
              Tìm Phòng Ngay
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
