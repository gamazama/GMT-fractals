export { ScalarInput } from './ScalarInput';
export { DraggableNumber } from './primitives/DraggableNumber';
export { 
    formatDisplay, 
    piMapping, 
    linearMapping, 
    createLogMapping,
    getMapping,
    type ValueMapping 
} from './primitives/FormatUtils';
export { useDragValue, useEditMode } from './hooks';
export type {
    DraggableNumberProps,
    ScalarInputProps,
    AxisConfig,
    CustomMapping
} from './types';
export { AXIS_CONFIG } from './types';
