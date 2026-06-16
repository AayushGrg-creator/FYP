import React, { useState, useEffect } from 'react';

/**
 * KhaltiPayButton Component
 * Path: client/src/components/finances/KhaltiPayButton.jsx
 * * Integrates the official Khalti Web SDK payment portal into milestones.
 * Tracks local processing transaction hooks and enforces strict client-side validation.
 */
export default function KhaltiPayButton({ 
  amountInNpr = 0, 
  milestoneId = '', 
  contractTitle = 'Project Milestone',
  onPaymentSuccess, 
  onPaymentError 
}) {
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Injection Track: Dynamically Link Khalti Web Script ──
  useEffect(() => {
    const scriptId = 'khalti-checkout-sdk-script';
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      setIsSdkLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://khalti.s3.ap-south-1.amazonaws.com/khalti-checkout-web/2.0.1/khalti-checkout.iff.js';
    script.async = true;
    
    script.onload = () => setIsSdkLoaded(true);
    script.onerror = () => {
      console.error('Failed to initialize Khalti Payment Integration pipeline.');
      setIsSdkLoaded(false);
    };

    document.body.appendChild(script);

    return () => {
      // Clean up script safely if the component unmounts
      const targetedScript = document.getElementById(scriptId);
      if (targetedScript) targetedScript.remove();
    };
  }, []);

  // ── Core SDK Configuration & Trigger Logic ──
  const handleKhaltiPayment = () => {
    if (!isSdkLoaded || isProcessing) return;

    // Khalti operates entirely in Paisa denominations (1 NPR = 100 Paisa)
    const amountInPaisa = Math.round(amountInNpr * 100);

    if (amountInPaisa <= 0) {
      if (onPaymentError) onPaymentError('Transaction parameter must sit above baseline 0 NPR.');
      return;
    }

    setIsProcessing(true);

    const config = {
      // Replace with your actual Khalti Live or Test Public Key via environment variables
      publicKey: process.env.REACT_APP_KHALTI_PUBLIC_KEY || 'test_public_key_sample_token_abc123',
      productIdentity: milestoneId || `fallback-id-${Date.now()}`,
      productName: contractTitle.length > 50 ? `${contractTitle.substring(0, 47)}...` : contractTitle,
      productUrl: window.location.href,
      paymentPreference: [
        'KHALTI',
        'EBANKING',
        'MOBILE_BANKING',
        'CONNECT_IPS'
      ],
      eventHandler: {
        onSuccess(payload) {
          // Payload contains: { token, amount, mobile, product_identity, product_name, transaction_id }
          setIsProcessing(false);
          if (onPaymentSuccess) {
            onPaymentSuccess(payload);
          }
        },
        onError(errorData) {
          setIsProcessing(false);
          console.error('Khalti Gateway Exception Context:', errorData);
          if (onPaymentError) {
            onPaymentError(errorData);
          }
        },
        onClose() {
          setIsProcessing(false);
        }
      }
    };

    try {
      const checkout = new window.KhaltiCheckout(config);
      checkout.show({ amount: amountInPaisa });
    } catch (err) {
      setIsProcessing(false);
      console.error('Khalti Initialization failure:', err);
      if (onPaymentError) onPaymentError(err.message);
    }
  };

  return (
    <button
      type="button"
      onClick={handleKhaltiPayment}
      disabled={!isSdkLoaded || isProcessing}
      style={{
        ...styles.paymentBtn,
        ...((!isSdkLoaded || isProcessing) ? styles.disabledBtn : {})
      }}
    >
      <span style={styles.icon}>💳</span>
      {isProcessing ? 'Verifying Checkout Protocol...' : `Pay with Khalti (Rs. ${amountInNpr.toLocaleString('en-NP')})`}
    </button>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  paymentBtn: {
    background: '#5C2D91', // Signature Khalti Brand Violet Purple Layer
    color: '#ffffff',
    border: '1px solid #4A1E73',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14.5px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    boxSizing: 'border-box',
    width: '100%',
    transition: 'background 0.15s ease, transform 0.1s ease',
    boxShadow: '0 4px 14px rgba(92, 45, 145, 0.25)',
  },
  disabledBtn: {
    background: '#1E293B',
    borderColor: '#334155',
    color: '#64748B',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  icon: {
    fontSize: '16px',
  }
};