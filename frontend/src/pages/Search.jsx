import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LocafyApi } from '../services/api';
import ListingCard from '../components/ListingCard';

// ─── Constants ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 9;

const ROOM_TYPE_OPTIONS = [
  { value: 'all', label: 'Tất cả loại hình' },
  { value: 'single', label: 'Phòng đơn' },
  { value: 'shared', label: 'Phòng ở ghép' },
  { value: 'mini_apartment', label: 'Căn hộ mini' },
  { value: 'apartment', label: 'Căn hộ' },
];

const PRICE_OPTIONS = [
  { value: 'all', label: 'Tất cả mức giá' },
  { value: 'under-2', label: 'Dưới 2 triệu' },
  { value: '2-4', label: '2 triệu - 4 triệu' },
  { value: '4-7', label: '4 triệu - 7 triệu' },
  { value: 'over-7', label: 'Trên 7 triệu' },
];

const AREA_OPTIONS = [
  { value: 'all', label: 'Tất cả diện tích' },
  { value: 'under-20', label: 'Dưới 20 m²' },
  { value: '20-35', label: '20 - 35 m²' },
  { value: '35-50', label: '35 - 50 m²' },
  { value: 'over-50', label: 'Trên 50 m²' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price-asc', label: 'Giá tăng dần' },
  { value: 'price-desc', label: 'Giá giảm dần' },
  { value: 'area-asc', label: 'Diện tích tăng dần' },
  { value: 'area-desc', label: 'Diện tích giảm dần' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getPriceMillions = (price) => {
  if (!price && price !== 0) return 0;
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

const matchesArea = (areaVal, area) => {
  const a = Number(area) || 0;
  if (areaVal === 'all') return true;
  if (areaVal === 'under-20') return a > 0 && a < 20;
  if (areaVal === '20-35') return a >= 20 && a <= 35;
  if (areaVal === '35-50') return a > 35 && a <= 50;
  if (areaVal === 'over-50') return a > 50;
  return true;
};

const getLocationString = (item) =>
  [item.ward, item.district, item.province, item.addressLine]
    .filter(Boolean)
    .join(', ');

const sortListings = (arr, sort) => {
  const copy = [...arr];
  if (sort === 'price-asc') return copy.sort((a, b) => getPriceMillions(a.price) - getPriceMillions(b.price));
  if (sort === 'price-desc') return copy.sort((a, b) => getPriceMillions(b.price) - getPriceMillions(a.price));
  if (sort === 'area-asc') return copy.sort((a, b) => (Number(a.area) || 0) - (Number(b.area) || 0));
  if (sort === 'area-desc') return copy.sort((a, b) => (Number(b.area) || 0) - (Number(a.area) || 0));
  // newest (default) — sort by createdAt desc
  return copy.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// ─── Skeleton Card ────────────────────────────────────────────────────────────
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

// ─── List-view row ────────────────────────────────────────────────────────────
const ListingRow = ({ listing }) => {
  const priceMil = getPriceMillions(listing.price);
  const location = getLocationString(listing);
  const image = listing.imageUrls?.[0] || null;
  const ROOM_TYPE_LABELS = {
    single: 'Phòng đơn',
    shared: 'Phòng ở ghép',
    mini_apartment: 'Căn hộ mini',
    apartment: 'Căn hộ',
  };
  const roomTypeLabel = ROOM_TYPE_LABELS[listing.roomType] || listing.roomType || 'Phòng trọ';
  const formatPrice = (mil) =>
    mil >= 1 ? `${mil.toFixed(1).replace('.0', '')} triệu` : `${(mil * 1000).toFixed(0)}K`;

  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition duration-200 flex flex-col sm:flex-row gap-0">
      <Link
        to={`/house-detail/${listing._id}`}
        className="relative w-full sm:w-44 h-40 sm:h-auto shrink-0 block overflow-hidden"
      >
        <img
          src={
            image ||
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=500&q=80'
          }
          alt={listing.title}
          className="w-full h-full object-cover hover:scale-105 transition duration-300"
          onError={(e) => {
            e.target.src =
              'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=500&q=80';
          }}
        />
        <div className="absolute top-2 left-2 bg-white/85 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-bold text-gray-700">
          5.0 ★
        </div>
      </Link>
      <div className="p-4 flex flex-col justify-between flex-1 min-w-0">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold text-gray-900 leading-snug line-clamp-2">
              <Link to={`/house-detail/${listing._id}`} className="hover:text-blue-600 transition">
                {listing.title}
              </Link>
            </h3>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded shrink-0">
              {roomTypeLabel}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1.5 flex items-center gap-1.5">
            <i className="fa-solid fa-location-dot text-gray-400 shrink-0" />
            <span className="line-clamp-1">{location || 'Hòa Lạc, Hà Nội'}</span>
          </p>
          {listing.area && (
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
              <i className="fa-solid fa-vector-square text-gray-400 shrink-0" />
              {listing.area} m²
            </p>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <i className="fa-solid fa-house-user text-blue-500" />
            Nhà trọ
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-red-500 text-base">
              {formatPrice(priceMil)}/tháng
            </span>
            <Link
              to={`/house-detail/${listing._id}`}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition"
            >
              Xem
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
};

// ─── Pagination ───────────────────────────────────────────────────────────────
const Pagination = ({ currentPage, totalPages, onChange }) => {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visible = pages.filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1
  );

  const renderPage = (p, prev) => {
    const gap = prev !== undefined && p - prev > 1;
    return (
      <React.Fragment key={p}>
        {gap && (
          <span className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm select-none">
            …
          </span>
        )}
        <button
          onClick={() => onChange(p)}
          className={`w-9 h-9 rounded-xl text-sm font-semibold transition ${
            p === currentPage
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-blue-50 hover:text-blue-600'
          }`}
        >
          {p}
        </button>
      </React.Fragment>
    );
  };

  return (
    <div className="flex items-center justify-center gap-1.5 mt-10">
      <button
        onClick={() => onChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="w-9 h-9 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center text-sm"
        aria-label="Trang trước"
      >
        <i className="fa-solid fa-chevron-left" />
      </button>

      {visible.map((p, idx) => renderPage(p, visible[idx - 1]))}

      <button
        onClick={() => onChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="w-9 h-9 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center text-sm"
        aria-label="Trang sau"
      >
        <i className="fa-solid fa-chevron-right" />
      </button>
    </div>
  );
};

// ─── Search Component ─────────────────────────────────────────────────────────
const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [showFilters, setShowFilters] = useState(false);

  // Controlled filter state synced to URL
  const [searchTerm, setSearchTermLocal] = useState(searchParams.get('q') || '');
  const [priceFilter, setPriceFilterLocal] = useState(searchParams.get('price') || 'all');
  const [roomTypeFilter, setRoomTypeFilterLocal] = useState(searchParams.get('type') || 'all');
  const [districtFilter, setDistrictFilterLocal] = useState(searchParams.get('district') || '');
  const [areaFilter, setAreaFilterLocal] = useState(searchParams.get('area') || 'all');
  const [sortBy, setSortByLocal] = useState(searchParams.get('sort') || 'newest');
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);

  // Fetch all approved listings once
  useEffect(() => {
    const fetchListings = async () => {
      try {
        const data = await LocafyApi.getListings({ status: 'approved' });
        const arr = Array.isArray(data) ? data : (data?.listings ?? []);
        setListings(arr.filter((item) => item.status === 'approved'));
      } catch (err) {
        console.error('Search: failed to load listings', err);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, []);

  // Sync URL -> state on back/forward navigation
  useEffect(() => {
    setSearchTermLocal(searchParams.get('q') || '');
    setPriceFilterLocal(searchParams.get('price') || 'all');
    setRoomTypeFilterLocal(searchParams.get('type') || 'all');
    setDistrictFilterLocal(searchParams.get('district') || '');
    setAreaFilterLocal(searchParams.get('area') || 'all');
    setSortByLocal(searchParams.get('sort') || 'newest');
    setCurrentPage(Number(searchParams.get('page')) || 1);
  }, [searchParams]);

  // Persist filter changes to URL
  const applyFilters = useCallback(
    (overrides = {}) => {
      const params = {};
      const q = overrides.searchTerm !== undefined ? overrides.searchTerm : searchTerm;
      const price = overrides.priceFilter !== undefined ? overrides.priceFilter : priceFilter;
      const type = overrides.roomTypeFilter !== undefined ? overrides.roomTypeFilter : roomTypeFilter;
      const district = overrides.districtFilter !== undefined ? overrides.districtFilter : districtFilter;
      const area = overrides.areaFilter !== undefined ? overrides.areaFilter : areaFilter;
      const sort = overrides.sortBy !== undefined ? overrides.sortBy : sortBy;

      if (q) params.q = q;
      if (price !== 'all') params.price = price;
      if (type !== 'all') params.type = type;
      if (district) params.district = district;
      if (area !== 'all') params.area = area;
      if (sort !== 'newest') params.sort = sort;
      // Reset to page 1 on filter change unless explicitly passed
      if (overrides.page) params.page = String(overrides.page);

      setSearchParams(params, { replace: true });
    },
    [searchTerm, priceFilter, roomTypeFilter, districtFilter, areaFilter, sortBy, setSearchParams]
  );

  const handlePageChange = useCallback(
    (page) => {
      applyFilters({ page });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [applyFilters]
  );

  const handleReset = () => {
    setSearchTermLocal('');
    setPriceFilterLocal('all');
    setRoomTypeFilterLocal('all');
    setDistrictFilterLocal('');
    setAreaFilterLocal('all');
    setSortByLocal('newest');
    setSearchParams({}, { replace: true });
    setCurrentPage(1);
  };

  // ── Filtering & sorting ──
  const filteredListings = useMemo(() => {
    let result = listings;

    // keyword
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((item) => {
        const loc = getLocationString(item).toLowerCase();
        return (
          (item.title || '').toLowerCase().includes(term) ||
          loc.includes(term) ||
          (item.description || '').toLowerCase().includes(term)
        );
      });
    }

    // price
    if (priceFilter !== 'all') {
      result = result.filter((item) => matchesPrice(priceFilter, getPriceMillions(item.price)));
    }

    // roomType
    if (roomTypeFilter !== 'all') {
      result = result.filter((item) => item.roomType === roomTypeFilter);
    }

    // district text filter
    if (districtFilter.trim()) {
      const d = districtFilter.toLowerCase();
      result = result.filter((item) =>
        (item.district || '').toLowerCase().includes(d) ||
        (item.ward || '').toLowerCase().includes(d)
      );
    }

    // area
    if (areaFilter !== 'all') {
      result = result.filter((item) => matchesArea(areaFilter, item.area));
    }

    return sortListings(result, sortBy);
  }, [listings, searchTerm, priceFilter, roomTypeFilter, districtFilter, areaFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredListings.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filteredListings.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Count active filters for badge
  const activeFilterCount = [
    priceFilter !== 'all',
    roomTypeFilter !== 'all',
    districtFilter.trim() !== '',
    areaFilter !== 'all',
  ].filter(Boolean).length;

  return (
    <div className="bg-gray-50 min-h-screen text-gray-800">

      {/* ── Hero Banner ── */}
      <section className="bg-gradient-to-r from-blue-700 to-indigo-800 py-8 sm:py-10 md:py-20 px-2.5 sm:px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="text-[1.55rem] sm:text-[2rem] md:text-5xl font-extrabold text-white mb-4 leading-[1.1] px-1">
            Phòng Trọ tại{' '}
            <span className="text-yellow-400">Hòa Lạc, Thạch Thất</span>
          </h1>
          <p className="text-blue-100 text-sm sm:text-base md:text-lg mb-6 sm:mb-8 max-w-full sm:max-w-2xl mx-auto leading-relaxed px-1">
            Tổng hợp các phòng trọ, nhà trọ và căn hộ mini gần khu vực Hòa Lạc - Thạch Thất.
          </p>

          {/* Quick search bar inside hero */}
          <div className="bg-white p-3 sm:p-4 md:p-6 rounded-2xl shadow-2xl text-left">
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
                    onChange={(e) => {
                      setSearchTermLocal(e.target.value);
                      applyFilters({ searchTerm: e.target.value });
                    }}
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
                    onChange={(e) => {
                      setPriceFilterLocal(e.target.value);
                      applyFilters({ priceFilter: e.target.value });
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                  >
                    {PRICE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main content ── */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 mb-16">

        {/* ── Result header bar ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Khu vực nổi bật</p>
            <h2 className="text-2xl font-bold text-gray-900 mt-1">Hòa Lạc, Thạch Thất, Hà Nội</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading
                ? 'Đang tải...'
                : `Hiển thị ${paginated.length} / ${filteredListings.length} kết quả • Danh sách nhà trọ, căn hộ và chung cư mini gần khu vực`}
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition self-start md:self-auto"
          >
            <i className="fa-solid fa-arrow-left-long mr-2" />
            Quay lại
          </Link>
        </div>

        {/* ── Advanced filter panel ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
          {/* Filter toggle header */}
          <div className="flex items-center justify-between px-5 py-4">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="flex items-center gap-2 font-bold text-gray-900 text-sm"
            >
              <i className="fa-solid fa-sliders text-blue-600" />
              Bộ lọc tìm kiếm nâng cao
              {activeFilterCount > 0 && (
                <span className="ml-1 bg-blue-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
              <i
                className={`fa-solid fa-chevron-${showFilters ? 'up' : 'down'} text-gray-400 text-xs ml-1 transition-transform duration-200`}
              />
            </button>

            {/* Sort + view toggle (always visible) */}
            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <i className="fa-solid fa-arrow-up-wide-short absolute left-3 top-2.5 text-gray-400 text-xs" />
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortByLocal(e.target.value);
                    applyFilters({ sortBy: e.target.value });
                  }}
                  className="bg-gray-50 border border-gray-200 rounded-xl py-2 pl-8 pr-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setViewMode('grid')}
                className={`w-9 h-9 rounded-xl flex items-center justify-center border transition ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                }`}
                title="Dạng lưới"
              >
                <i className="fa-solid fa-grip text-sm" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`w-9 h-9 rounded-xl flex items-center justify-center border transition ${
                  viewMode === 'list'
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                }`}
                title="Dạng danh sách"
              >
                <i className="fa-solid fa-list text-sm" />
              </button>
            </div>
          </div>

          {/* Expandable filter body */}
          {showFilters && (
            <div className="border-t border-gray-100 px-5 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* Room Type */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                    Loại hình phòng
                  </label>
                  <div className="relative">
                    <i className="fa-solid fa-building absolute left-3 top-3.5 text-gray-400" />
                    <select
                      value={roomTypeFilter}
                      onChange={(e) => {
                        setRoomTypeFilterLocal(e.target.value);
                        applyFilters({ roomTypeFilter: e.target.value });
                      }}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    >
                      {ROOM_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* District */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                    Khu vực / Quận huyện
                  </label>
                  <div className="relative">
                    <i className="fa-solid fa-location-dot absolute left-3 top-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={districtFilter}
                      onChange={(e) => {
                        setDistrictFilterLocal(e.target.value);
                        applyFilters({ districtFilter: e.target.value });
                      }}
                      placeholder="Ví dụ: Thạch Thất, Hoài Đức..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Area */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                    Diện tích
                  </label>
                  <div className="relative">
                    <i className="fa-solid fa-vector-square absolute left-3 top-3.5 text-gray-400" />
                    <select
                      value={areaFilter}
                      onChange={(e) => {
                        setAreaFilterLocal(e.target.value);
                        applyFilters({ areaFilter: e.target.value });
                      }}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    >
                      {AREA_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sort (mobile) */}
                <div className="sm:hidden">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                    Sắp xếp theo
                  </label>
                  <div className="relative">
                    <i className="fa-solid fa-arrow-up-wide-short absolute left-3 top-3.5 text-gray-400" />
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        setSortByLocal(e.target.value);
                        applyFilters({ sortBy: e.target.value });
                      }}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    >
                      {SORT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Reset row */}
              {activeFilterCount > 0 && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-red-500 hover:text-red-600 transition"
                  >
                    <i className="fa-solid fa-xmark" />
                    Xóa tất cả bộ lọc ({activeFilterCount})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Active filter pills ── */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="text-xs text-gray-500 font-medium">Đang lọc:</span>
            {priceFilter !== 'all' && (
              <span
                onClick={() => { setPriceFilterLocal('all'); applyFilters({ priceFilter: 'all' }); }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 cursor-pointer hover:bg-blue-100 transition"
              >
                <i className="fa-solid fa-tags text-[10px]" />
                {PRICE_OPTIONS.find((o) => o.value === priceFilter)?.label}
                <i className="fa-solid fa-xmark text-[10px]" />
              </span>
            )}
            {roomTypeFilter !== 'all' && (
              <span
                onClick={() => { setRoomTypeFilterLocal('all'); applyFilters({ roomTypeFilter: 'all' }); }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 cursor-pointer hover:bg-blue-100 transition"
              >
                <i className="fa-solid fa-building text-[10px]" />
                {ROOM_TYPE_OPTIONS.find((o) => o.value === roomTypeFilter)?.label}
                <i className="fa-solid fa-xmark text-[10px]" />
              </span>
            )}
            {districtFilter && (
              <span
                onClick={() => { setDistrictFilterLocal(''); applyFilters({ districtFilter: '' }); }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 cursor-pointer hover:bg-blue-100 transition"
              >
                <i className="fa-solid fa-location-dot text-[10px]" />
                {districtFilter}
                <i className="fa-solid fa-xmark text-[10px]" />
              </span>
            )}
            {areaFilter !== 'all' && (
              <span
                onClick={() => { setAreaFilterLocal('all'); applyFilters({ areaFilter: 'all' }); }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 cursor-pointer hover:bg-blue-100 transition"
              >
                <i className="fa-solid fa-vector-square text-[10px]" />
                {AREA_OPTIONS.find((o) => o.value === areaFilter)?.label}
                <i className="fa-solid fa-xmark text-[10px]" />
              </span>
            )}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && filteredListings.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-8 sm:px-6 sm:py-10 text-center text-gray-600">
            <i className="fa-solid fa-magnifying-glass text-2xl text-blue-500 mb-3 block" />
            <p className="text-lg font-semibold text-gray-900">Không tìm thấy kết quả phù hợp</p>
            <p className="mt-1 text-sm text-gray-500">
              Hãy thử từ khóa khác hoặc đổi khoảng giá để tìm phòng phù hợp hơn.
            </p>
            <button
              onClick={handleReset}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline"
            >
              <i className="fa-solid fa-rotate-left" />
              Xóa tất cả bộ lọc
            </button>
          </div>
        )}

        {/* ── Listings ── */}
        {loading ? (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3'
                : 'flex flex-col gap-4'
            }
          >
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
            {paginated.map((listing) => (
              <ListingCard key={listing._id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {paginated.map((listing) => (
              <ListingRow key={listing._id} listing={listing} />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && filteredListings.length > 0 && (
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onChange={handlePageChange}
          />
        )}
      </section>
    </div>
  );
};

export default Search;
