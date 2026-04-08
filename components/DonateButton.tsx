// DonateButton.tsx — PayPal hosted donate button wrapper with hover photo reveal
import React, { useEffect, useRef, useState } from 'react';

const PAYPAL_SDK_SRC = 'https://www.paypal.com/sdk/js?client-id=BAAfzB8VTLfRpVGvukApMACe-CnkEJY7H9a3DJ-IxKOf5Eye1X_Ed8LPBpw1FaZRKFedMi3HuWuEp2M7fo&components=hosted-buttons&disable-funding=venmo&currency=USD';
const HOSTED_BUTTON_ID = 'WHMZWATKN6GEY';
const DONATE_URL = 'https://www.paypal.com/ncp/payment/WHMZWATKN6GEY';

let sdkPromise: Promise<void> | null = null;

/** Load the PayPal SDK script once, shared across all instances */
function loadPayPalSDK(): Promise<void> {
  if (sdkPromise) return sdkPromise;
  if ((window as any).paypal?.HostedButtons) {
    sdkPromise = Promise.resolve();
    return sdkPromise;
  }
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PAYPAL_SDK_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error('Failed to load PayPal SDK'));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

/** Photo: slide+clip intro, scale outro */
const GuyReveal: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const h = compact ? 48 : 64;
  const clipRef = React.useRef<HTMLDivElement>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const timerRef = React.useRef(0);
  const isHovered = React.useRef(false);

  React.useEffect(() => {
    const clip = clipRef.current;
    const img = imgRef.current;
    const group = clip?.closest('.group');
    if (!clip || !img || !group) return;

    const onEnter = () => {
      isHovered.current = true;
      clearTimeout(timerRef.current);
      // Reset scale instantly, then slide open
      img.style.transition = 'none';
      img.style.transform = 'scale(1)';
      img.style.transformOrigin = 'bottom center';
      void clip.offsetHeight;
      clip.style.transition = 'max-height 0.35s ease-out';
      clip.style.maxHeight = '100px';
    };
    const onLeave = () => {
      isHovered.current = false;
      // Scale down from bottom
      img.style.transition = 'transform 0.3s ease-in';
      img.style.transform = 'scale(0)';
      img.style.transformOrigin = 'bottom center';
      // Collapse clip alongside the scale
      clip.style.transition = 'max-height 0.3s ease-in';
      clip.style.maxHeight = '0';
    };

    group.addEventListener('mouseenter', onEnter);
    group.addEventListener('mouseleave', onLeave);
    return () => {
      group.removeEventListener('mouseenter', onEnter);
      group.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div
        ref={clipRef}
        className="overflow-hidden"
        style={{ maxHeight: 0 }}
      >
        <img
          ref={imgRef}
          src="guy.png"
          alt=""
          className="pointer-events-none object-contain"
          style={{ height: h, width: 'auto', transform: 'scale(0)', transformOrigin: 'bottom center' }}
        />
      </div>
      <div className="w-full h-px bg-white/10 mb-1.5" />
    </div>
  );
};

interface DonateButtonProps {
  /** Compact mode for tight spaces (e.g. header bars) */
  compact?: boolean;
}

export const DonateButton: React.FC<DonateButtonProps> = ({ compact = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const renderedRef = useRef(false);

  useEffect(() => {
    if (renderedRef.current) return;
    let cancelled = false;

    loadPayPalSDK()
      .then(() => {
        if (cancelled || !containerRef.current || renderedRef.current) return;
        renderedRef.current = true;
        const paypal = (window as any).paypal;
        if (paypal?.HostedButtons) {
          paypal.HostedButtons({ hostedButtonId: HOSTED_BUTTON_ID })
            .render(containerRef.current)
            .then(() => { if (!cancelled) setState('ready'); })
            .catch(() => { if (!cancelled) setState('error'); });
        } else {
          setState('error');
        }
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });

    return () => { cancelled = true; };
  }, []);

  // Fallback link if SDK fails (e.g. adblocker)
  if (state === 'error') {
    return (
      <div className="group relative">
        <GuyReveal compact={compact} />
        <a
          href={DONATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 rounded transition-colors ${
            compact
              ? 'px-3 py-1 text-[11px] bg-amber-600/80 hover:bg-amber-500 text-white font-bold'
              : 'px-3 py-1.5 text-[11px] bg-amber-600/80 hover:bg-amber-500 text-white font-bold'
          }`}
        >
          Donate via PayPal
        </a>
      </div>
    );
  }

  return (
    <div className="group relative">
      <GuyReveal compact={compact} />
      <div
        ref={containerRef}
        className={`transition-opacity ${state === 'loading' ? 'opacity-40' : 'opacity-100'}`}
        style={compact ? { maxWidth: 160 } : { maxWidth: 220 }}
      />
    </div>
  );
};

/** Simple link-style donate button with hover photo reveal (no PayPal SDK needed) */
export const DonateLink: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div className="group relative">
    <GuyReveal compact={compact} />
    <a
      href={DONATE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded transition-colors font-bold ${
        compact
          ? 'px-3 py-1 text-[11px] bg-amber-600/80 hover:bg-amber-500 text-white'
          : 'px-3 py-1.5 text-[11px] bg-amber-600/80 hover:bg-amber-500 text-white'
      }`}
    >
      Support GMT
    </a>
  </div>
);
