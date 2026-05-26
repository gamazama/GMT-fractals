/**
 * Lifted from PortalDropdown — same IntersectionObserver-gated thumbnail.
 * Defers `<img>` mount until the placeholder enters the viewport, so opening
 * the picker with 40+ entries doesn't decode 40 JPEGs up front.
 *
 * Falls back to transparent on error so a parent icon shows through.
 */

import React, { useEffect, useRef, useState } from 'react';

export const LazyThumbnail = React.memo(function LazyThumbnail({
    id,
    label,
}: {
    id: string;
    label: string;
}) {
    const [isVisible, setIsVisible] = useState(false);
    const [hasError, setHasError] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setIsVisible(true);
                observer.disconnect();
            }
        }, { rootMargin: '50px' });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    if (hasError) return null;

    return (
        <div ref={containerRef} className="w-full h-full">
            {isVisible && (
                <img
                    src={`thumbnails/fractal_${id}.jpg`}
                    alt={label}
                    className="w-full h-full object-cover"
                    onError={() => setHasError(true)}
                    loading="lazy"
                />
            )}
        </div>
    );
});
