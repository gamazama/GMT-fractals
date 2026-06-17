// Pattern A shim — see docs/policy/engine-fork-rules.md.
// Re-exports engine-core's HardwareDetection so engine-gmt-relative imports
// (`./HardwareDetection`) resolve without duplicating the implementation.
export * from '../../engine/HardwareDetection';
