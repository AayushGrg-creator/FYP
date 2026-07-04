import { useState, useCallback, useRef, useEffect } from 'react';
import profileService from '../services/profileService';

export function useProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchProfile = useCallback(async (userId, role) => {
    setLoading(true);
    setError(null);
    try {
      const data = userId
        ? await profileService.getById(userId, role)
        : await profileService.getMe();

      // getMe/getById resolve directly to the profile object (api.js unwraps response.data)
      if (isMountedRef.current) setProfile(data);
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to retrieve profile data.');
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (updateData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await profileService.update(updateData);

      // update() resolves to { message, data: profile }
      if (isMountedRef.current) setProfile(result.data);
      return result;
    } catch (err) {
      const msg = err.message || 'Profile update failed.';
      if (isMountedRef.current) setError(msg);
      throw new Error(msg);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  return { profile, loading, error, fetchProfile, updateProfile, setProfile };
}