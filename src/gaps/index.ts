// Care Gap Detection Engine
export { detectCareGaps, severityEmoji } from './detector';
export { detectDiabetesA1cGap } from './rules/diabetesA1cGap';
export { detectMammographyGap } from './rules/mammographyGap';
export { detectColorectalScreeningGap } from './rules/colorectalScreeningGap';
export { detectHypertensionControlGap } from './rules/hypertensionControlGap';
export { detectMedicationAdherenceGap } from './rules/medicationAdherenceGap';
