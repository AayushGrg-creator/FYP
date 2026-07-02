import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * Profile Component
 * User profile view and management page
 * Displays user information and allows profile editing
 */
export default function Profile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: '',
    avatar: '',
    location: '',
    phone: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        avatar: user.avatarUrl || '',
        location: user.location || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      // TODO: replace with real API call once backend profile endpoint is confirmed
      // const updated = await profileService.updateProfile(formData);
      // updateUser(updated.user);
      console.log('Updating profile:', formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setSaveError(error.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="profile-loading">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>My Profile</h1>
        <button 
          className="edit-btn"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      {saveError && (
        <div style={{ color: '#DC2626', marginBottom: 16 }}>{saveError}</div>
      )}

      <div className="profile-container">
        {/* Avatar Section */}
        <div className="profile-avatar-section">
          {formData.avatar ? (
            <img 
              src={formData.avatar} 
              alt="Profile Avatar" 
              className="profile-avatar"
            />
          ) : (
            <div className="profile-avatar-placeholder">
              {formData.name?.charAt(0)?.toUpperCase()}
            </div>
          )}
        </div>

        {/* Profile Form */}
        {isEditing ? (
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                disabled
              />
            </div>

            <div className="form-group">
              <label>Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                rows="4"
              />
            </div>

            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>

            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        ) : (
          <div className="profile-view">
            <div className="profile-item">
              <span className="label">Name:</span>
              <span className="value">{formData.name}</span>
            </div>

            <div className="profile-item">
              <span className="label">Email:</span>
              <span className="value">{formData.email}</span>
            </div>

            <div className="profile-item">
              <span className="label">Location:</span>
              <span className="value">{formData.location || 'Not set'}</span>
            </div>

            <div className="profile-item">
              <span className="label">Phone:</span>
              <span className="value">{formData.phone || 'Not set'}</span>
            </div>

            <div className="profile-item">
              <span className="label">Bio:</span>
              <span className="value">{formData.bio || 'No bio added'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}