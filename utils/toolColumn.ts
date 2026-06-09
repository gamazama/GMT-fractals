/**
 * Balanced reflow for the graph editors' vertical tool-button columns.
 *
 * Both the timeline GraphToolbar and the gradient ChannelGraphEditor stack their
 * tool buttons in an `absolute … flex flex-col flex-wrap content-start` column.
 * Give that column this `maxHeight` and CSS wrap does the rest: when the buttons
 * are taller than the plot they spill into a second (then third…) column — but
 * split EVENLY (ceil(count / columns) per column) rather than greedily packing the
 * first column full and leaving a lone button in the next.
 */
export const TOOL_BTN_PITCH = 28; // 24px button + 4px gap

export const balancedToolColumnMaxHeight = (
  count: number,
  availableHeight: number,
  pitch: number = TOOL_BTN_PITCH,
): number => {
  const avail = Math.max(pitch, availableHeight);
  // How many buttons actually fit in one column (floor — a partial slot can't hold one).
  const perColFit = Math.max(1, Math.floor(avail / pitch));
  if (count <= perColFit) return count * pitch; // fits in one column
  // Spread evenly across the minimum number of columns; perColumn ≤ perColFit so the
  // returned height never exceeds `avail` (no overflow past the plot).
  const columns = Math.ceil(count / perColFit);
  const perColumn = Math.ceil(count / columns);
  return perColumn * pitch;
};
