
export const collectHelpIds = (target: EventTarget | null): string[] => {
    const ids = new Set<string>();
    let el = target as HTMLElement | null;

    while (el && el !== document.body) {
        if (el.dataset?.helpId) {
            // Support space-separated IDs (e.g. "paramA ui.slider")
            const parts = el.dataset.helpId.split(/\s+/);
            parts.forEach(id => {
                if (id) ids.add(id);
            });
        }
        el = el.parentElement;
    }

    // Convert to array. We might want to reverse it so specific is first? 
    // Set iterates in insertion order. We walked UP the tree, so:
    // [Specific, Parent, Grandparent...]
    // This is usually the desired order for context menus (most relevant first).
    return Array.from(ids);
};
