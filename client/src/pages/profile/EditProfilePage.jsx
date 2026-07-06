import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../hooks/useProfile';
import profileService from '../../services/profileService';

export default function EditProfilePage() {
  const { user } = useAuth();
  const { profile, loading, error, fetchProfile, updateProfile, setProfile } = useProfile();

  const isClient = user?.role === 'client';

  // ── Local form state ──
  const [formData, setFormData] = useState({
    bio: '',
    hourlyRate: '',
    skills: '',
    location: '',
    companyName: '',
    industryType: '',
    githubUrl: '',
    linkedinUrl: '',
  });

  const [portfolio, setPortfolio] = useState([]);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Load existing profile on mount ──
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ── Sync form fields once profile loads ──
  useEffect(() => {
    if (!profile) return;

    setFormData({
      bio: profile.bio || '',
      hourlyRate: profile.hourlyRate ?? '',
      skills: Array.isArray(profile.skills) ? profile.skills.join(', ') : '',
      location: profile.location || '',
      companyName: profile.companyName || '',
      industryType: profile.industryType || '',
      githubUrl: profile.githubUrl || '',
      linkedinUrl: profile.linkedinUrl || '',
    });
    setAvatarPreview(profile.avatarUrl || '');

    setPortfolio(
      Array.isArray(profile.portfolio) && profile.portfolio.length > 0
        ? profile.portfolio.map((p) => ({
            title: p.title || '',
            description: p.description || '',
            url: p.url || '',
            techStack: Array.isArray(p.techStack) ? p.techStack.join(', ') : '',
          }))
        : []
    );
  }, [profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarUpload = useCallback(async () => {
    if (!avatarFile) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('avatar', avatarFile); // must match multer field name in uploadMiddleware.js

      const result = await profileService.uploadAvatar(form);
      // controller returns { message, data: profile }
      setProfile(result.data);
      setAvatarFile(null);
    } catch (err) {
      console.error('Avatar upload failed:', err.message);
    } finally {
      setUploading(false);
    }
  }, [avatarFile, setProfile]);

  // ── Portfolio helpers ──
  const addPortfolioItem = () => {
    setPortfolio((prev) => [...prev, { title: '', description: '', url: '', techStack: '' }]);
  };

  const removePortfolioItem = (index) => {
    setPortfolio((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePortfolioChange = (index, field, value) => {
    setPortfolio((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveSuccess(false);

    // Build payload matching backend's per-role whitelist
    const payload = isClient
      ? {
          companyName: formData.companyName,
          industryType: formData.industryType,
          location: formData.location,
        }
     : {
    bio: formData.bio,
    hourlyRate: formData.hourlyRate === '' ? undefined : Number(formData.hourlyRate),
    skills: formData.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    location: formData.location,
    githubUrl: formData.githubUrl,
    linkedinUrl: formData.linkedinUrl,
    portfolio: portfolio
            .filter((p) => p.title.trim() !== '') // drop blank rows
            .map((p) => ({
              title: p.title.trim(),
              description: p.description.trim(),
              url: p.url.trim(),
              techStack: p.techStack
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
            })),
        };

    try {
      await updateProfile(payload);
      setSaveSuccess(true);
    } catch (err) {
      // error state already set inside useProfile
    }
  };

  if (loading && !profile) {
    return <div className="p-6 text-center text-gray-500">Loading profile…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-blue-900 mb-6">Edit Profile</h1>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-600 text-sm">{error}</div>
      )}
      {saveSuccess && (
        <div className="mb-4 p-3 rounded bg-green-50 text-green-600 text-sm">
          Profile updated successfully.
        </div>
      )}

      {/* ── Avatar ── */}
      <div className="flex items-center gap-4 mb-8">
        {avatarPreview ? (
          <img
            src={avatarPreview}
            alt="Avatar preview"
            className="w-20 h-20 rounded-full object-cover border border-gray-200"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-blue-100 border border-gray-200 flex items-center justify-center text-blue-600 font-semibold text-xl">
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
        <div>
          <input type="file" accept="image/png, image/jpeg" onChange={handleAvatarChange} />
          <button
            type="button"
            onClick={handleAvatarUpload}
            disabled={!avatarFile || uploading}
            className="ml-2 px-3 py-1 text-sm rounded bg-blue-600 text-white disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {isClient ? (
          <>
            <Field label="Company Name" name="companyName" value={formData.companyName} onChange={handleChange} />
            <Field label="Industry" name="industryType" value={formData.industryType} onChange={handleChange} />
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                maxLength={500}
                rows={4}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <Field
              label="Hourly Rate (NPR)"
              name="hourlyRate"
              type="number"
              value={formData.hourlyRate}
              onChange={handleChange}
            />
            <Field
              label="Skills (comma-separated)"
              name="skills"
              value={formData.skills}
              onChange={handleChange}
              placeholder="React, Node.js, MongoDB"
            />
            <Field
  label="GitHub URL"
  name="githubUrl"
  value={formData.githubUrl}
  onChange={handleChange}
  placeholder="https://github.com/you"
/>
<Field
  label="LinkedIn URL"
  name="linkedinUrl"
  value={formData.linkedinUrl}
  onChange={handleChange}
  placeholder="https://linkedin.com/in/you"
/>
          </>
        )}

        <Field label="Location" name="location" value={formData.location} onChange={handleChange} />

        {/* ── Portfolio (freelancers only) ── */}
        {!isClient && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Portfolio</label>
              <button
                type="button"
                onClick={addPortfolioItem}
                className="text-sm text-blue-600 font-medium hover:underline"
              >
                + Add project
              </button>
            </div>

            {portfolio.length === 0 && (
              <p className="text-sm text-gray-400 italic mb-2">
                No portfolio items yet. Add a project to showcase your work.
              </p>
            )}

            <div className="space-y-4">
              {portfolio.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 relative bg-gray-50">
                  <button
                    type="button"
                    onClick={() => removePortfolioItem(index)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-sm"
                    title="Remove project"
                  >
                    ✕
                  </button>

                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Project title"
                      value={item.title}
                      onChange={(e) => handlePortfolioChange(index, 'title', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                    <textarea
                      placeholder="Short description"
                      value={item.description}
                      onChange={(e) => handlePortfolioChange(index, 'description', e.target.value)}
                      maxLength={500}
                      rows={2}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                    <input
                      type="url"
                      placeholder="Project link (e.g. https://github.com/you/project)"
                      value={item.url}
                      onChange={(e) => handlePortfolioChange(index, 'url', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Tech stack (comma-separated, e.g. React, Node.js)"
                      value={item.techStack}
                      onChange={(e) => handlePortfolioChange(index, 'techStack', e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded bg-blue-600 text-white font-semibold disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded px-3 py-2"
      />
    </div>
  );
}