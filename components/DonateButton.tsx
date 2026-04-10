// DonateButton.tsx — Ko-fi donate button with hover photo reveal
import React from 'react';

const KOFI_URL = 'https://ko-fi.com/gmtfractals';

/** Photo: slide+clip intro, scale outro */
const GuyReveal: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const h = compact ? 48 : 64;
  const clipRef = React.useRef<HTMLDivElement>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    const clip = clipRef.current;
    const img = imgRef.current;
    const group = clip?.closest('.group');
    if (!clip || !img || !group) return;

    const onEnter = () => {
      // Reset scale instantly, then slide open
      img.style.transition = 'none';
      img.style.transform = 'scale(1)';
      img.style.transformOrigin = 'bottom center';
      void clip.offsetHeight;
      clip.style.transition = 'max-height 0.35s ease-out';
      clip.style.maxHeight = '100px';
    };
    const onLeave = () => {
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

const PAYPAL_URL = 'https://www.paypal.com/ncp/payment/WHMZWATKN6GEY';

/** Ko-fi + PayPal buttons for modal/panel use */
export const DonateButton: React.FC = () => (
  <div className="flex flex-col gap-2">
    <a
      href={KOFI_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#13C3FF] hover:bg-[#00b0f0] text-white text-xs font-bold transition-colors"
    >
      <img src="https://storage.ko-fi.com/cdn/cup-border.png" alt="" className="h-4 w-auto" />
      Support on Ko-fi
    </a>
    <a
      href={PAYPAL_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#0070ba] hover:bg-[#005ea6] text-white text-xs font-bold transition-colors"
    >
      <img src="https://www.paypalobjects.com/webstatic/icon/pp258.png" alt="" className="h-4 w-auto" />
      Support via PayPal
    </a>
  </div>
);

/** Simple link-style donate button with hover photo reveal */
export const DonateLink: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div className="group relative">
    <GuyReveal compact={compact} />
    <a
      href={KOFI_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded transition-colors font-bold ${
        compact
          ? 'px-3 py-1 text-[11px] bg-[#13C3FF] hover:bg-[#00b0f0] text-white'
          : 'px-3 py-1.5 text-[11px] bg-[#13C3FF] hover:bg-[#00b0f0] text-white'
      }`}
    >
      Support GMT
    </a>
  </div>
);
