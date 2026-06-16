import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

/**
 * Dashboard Component
 * Main dashboard page that routes to either Client or Freelancer dashboard
 * based on user role
 */
export default function Dashboard() {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    if (user) {
      setUserRole(user.role);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="dashboard-loading">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {user.firstName || 'User'}</h1>
        <p className="dashboard-role">Role: {userRole?.toUpperCase()}</p>
      </div>

      <div className="dashboard-container">
        {userRole === 'freelancer' ? (
          <div className="freelancer-dashboard">
            <section className="dashboard-section">
              <h2>Available Jobs</h2>
              <p>Browse and apply for jobs matching your skills</p>
            </section>

            <section className="dashboard-section">
              <h2>My Proposals</h2>
              <p>Track your job proposals and applications</p>
            </section>

            <section className="dashboard-section">
              <h2>Active Projects</h2>
              <p>Monitor your ongoing projects and milestones</p>
            </section>

            <section className="dashboard-section">
              <h2>Earnings</h2>
              <p>View your earnings and payment history</p>
            </section>
          </div>
        ) : (
          <div className="client-dashboard">
            <section className="dashboard-section">
              <h2>Post a Job</h2>
              <p>Create new job postings for freelancers</p>
            </section>

            <section className="dashboard-section">
              <h2>My Jobs</h2>
              <p>Manage your active and completed jobs</p>
            </section>

            <section className="dashboard-section">
              <h2>Proposals</h2>
              <p>Review and manage freelancer proposals</p>
            </section>

            <section className="dashboard-section">
              <h2>Payments</h2>
              <p>Track payments and invoices</p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
