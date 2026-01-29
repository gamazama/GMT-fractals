
import { useState, useEffect } from 'react';

export const useMobileLayout = () => {
    // Initialize with safe defaults for SSR/first render
    const [isPortrait, setIsPortrait] = useState(typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => {
            setIsPortrait(window.innerHeight > window.innerWidth);
            setIsMobile(window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768);
        };
        window.addEventListener('resize', check);
        check(); // Initial check
        return () => window.removeEventListener('resize', check);
    }, []);

    return { isPortrait, isMobile };
};
