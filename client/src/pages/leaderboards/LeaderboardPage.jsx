import React, { useState, useEffect, useCallback } from 'react';
import LeaderboardTable from '../../components/gamification/LeaderboardTable';
import TrustScoreBadge from '../../components/profile/TrustScoreBadge';
import useAuth from '../../hooks/useAuth';

/* ─── Mock data (replace with useReputation hook / API call) ─────────── */
function useMockLeaderboard(category, period) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      const names = [
        ['Priya Sharma',    'Full-Stack Dev',   96, 18, 4820],
        ['Rajan Thapa',     'UI/UX Designer',   91, 14, 3910],
        ['Anika Rai',       'Content Writer',   88, 11, 3340],
        ['Dev Karmacharya', 'Data Scientist',   85, 9,  2970],
        ['Sita Magar',      'Mobile Dev',       82, 12, 2650],
        ['Binod Poudel',    'SEO Specialist',   79, 8,  2180],
        ['Komal Shrestha',  'Graphic Designer', 76, 7,  1940],
        ['Lila Adhikari',   'Video Editor',     72, 6,  1650],
        ['Niraj Gautam',    'Copywriter',       68, 5,  1420],
        ['Mina Tamang',     'Web Developer',    64, 4,  1100],
      ];

      setData(
        names.map(([name, spec, trust, badges, pts], i) => ({
          userId: `user-${i + 1}`,
          rank: i + 1,
          name,
          specialisation: spec,
          trustScore: trust,
          badgeCount: badges,
          totalPoints: pts,
          avatarUrl: null,
        }))
      );
      setIsLoading(false);
    }, 900);
    return () => clearTimeout(timer);
  }, [category, period]);

  return { data, isLoading };
}

/* ─── Filter chips ──────────────────────────────────────────────────── */
function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 16px',
        borderRadius: 4,
        border: active ? '1px solid #F59E0B' : '1px solid rgba(255,255,255,0.1)',
        background: active ? 'rgba(245,158,11,0.12)' : 'transparent',
        color: active ? '#F59E0B' : 'rgba(255,255,255,0.45)',
        fontFamily: "'DM Mono', monospace",
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}

/* ─── Podium card (top 3) ────────────────────────────────────────────── */
function PodiumCard({ entry, position }) {
  if (!entry) return <div />;
  const configs = {
    1: { height: 120, colour: '#F59E0B', label: '1st' },
    2: { height: 90,  colour: '#9CA3AF', label: '2nd' },
    3: { height: 72,  colour: '#B45309', label: '3rd' },
  };
  const cfg = configs[position];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        order: position === 1 ? 0 : position === 2 ? -1 : 1,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: position === 1 ? 72 : 56,
          height: position === 1 ? 72 : 56,
          borderRadius: '50%',
          background: `hsl(${(entry.name.charCodeAt(0) * 37) % 360},50%,25%)`,
          border: `2px solid ${cfg.colour}`,
          boxShadow: `0 0 20px ${cfg.colour}44`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'DM Mono', monospace",
          fontSize: position === 1 ? 22 : 18,
          color: 'rgba(255,255,255,0.8)',
        }}
      >
        {entry.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
      </div>

      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: position === 1 ? 14 : 12,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          {entry.name.split(' ')[0]}
        </div>
        <div
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            color: cfg.colour,
          }}
        >
          {entry.totalPoints.toLocaleString()} pts
        </div>
      </div>

      {/* Podium block */}
      <div
        style={{
          width: position === 1 ? 100 : 80,
          height: cfg.height,
          background: `linear-gradient(180deg, ${cfg.colour}22, ${cfg.colour}08)`,
          border: `1px solid ${cfg.colour}33`,
          borderRadius: '6px 6px 0 0',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: 12,
        }}
      >
        <span
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: 32,
            color: cfg.colour,
            lineHeight: 1,
          }}
        >
          {cfg.label}
        </span>
      </div>
    </div>
  );
}

/* ─── Stat pill ─────────────────────────────────────────────────────── */
function StatPill({ label, value, colour = '#F59E0B' }) {
  return (
    <div
      style={{
        padding: '16px 24px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10,
        textAlign: 'center',
        flex: 1,
        minWidth: 120,
      }}
    >
      <div
        style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: 28,
          color: colour,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10,
          color: 'rgba(255,255,255,0.35)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginTop: 4,
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */
const CATEGORIES = ['All', 'Quality', 'Speed', 'Reliability', 'Milestone'];
const PERIODS    = ['This Week', 'This Month', 'All Time'];

export default function LeaderboardPage() {
  const { user } = useAuth?.() ?? { user: null };
  const [category, setCategory] = useState('All');
  const [period, setPeriod]     = useState('All Time');

  const { data, isLoading } = useMockLeaderboard(category, period);

  const top3 = data.slice(0, 3);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0D1117',
        color: '#fff',
        padding: '0 0 80px',
      }}
    >
      {/* ── Hero banner ──────────────────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          padding: '60px 48px 40px',
          background:
            'radial-gradient(ellipse 70% 120% at 50% -20%, rgba(245,158,11,0.12) 0%, transparent 70%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}
      >
        {/* Decorative grid lines */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(245,158,11,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.04) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto' }}>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              color: '#F59E0B',
              marginBottom: 8,
            }}
          >
            TaskTide · Rankings
          </div>
          <h1
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              fontSize: 'clamp(48px, 6vw, 80px)',
              lineHeight: 0.95,
              letterSpacing: '-0.01em',
              margin: '0 0 8px',
              color: '#fff',
            }}
          >
            LEADERBOARD
          </h1>
          <p
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: 14,
              color: 'rgba(255,255,255,0.4)',
              margin: 0,
              maxWidth: 420,
            }}
          >
            The definitive ranking of TaskTide's top performers — scored by trust,
            reliability, and reputation milestones.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 48px 0' }}>

        {/* ── Stats row ────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
          <StatPill label="Ranked Freelancers" value={data.length} />
          <StatPill label="Total Points Awarded" value={data.reduce((s, e) => s + e.totalPoints, 0).toLocaleString()} colour="#06B6D4" />
          <StatPill label="Badges Earned" value={data.reduce((s, e) => s + e.badgeCount, 0)} colour="#EC4899" />
          <StatPill label="Avg Trust Score" value={data.length ? Math.round(data.reduce((s, e) => s + e.trustScore, 0) / data.length) : 0} colour="#10B981" />
        </div>

        {/* ── Podium ───────────────────────────────────────────────── */}
        {!isLoading && top3.length === 3 && (
          <div style={{ marginBottom: 48 }}>
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                color: 'rgba(255,255,255,0.25)',
                marginBottom: 24,
              }}
            >
              Top Performers
            </div>
            <div
              style={{
                display: 'flex',
                gap: 0,
                alignItems: 'flex-end',
                justifyContent: 'center',
                maxWidth: 400,
                margin: '0 auto',
              }}
            >
              <PodiumCard entry={top3[1]} position={2} />
              <PodiumCard entry={top3[0]} position={1} />
              <PodiumCard entry={top3[2]} position={3} />
            </div>
          </div>
        )}

        {/* ── Filters ──────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 24,
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map((c) => (
              <FilterChip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {PERIODS.map((p) => (
              <FilterChip key={p} label={p} active={period === p} onClick={() => setPeriod(p)} />
            ))}
          </div>
        </div>

        {/* ── Table ────────────────────────────────────────────────── */}
        <LeaderboardTable
          entries={data}
          isLoading={isLoading}
          highlightUserId={user?.id}
        />

        {/* ── Updated note ─────────────────────────────────────────── */}
        <div
          style={{
            marginTop: 16,
            fontFamily: "'DM Mono', monospace",
            fontSize: 10,
            color: 'rgba(255,255,255,0.2)',
            textAlign: 'right',
          }}
        >
          Updated daily · Scores reflect last 90 days of activity
        </div>
      </div>
    </div>
  );
}