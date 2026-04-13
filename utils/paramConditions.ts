
import type { ParamCondition } from '../engine/FeatureSystem';

/** Evaluates a single DDFS param condition against feature slice state */
const evaluateCondition = (condition: ParamCondition, sliceState: any, globalState?: any, parentId?: string): boolean => {
    if (condition.or) {
        return condition.or.some(subCond => evaluateCondition(subCond, sliceState, globalState, parentId));
    }
    if (condition.and) {
        return condition.and.every(subCond => evaluateCondition(subCond, sliceState, globalState, parentId));
    }

    let targetParam = condition.param || parentId;
    let val: any;

    if (targetParam && targetParam.startsWith('$')) {
        const key = targetParam.slice(1);
        if (key.includes('.')) {
            const parts = key.split('.');
            let ptr = globalState;
            for (const part of parts) {
                if (ptr === undefined || ptr === null) { ptr = undefined; break; }
                ptr = ptr[part];
            }
            val = ptr;
        } else {
            val = globalState?.[key];
        }
    } else if (targetParam) {
        val = sliceState[targetParam];
    } else {
        return true;
    }

    if (condition.eq === undefined && condition.neq === undefined && condition.gt === undefined && condition.lt === undefined && condition.bool === undefined) {
         if (typeof val === 'boolean') return val;
         if (typeof val === 'number') return val > 0;
         return !!val;
    }

    if (condition.eq !== undefined || condition.neq !== undefined) {
         let compVal = val;
         if (typeof val === 'object' && val && val.getHexString) compVal = '#' + val.getHexString();
         if (condition.eq !== undefined) return compVal == condition.eq;
         if (condition.neq !== undefined) return compVal != condition.neq;
    }

    if (condition.bool !== undefined) return !!val === condition.bool;
    if (condition.gt !== undefined) return val > condition.gt;
    if (condition.lt !== undefined) return val < condition.lt;

    return true;
};

/** Check if a DDFS param is visible/active given its condition and parent */
export const checkParamActive = (
    condition: ParamCondition | ParamCondition[] | undefined,
    sliceState: any,
    globalState?: any,
    parentId?: string
): boolean => {
    if (!condition) {
        if (parentId) {
            const pVal = sliceState[parentId];
            if (typeof pVal === 'boolean') return pVal;
            if (typeof pVal === 'number') return pVal > 0;
            return !!pVal;
        }
        return true;
    }
    if (Array.isArray(condition)) {
        return condition.every(cond => evaluateCondition(cond, sliceState, globalState, parentId));
    }
    return evaluateCondition(condition, sliceState, globalState, parentId);
};
