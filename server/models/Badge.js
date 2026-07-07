const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * Badge – master catalogue of every earnable achievement on TaskTide.
 * Think of this as the "badge template".  Individual awards are stored
 * in UserBadge (one document per user × badge event).
 */
const BadgeSchema = new Schema(
  {
    // ── Identity ───────────────────────────────────────────────────────
    slug: {
      type: String,
      required: [true, 'Badge slug is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9_-]+$/, 'Slug may only contain lowercase letters, numbers, hyphens and underscores.'],
    },

    name: {
      type: String,
      required: [true, 'Badge name is required.'],
      trim: true,
      maxlength: [80, 'Badge name cannot exceed 80 characters.'],
    },

    description: {
      type: String,
      required: [true, 'Badge description is required.'],
      trim: true,
      maxlength: [300, 'Badge description cannot exceed 300 characters.'],
    },

    // Short motivational tagline shown on hover cards
    tagline: {
      type: String,
      trim: true,
      maxlength: [120, 'Tagline cannot exceed 120 characters.'],
    },

    // ── Visual ────────────────────────────────────────────────────────
    // Icon key referencing the frontend's SVG icon registry (Lucide icon
    // set — https://lucide.dev). Render with e.g. <LucideIcon name={icon} />
    // rather than printing the string as an emoji glyph.
    icon: {
      type: String,
      default: 'award',
    },

    // Hex colour used for the badge ring / glow effect
    colour: {
      type: String,
      default: '#F59E0B',
      match: [/^#[0-9A-Fa-f]{6}$/, 'colour must be a valid 6-digit hex code.'],
    },

    // Rarity tier drives visual treatment (common → diamond)
    tier: {
      type: String,
      enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
      default: 'common',
      index: true,
    },

    // ── Trigger & Reward ──────────────────────────────────────────────
    // Category determines which subsystem emits the award event
    category: {
      type: String,
      enum: [
        'quality',       // ratings / reviews
        'speed',         // response time / turnaround
        'reliability',   // completion rate / dispute-free record
        'milestone',     // escrow & milestone events
        'engagement',    // profile completion, platform activity
        'community',     // reviews left, referrals
        'financial',     // earnings thresholds
        'ai_adaptation', // AI-related gigs / skills
      ],
      required: [true, 'Badge category is required.'],
      index: true,
    },

    // Points granted to the user when this badge is first awarded
    pointsAwarded: {
      type: Number,
      required: [true, 'pointsAwarded is required.'],
      min: [0, 'Points awarded cannot be negative.'],
      default: 100,
    },

    // Optional multiplier applied to the Trust Score calculation
    // (see Section 5.5.1 – Badge Multiplier = 1 + 0.05 × badge count)
    trustScoreBonus: {
      type: Number,
      default: 0.05,
      min: 0,
      max: 0.5,
    },

    // ── Trigger Conditions (stored as flexible config) ─────────────────
    // The reputation.service reads these to decide when to award.
    triggerCondition: {
      metric: {
        type: String,
        trim: true,
        // e.g. 'completedProjects', 'avgRating', 'responseTimeMinutes', 'trustScore'
      },
      operator: {
        type: String,
        enum: ['gte', 'lte', 'eq', 'count_gte'],
        default: 'gte',
      },
      threshold: {
        type: Schema.Types.Mixed, // Number or String depending on metric
      },
    },

    // Whether this badge can be earned multiple times (e.g., yearly streaks)
    isRepeatable: {
      type: Boolean,
      default: false,
    },

    // Soft-disable without deleting (e.g., seasonal badges)
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────
BadgeSchema.index({ category: 1, tier: 1 });
BadgeSchema.index({ isActive: 1, tier: 1 });

// ── Static: seed default badge catalogue ──────────────────────────────
// icon values are Lucide icon names (kebab-case) — render on the frontend
// via a component like <LucideIcon name={badge.icon} /> for crisp, uniform
// vector icons instead of platform-dependent emoji.
BadgeSchema.statics.DEFAULTS = [
  {
    slug: 'first_blood',
    name: 'First Blood',
    description: 'Complete your very first project on TaskTide.',
    tagline: 'Every legend has a beginning.',
    icon: 'swords',
    colour: '#10B981',
    tier: 'common',
    category: 'milestone',
    pointsAwarded: 100,
    triggerCondition: { metric: 'completedProjects', operator: 'gte', threshold: 1 },
  },
  {
    slug: 'speed_demon',
    name: 'Speed Demon',
    description: 'Deliver 5 projects ahead of schedule.',
    tagline: 'Time is the only non-renewable resource.',
    icon: 'zap',
    colour: '#F59E0B',
    tier: 'uncommon',
    category: 'speed',
    pointsAwarded: 250,
    triggerCondition: { metric: 'earlyDeliveries', operator: 'gte', threshold: 5 },
  },
  {
    slug: 'perfect_ten',
    name: 'Perfect Ten',
    description: 'Complete 10 projects each earning a 5-star rating.',
    tagline: 'Perfection is a habit, not an accident.',
    icon: 'star',
    colour: '#EF4444',
    tier: 'rare',
    category: 'quality',
    pointsAwarded: 500,
    triggerCondition: { metric: 'fiveStarProjects', operator: 'gte', threshold: 10 },
  },
  {
    slug: 'fast_responder',
    name: 'Fast Responder',
    description: 'Reply within 5 minutes on 100 separate occasions.',
    tagline: 'In this game, speed is trust.',
    icon: 'bell-ring',
    colour: '#8B5CF6',
    tier: 'uncommon',
    category: 'speed',
    pointsAwarded: 200,
    triggerCondition: { metric: 'subFiveMinuteReplies', operator: 'count_gte', threshold: 100 },
  },
  {
    slug: 'escrow_expert',
    name: 'Escrow Expert',
    description: 'Successfully complete 5 milestone-based payments without dispute.',
    tagline: 'Trust is built one milestone at a time.',
    icon: 'lock-keyhole',
    colour: '#06B6D4',
    tier: 'uncommon',
    category: 'milestone',
    pointsAwarded: 300,
    triggerCondition: { metric: 'cleanMilestones', operator: 'gte', threshold: 5 },
  },
  {
    slug: 'trusted_partner',
    name: 'Trusted Partner',
    description: 'Achieve a Trust Score of 95 or above.',
    tagline: 'The highest tier of platform credibility.',
    icon: 'shield-check',
    colour: '#F59E0B',
    tier: 'epic',
    category: 'reliability',
    pointsAwarded: 400,
    triggerCondition: { metric: 'trustScore', operator: 'gte', threshold: 95 },
  },
  {
    slug: 'early_bird',
    name: 'Early Bird',
    description: 'Complete your profile within 24 hours of registration.',
    tagline: 'First impressions matter most.',
    icon: 'sunrise',
    colour: '#10B981',
    tier: 'common',
    category: 'engagement',
    pointsAwarded: 50,
    triggerCondition: { metric: 'profileCompletedHoursAfterSignup', operator: 'lte', threshold: 24 },
  },
  {
    slug: 'top_rated',
    name: 'Top Rated',
    description: 'Maintain an average rating of 4.8 or above across 20+ reviews.',
    tagline: 'Consistency is the rarest skill of all.',
    icon: 'crown',
    colour: '#F59E0B',
    tier: 'legendary',
    category: 'quality',
    pointsAwarded: 750,
    trustScoreBonus: 0.15,
    triggerCondition: { metric: 'sustainedHighRating', operator: 'gte', threshold: 4.8 },
  },
];

module.exports = mongoose.model('Badge', BadgeSchema);