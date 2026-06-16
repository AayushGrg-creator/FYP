import React, { useState, useRef } from 'react';

/**
 * AvatarUpload Component
 * Path: client/src/components/common/AvatarUpload.jsx
 * * Provides an interactive drag-and-drop interface for updating user profile assets.
 * Enforces defensive local type checking and file dimension bounds.
 */
export default function AvatarUpload({ currentAvatarUrl, onUploadComplete, maxSizeBytes = 3145728 }) {
  const [previewUrl, setPreviewUrl] = useState(currentAvatarUrl || '');
  const [isDragActive, setIsDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef(null);

  // ── Defensive File Inspector & Validation Guard ──
  const processSelectedFile = (file) => {
    if (!file) return;

    // Enforce standard image mime types (PNG, JPEG, WEBP)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Unsupported file type. Please upload a valid PNG, JPEG, or WEBP image.');
      return;
    }

    // Guard against massive uploads that could bloat binary network streams
    if (file.size > maxSizeBytes) {
      const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(1);
      setError(`Image file size is too massive. Maximum allowance tier is ${maxMb}MB.`);
      return;
    }

    setError('');
    setIsProcessing(true);

    // Create a local memory cache blob URL for instant UI layout previewing
    const localBlobUrl = URL.createObjectURL(file);
    setPreviewUrl(localBlobUrl);

    // Simulate backend cloud upload pipeline delays (e.g., AWS S3 or Cloudinary)
    // Replace this setTimeout block with your real axios/fetch multipart data submission hook
    setTimeout(() => {
      setIsProcessing(false);
      if (onUploadComplete) {
        onUploadComplete(file); // Pass the binary file resource up to parent handlers
      }
    }, 1500);
  };

  // ── Drag & Drop Event Interceptors ──
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const triggerInputTrigger = () => {
    fileInputRef.current.click();
  };

  return (
    <div style={styles.container}>
      <label style={styles.componentLabel}>Profile Identity Asset</label>
      
      {error && <span style={styles.errorText}>⚠️ {error}</span>}

      <div 
        style={{
          ...styles.dropZone,
          borderColor: isDragActive ? '#0EA5E9' : '#1E293B',
          background: isDragActive ? '#0F2235' : '#111827'
        }}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        {/* Main Avatar Render Capsule */}
        <div style={styles.avatarFrame}>
          {previewUrl ? (
            <img src={previewUrl} alt="Avatar preview" style={styles.avatarImage} />
          ) : (
            <div style={styles.avatarPlaceholder}>
              <span style={styles.placeholderIcon}>👤</span>
            </div>
          )}
          
          {isProcessing && (
            <div style={styles.overlaySpinner}>
              <span style={styles.spinnerText}>Syncing File...</span>
            </div>
          )}
        </div>

        {/* Informational Prompt Track */}
        <div style={styles.promptBlock}>
          <p style={styles.mainPrompt}>
            Drag and drop your asset photo here, or{' '}
            <button 
              type="button" 
              onClick={triggerInputTrigger} 
              style={styles.browseBtn}
              disabled={isProcessing}
            >
              browse files
            </button>
          </p>
          <span style={styles.subPrompt}>Supports PNG, JPEG, or WEBP formats (Max 3MB)</span>
        </div>

        {/* Hidden system input element node */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          onChange={(e) => e.target.files && processSelectedFile(e.target.files[0])}
          style={styles.hiddenInput}
          disabled={isProcessing}
        />
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    boxSizing: 'border-box',
  },
  componentLabel: {
    color: '#94A3B8',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  errorText: {
    color: '#F87171',
    fontSize: '13px',
    fontWeight: 600,
  },
  dropZone: {
    border: '2px dashed #1E293B',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    cursor: 'default',
    transition: 'all 0.15s ease',
    flexWrap: 'wrap',
  },
  avatarFrame: {
    position: 'relative',
    width: '80px',
    height: '80px',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid #334155',
    background: '#0B1120',
    flexShrink: 0,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1E293B',
  },
  placeholderIcon: {
    fontSize: '32px',
    color: '#64748B',
  },
  overlaySpinner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(11, 17, 32, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  spinnerText: {
    fontSize: '11px',
    color: '#38BDF8',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
  promptBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    minWidth: '200px',
  },
  mainPrompt: {
    margin: 0,
    fontSize: '14px',
    color: '#E2E8F0',
    lineHeight: '1.4',
  },
  browseBtn: {
    background: 'none',
    border: 'none',
    color: '#0EA5E9',
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0,
    fontSize: '14px',
    fontFamily: 'inherit',
    textDecoration: 'underline',
  },
  subPrompt: {
    fontSize: '12px',
    color: '#64748B',
    fontWeight: 500,
  },
  hiddenInput: {
    display: 'none',
  },
};