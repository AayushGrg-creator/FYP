import React from 'react';

/**
 * Tabs Component
 * Path: client/src/components/common/Tabs.jsx
 * * Controls view state swaps between parallel tracking routes.
 * Employs accessible layout roles and semantic border indicator rendering.
 */
export default function Tabs({ 
  tabs = [], 
  activeTabId, 
  onTabChange, 
  styleOverrides = {} 
}) {
  // Guard against structural crashes if an empty array or null value is supplied
  if (!tabs || tabs.length === 0) return null;

  return (
    <div style={{ ...styles.container, ...styleOverrides }}>
      {/* ── Tabs Tablist Header Bar ── */}
      <div 
        style={styles.tabList} 
        role="tablist" 
        aria-label="Dashboard Content Sections"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabChange && onTabChange(tab.id)}
              style={{
                ...styles.tabBtn,
                ...(isActive ? styles.activeTabBtn : {})
              }}
            >
              {tab.icon && <span style={styles.iconWrapper}>{tab.icon}</span>}
              <span>{tab.label}</span>
              
              {/* Optional count badge rendering for tracking pending alerts or milestones */}
              {tab.count !== undefined && (
                <span style={{
                  ...styles.countBadge,
                  backgroundColor: isActive ? '#0EA5E9' : '#1E293B',
                  color: isActive ? '#ffffff' : '#94A3B8'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Active Panel Display Wrapper ── */}
      <div style={styles.panelContainer}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          if (!isActive) return null;

          return (
            <div
              key={tab.id}
              id={`panel-${tab.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${tab.id}`}
              style={styles.tabPanel}
            >
              {tab.content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    boxSizing: 'border-box',
  },
  tabList: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    borderBottom: '1px solid #1E293B',
    overflowX: 'auto', // Enables smooth sliding scrolling on compact mobile devices
    scrollbarWidth: 'none', // Suppresses default browser scrollbars for clean styling
    msOverflowStyle: 'none',
    width: '100%',
  },
  tabBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '14px 18px',
    color: '#64748B',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    outline: 'none',
    marginBottom: '-1px', // Pulls the buttons down to overlap and align with the parent border
  },
  activeTabBtn: {
    color: '#0EA5E9',
    borderColor: '#0EA5E9',
    fontWeight: 700,
  },
  iconWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
  },
  countBadge: {
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '6px',
    marginLeft: '2px',
    transition: 'all 0.15s ease',
    fontVariantNumeric: 'tabular-nums',
  },
  panelContainer: {
    width: '100%',
    paddingTop: '20px',
  },
  tabPanel: {
    width: '100%',
    animation: 'fadeIn 0.2s ease-in-out',
  },
};