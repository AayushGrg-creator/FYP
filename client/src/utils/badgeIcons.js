import {
  Swords,
  Zap,
  Star,
  BellRing,
  LockKeyhole,
  ShieldCheck,
  Sunrise,
  Crown,
  Award,
} from 'lucide-react';

// Maps the `icon` key stored on each Badge document (see Badge.DEFAULTS in
// server/models/Badge.js) to its Lucide icon component. Add an entry here
// whenever a new badge introduces a new icon key.
export const BADGE_ICON_MAP = {
  swords: Swords,
  zap: Zap,
  star: Star,
  'bell-ring': BellRing,
  'lock-keyhole': LockKeyhole,
  'shield-check': ShieldCheck,
  sunrise: Sunrise,
  crown: Crown,
  award: Award, // fallback / default icon
};

export function getBadgeIcon(iconKey) {
  return BADGE_ICON_MAP[iconKey] || Award;
}