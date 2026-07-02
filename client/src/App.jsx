import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import FreelancerProfilePage from './pages/profile/FreelancerProfilePage';
import RoleDashboard from './pages/dashboard/RoleDashboard';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Footer Pages
import HowToHire from './pages/HowToHire';
import HowToEarn from './pages/HowToEarn';
import AboutUs from './pages/AboutUs';
import PaymentProtection from './pages/PaymentProtection';
import SellerLevels from './pages/SellerLevels';
import { SuccessStories, TalentMarketplace, Enterprise, Resources, Careers, Blog, Contact } from './pages/OtherPages';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Footer Pages */}
          <Route path="/how-to-hire" element={<HowToHire />} />
          <Route path="/talent-marketplace" element={<TalentMarketplace />} />
          <Route path="/enterprise" element={<Enterprise />} />
          <Route path="/payment-protection" element={<PaymentProtection />} />
          <Route path="/how-to-earn" element={<HowToEarn />} />
          <Route path="/success-stories" element={<SuccessStories />} />
          <Route path="/seller-levels" element={<SellerLevels />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/contact" element={<Contact />} />

          {/* Protected Routes - Authenticated Users */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<RoleDashboard />} />
              <Route path="/profile" element={<FreelancerProfilePage />} />
            </Route>
          </Route>

          {/* Protected Routes - Admin Only */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin" element={<div>Admin Panel</div>} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;