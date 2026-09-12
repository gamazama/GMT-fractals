/**
 * NoiseTargetsControl — the inline "lightness / chroma / hue" noise-target
 * toggles, rendered inside the Noise group of the Generator dock tab (registered
 * `palette-noise-targets`, nested under the Frequency param via parentId). The
 * three booleans are hidden DDFS params (noiseL/C/H) shown here as one compact
 * InlineToggleButtons row instead of three full-width ToggleSwitch rows.
 *
 * It is also mounted in GE v2's Adjust face, where it wears the shell's own button language
 * — that is `InlineToggleButtons` reading the input SKIN, not a branch here. This component
 * only decides the padding around the row, which the v2 tray does not want (its bins pad).
 */

import React from 'react';
import { InlineToggleButtons } from './InlineToggleButtons';
import { useInputSkin } from '../../components/inputs';
import { useGenParam } from '../store/generatorStore';

export const NoiseTargetsControl: React.FC = () => {
  const [l, setL] = useGenParam<boolean>('noiseL');
  const [c, setC] = useGenParam<boolean>('noiseC');
  const [h, setH] = useGenParam<boolean>('noiseH');
  const toggle = (key: string) => {
    if (key === 'L') setL(!l);
    else if (key === 'C') setC(!c);
    else setH(!h);
  };
  const soft = useInputSkin() === 'soft';
  return (
    <div className={soft ? 'pt-1.5' : 'px-2 py-1'}>
      <InlineToggleButtons
        label="Targets"
        items={[
          { key: 'L', label: 'lightness', active: !!l },
          { key: 'C', label: 'chroma', active: !!c },
          { key: 'H', label: 'hue', active: !!h },
        ]}
        onToggle={toggle}
      />
    </div>
  );
};

export default NoiseTargetsControl;
