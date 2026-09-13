/**
 * ModifyTogglesControl — the global "mirror / reverse" booleans as one inline
 * toggle pair, nested in the Modify group of the Generator dock tab (registered
 * `palette-modify-toggles`, under the SCALE param via parentId). The two are
 * hidden DDFS params (mirror, reverse) shown here via InlineToggleButtons
 * instead of two full-width ToggleSwitch rows.
 *
 * 2026-09-13: moved from under Phase to under Scale (`repeats`) — the owner: mirror is a
 * tiling control — and given a condition in the feature, because a customUI child with a
 * `parentId` and no condition is shown only while its parent's value is > 0
 * (`checkParamActive`): under Phase that hid mirror / reverse in BOTH hosts until Phase was
 * moved off 0. The labels say which is which: "mirror tiles" runs each tile there and back,
 * "reverse" flips the whole gradient before it is tiled.
 */

import React from 'react';
import { InlineToggleButtons } from './InlineToggleButtons';
import { useGenParam } from '../store/generatorStore';
import { useInputSkin } from '../../components/inputs';

export const ModifyTogglesControl: React.FC = () => {
  const [mirror, setMirror] = useGenParam<boolean>('mirror');
  const [reverse, setReverse] = useGenParam<boolean>('reverse');
  const soft = useInputSkin() === 'soft';
  return (
    <div className={soft ? 'pt-1.5 pb-2' : 'px-2 py-1'}>
      <InlineToggleButtons
        items={[
          { key: 'mirror', label: 'mirror tiles', active: !!mirror, title: 'Each tile runs there and back, so the tiles meet without a seam' },
          { key: 'reverse', label: 'reverse', active: !!reverse, title: 'Flip the whole gradient end for end (before it is tiled)' },
        ]}
        onToggle={(k) => (k === 'mirror' ? setMirror(!mirror) : setReverse(!reverse))}
      />
    </div>
  );
};

export default ModifyTogglesControl;
