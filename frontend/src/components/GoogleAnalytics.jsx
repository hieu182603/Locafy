import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const GoogleAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    const gaId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;
    const gscId = import.meta.env.VITE_GOOGLE_SITE_VERIFICATION;

    if (!gaId || !gaId.startsWith('G-')) {
      console.warn('Locafy: Google Analytics ID trống hoặc không đúng định dạng G-XXXX.');
      return;
    }

    // 1. Nạp Google Analytics (gtag.js)
    const scriptId = 'google-analytics-script';
    if (!document.getElementById(scriptId)) {
      const scriptSrc = document.createElement('script');
      scriptSrc.id = scriptId;
      scriptSrc.async = true;
      scriptSrc.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(scriptSrc);

      const scriptInit = document.createElement('script');
      scriptInit.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        window.gtag = function(){window.dataLayer.push(arguments);}
        window.gtag('js', new Date());
      `;
      document.head.appendChild(scriptInit);
      console.log(`Locafy: Google Analytics (${gaId}) đã được nạp.`);
    }

    // 2. Tự động kiểm tra và chèn thẻ meta Google Search Console (chỉ áp dụng ở Trang Chủ)
    if (gscId && (location.pathname === '/' || location.pathname === '/index')) {
      let metaTag = document.querySelector('meta[name="google-site-verification"]');
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.name = 'google-site-verification';
        metaTag.content = gscId;
        document.head.appendChild(metaTag);
        console.log('Locafy: Thẻ meta xác minh Google Search Console đã được chèn.');
      } else {
        metaTag.content = gscId;
      }
    }
  }, []);

  // 3. Tự động gửi pageview khi người dùng chuyển trang (trong môi trường SPA)
  useEffect(() => {
    const gaId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;
    if (gaId && gaId.startsWith('G-') && window.gtag) {
      window.gtag('config', gaId, {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);

  return null;
};

export default GoogleAnalytics;
