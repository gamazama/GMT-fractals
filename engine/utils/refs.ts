/**
 * Generic React ref helpers. Engine-shared, no plugin coupling.
 */

import type React from 'react';

/** Merge multiple refs (object or callback) into one ref callback.
 *  Useful when an element already holds a ref and also needs an extra
 *  one — e.g. attaching a tutorial anchor to a button that already has
 *  a forwarded ref for layout measurement. */
export function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined | null>): React.RefCallback<T> {
    return (val: T | null) => {
        for (const ref of refs) {
            if (!ref) continue;
            if (typeof ref === 'function') ref(val);
            else (ref as React.MutableRefObject<T | null>).current = val;
        }
    };
}
