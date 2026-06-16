import { Outlet } from 'react-router-dom';

/**
 * DashboardLayout
 * Wrapper component for authenticated dashboard pages
 * Provides consistent layout structure for protected routes
 */
export default function DashboardLayout() {
  return (
    <div className="dashboard-layout">
      <div className="dashboard-content">
        <Outlet />
      </div>
    </div>
  );
}
