/**
 * GmtWordmark — the refined "GMT" vector wordmark (Inter-derived: rounded-left
 * G with a flat top-right shelf, cyan M, T). Replaces the former CSS-text
 * wordmark used on the loading splash and topbar.
 *
 * Source art: assets/gmt-logo-refined.svg (Illustrator export).
 *
 * Size via the `className` height — width scales automatically with the
 * 467:154 aspect ratio (use `w-auto`). Apply the cyan/red glow with a
 * `drop-shadow-[…]` utility on `className`. The accent "M" colour is
 * overridable (`accent`) so the engine-failed splash can tint it red.
 */
import React from 'react';

interface GmtWordmarkProps {
    className?: string;
    /** Fill for the accent "M". Defaults to the app cyan. */
    accent?: string;
    /** Fill for the "G" and "T". Defaults to white. */
    base?: string;
    title?: string;
}

const G_PATH = 'M104.4,92h-25.1v-29.7h56.5v89.1h-50.9c-14.8,0-27.5-.7-38.5-7-11-6.3-19.5-15.1-25.5-26.6-6-11.5-9-25.1-9-40.7s3.2-30.6,9.6-42.1,15.1-18.9,26-24.8,23.2-7.6,36.7-7.6h51.5v33.8l-49.8-.2c-7,0-12.9,1.6-17.6,4.7s-8.4,7.8-10.8,13.8c-2.4,6.1-3.6,13.5-3.6,22.4s1.2,16.2,3.7,22.3c2.5,6.1,6.1,10.7,11,13.8s10.9,4.7,18,4.7h17.7c0,.1,0-25.9,0-25.9Z';
const M_PATH = 'M286.3,45v106.4h39.5V2.6h-62.2l-13.2,46.6c-1.1,4-2.4,8.9-3.9,14.6s-3,11.8-4.6,18.1c-.9,3.4-1.7,6.7-2.5,9.9-.8-3.2-1.6-6.5-2.5-9.9-1.6-6.3-3.2-12.4-4.7-18.1s-2.9-10.6-4-14.6l-13.4-46.6h-62.1v148.9h39.9l-.4-104.6c1.4,5.3,2.8,10.6,4.2,15.9,1.7,6.4,3.3,12.2,4.8,17.6,1.5,5.4,2.8,9.9,3.9,13.5l17.6,57.6h33.6l17.3-57.6c1.1-3.6,2.3-8.1,3.8-13.5s3-11.3,4.6-17.6c1.5-5.9,3-11.8,4.6-17.8';
const T_PATH = 'M338.7,37.7V2.6h116.3v35.2h-37.4v113.7h-41.6V37.7h-37.4Z';

export const GmtWordmark: React.FC<GmtWordmarkProps> = ({
    className,
    accent = '#22d3ee',
    base = '#ffffff',
    title = 'GMT',
}) => (
    <svg
        viewBox="0 0 467 154"
        className={className}
        role="img"
        aria-label={title}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d={G_PATH} fill={base} />
        <path d={M_PATH} fill={accent} />
        <path d={T_PATH} fill={base} />
    </svg>
);
