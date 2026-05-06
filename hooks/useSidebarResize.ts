import { useCallback } from 'react';
import { useAnimationStore } from '../store/animationStore';

/** Mouse-down handler for the timeline sidebar resize affordance. Used by
 *  TimelineRuler (Dope Sheet mode) and GraphSidebar (Graph mode). */
export const useSidebarResize = () => {
    const setSidebarWidth = useAnimationStore(s => s.setTimelineSidebarWidth);
    return useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startW = useAnimationStore.getState().timelineSidebarWidth;
        const move = (ev: MouseEvent) => setSidebarWidth(startW + (ev.clientX - startX));
        const up = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
            document.body.style.cursor = '';
        };
        document.body.style.cursor = 'col-resize';
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
    }, [setSidebarWidth]);
};
