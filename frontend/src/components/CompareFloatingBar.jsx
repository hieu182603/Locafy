import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LocafyApi } from '../services/api';

const CompareFloatingBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [ids, setIds] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load IDs from localStorage
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

  // Fetch listing details for the IDs
  useEffect(() => {
    if (ids.length === 0) {
      setListings([]);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const promises = ids.map(async (id) => {
          // Check if we already have it to avoid refetching
          const existing = listings.find((l) => l._id === id);
          if (existing) return existing;
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

    fetchDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  const handleRemove = (id) => {
    const updated = ids.filter((x) => x !== id);
    localStorage.setItem('locafy_compare', JSON.stringify(updated));
    setIds(updated);
    window.dispatchEvent(new Event('storage'));
  };

  const handleClear = () => {
    localStorage.removeItem('locafy_compare');
    setIds([]);
    setListings([]);
    window.dispatchEvent(new Event('storage'));
  };

  // Do not show on the comparison page itself or if no items compared
  if (location.pathname === '/user/compare' || ids.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white/95 backdrop-blur-md border border-slate-100 shadow-2xl rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Compare list */}
        <div className="flex items-center gap-3 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <div className="shrink-0 flex items-center gap-2 pr-3 border-r border-slate-100">
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <i className="fa-solid fa-scale-balanced text-sm" />
            </span>
            <div>
              <p className="text-xs font-black text-slate-800">So sánh phòng</p>
              <p className="text-[10px] text-slate-400 font-semibold">{ids.length}/3 phòng</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {listings.map((l) => (
              <div
                key={l._id}
                className="relative group shrink-0 flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl p-1.5 pr-3 max-w-[160px]"
              >
                <img
                  src={l.imageUrls?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=100&q=80'}
                  alt={l.title}
                  className="w-8 h-8 rounded-lg object-cover"
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-700 truncate leading-snug">{l.title}</p>
                  <p className="text-[9px] font-black text-blue-600 mt-0.5">
                    {l.price ? `${(l.price / 1_000_000).toFixed(1).replace('.0', '')}tr/th` : 'Liên hệ'}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(l._id)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-200 text-slate-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition shadow-sm"
                >
                  <i className="fa-solid fa-xmark text-[8px]" />
                </button>
              </div>
            ))}

            {loading && (
              <div className="w-8 h-8 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="shrink-0 flex items-center gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={handleClear}
            className="px-3.5 py-2 hover:bg-slate-50 text-slate-500 text-xs font-bold rounded-xl transition"
          >
            Xóa tất cả
          </button>
          <button
            onClick={() => navigate('/user/compare')}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition shadow-md shadow-blue-100 flex items-center gap-1.5"
          >
            So sánh ngay
            <i className="fa-solid fa-arrow-right text-[10px]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompareFloatingBar;
