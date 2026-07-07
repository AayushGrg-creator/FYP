
import { useAuth } from '../../context/AuthContext';
import FreelancerDashboard from './FreelancerDashboard';
import ClientDashboard from './ClientDashboard';

export default function RoleDashboard() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#8FA3CC' }}>
        Loading...
      </div>
    );
  }

  return user.role === 'client' ? <ClientDashboard /> : <FreelancerDashboard />;
}
