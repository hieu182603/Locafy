import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Import Layout Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PrivateRoute from './components/PrivateRoute';

// Import Pages
import Home from './pages/Home';
import Search from './pages/Search';
import Detail from './pages/Detail';
import Login from './pages/Login';
import Register from './pages/Register';

// Import Dashboards
import UserDashboard from './pages/user/UserDashboard';
import LandlordDashboard from './pages/manage/LandlordDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';

function AppContent() {
  const location = useLocation();
  const hideHeaderFooter = ['/login', '/register'].includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {!hideHeaderFooter && <Navbar />}
      
      <main className="flex-grow">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/phong-tro" element={<Search />} />
          <Route path="/house-detail/:id" element={<Detail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Renter (Buyer) Routes */}
          <Route 
            path="/user/*" 
            element={
              <PrivateRoute allowedRoles={['user']}>
                <UserDashboard />
              </PrivateRoute>
            } 
          />

          {/* Protected Landlord (Seller) Routes */}
          <Route 
            path="/manage/*" 
            element={
              <PrivateRoute allowedRoles={['seller']}>
                <LandlordDashboard />
              </PrivateRoute>
            } 
          />

          {/* Protected Admin Routes */}
          <Route 
            path="/admin/*" 
            element={
              <PrivateRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </PrivateRoute>
            } 
          />

          {/* Fallback to Home */}
          <Route path="*" element={<Home />} />
        </Routes>
      </main>

      {!hideHeaderFooter && <Footer />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
