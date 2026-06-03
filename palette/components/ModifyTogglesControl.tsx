/**
 * ModifyTogglesControl — the global "mirror / reverse" booleans as one inline
 * toggle pair, nested in the Modify group of the Generator dock tab (registered
 * `palette-modify-toggles`, under the Phase param via parentId). The two are
 * hidden DDFS params (mirror, reverse) shown here via InlineToggleButtons
 * instead of two full-width ToggleSwitch rows.
 */

import React from 'react';
import { InlineToggleButtons } from './InlineToggleButtons';
import { useGenParam } from '../store/generatorStore';

export const ModifyTogglesControl: React.FC = () => {
  const [mirror, setMirror] = useGenParam<boolean>('mirror');
  const [reverse, setReverse] = useGenParam<boolean>('reverse');
  return (
    <div className="px-2 py-1">
      <InlineToggleButtons
        items={[
          { key: 'mirror', label: 'mirror', active: !!mirror },
          { key: 'reverse', label: 'reverse', active: !!reverse },
        ]}
        onToggle={(k) => (k === 'mirror' ? setMirror(!mirror) : setReverse(!reverse))}
      />
    </div>
  );
};

export default ModifyTogglesControl;
