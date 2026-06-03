/**
 * GenParamSlider — a paletteGenerator scalar param rendered OUTSIDE AutoFeaturePanel
 * (the slot-mod floating panels), using the SAME full ScalarInput component the dock
 * (main mods) uses, so the feel is identical. The param is a hidden DDFS param bound
 * via useGenParam (rides undo/preset/animation); the keyframe diamond goes in the
 * header's `headerRight` slot, which renders to the LEFT of the label.
 *
 * Scalar trackId = `${featureId}.${paramKey}` (see engine/animation/trackBinding).
 */

import React from 'react';
import { ScalarInput } from '../../components/inputs/ScalarInput';
import { KeyframeButton } from '../../components/KeyframeButton';
import { useTrackAnimation } from '../../hooks/useTrackAnimation';
import { useGenParam, genEditStart, genEditEnd } from '../store/generatorStore';

export const GenParamSlider: React.FC<{
  param: string;
  label: string;
  min: number;
  max: number;
  step: number;
  def: number;
}> = ({ param, label, min, max, step, def }) => {
  const [v, setV] = useGenParam<number>(param);
  const value = v ?? def;
  const { status, toggleKey } = useTrackAnimation(`paletteGenerator.${param}`, value, label);
  return (
    <ScalarInput
      value={value}
      onChange={setV}
      onDragStart={genEditStart}
      onDragEnd={genEditEnd}
      min={min}
      max={max}
      step={step}
      defaultValue={def}
      label={label}
      headerRight={<KeyframeButton status={status} onClick={toggleKey} />}
      trackHeight={14}
    />
  );
};

export default GenParamSlider;
