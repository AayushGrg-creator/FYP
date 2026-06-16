import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * useAuth Custom Hook
 * Path: client/src/hooks/useAuth.js
 * * Exposes Task Tide's global authentication and session state engine.
 * Guards defensively against out-of-bounds provider consumption anomalies.
 *
 * @returns {object} AuthContext Schema Definition Payload:
 * - user: {object|null} Current authenticated user records or null state.
 * - loading: {boolean} Core state flag tracking session recovery checks.
 * - error: {string|null} System validation error context string.
 * - isAuthenticated: {boolean} Logical flag evaluating profile activity.
 * - register: {function} Async handler managing email onboarding records.
 * - login: {function} Async execution pipeline matching credentials.
 * - googleLogin: {function} Async federated OAuth identity validator.
 * - logout: {function} Immediate session termination hook.
 * - updateUser: {function} Dispatches dynamic syncs over mutated profiles.
 * - clearError: {function} Resets security exception indicators.
 * * @throws {Error} If called outside of an active <AuthProvider> parent tree element.
 */
const useAuth = () => {
  const context = useContext(AuthContext);

  // Defensive Guard Boundary Check
  if (!context || Object.keys(context).length === 0) {
    throw new Error(
      'Security Exception: useAuth hook was executed outside of an active <AuthProvider> hierarchy. ' +
      'Ensure your route or page grid is nested inside a global Auth Provider container.'
    );
  }

  return context;
};

export default useAuth;