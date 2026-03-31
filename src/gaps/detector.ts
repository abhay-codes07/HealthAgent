// ============================================================================
// Care Gap Detection Engine — Orchestrator
// Runs all HEDIS rules against a patient's clinical data
// ============================================================================

import { PatientSummary, CareGap } from '../fhir/types';
import { detectDiabetesA1cGap } from './rules/diabetesA1cGap';
import { detectMammographyGap } from './rules/mammographyGap';
import { detectColorectalScreeningGap } from './rules/colorectalScreeningGap';
import { detectHypertensionControlGap } from './rules/hypertensionControlGap';
import { detectMedicationAdherenceGap } from './rules/medicationAdherenceGap';

/**
 * Run all HEDIS-based care gap rules against a patient's clinical data.
 * Returns an array of detected care gaps sorted by severity.
 */
export function detectCareGaps(summary: PatientSummary): CareGap[] {
    const { patient, conditions, observations, medications } = summary;
    const gaps: CareGap[] = [];

    // Rule 1: Diabetes A1c Monitoring
    const diabetesGap = detectDiabetesA1cGap(patient, conditions, observations);
    if (diabetesGap) gaps.push(diabetesGap);

    // Rule 2: Mammography Screening
    const mammoGap = detectMammographyGap(patient, observations);
    if (mammoGap) gaps.push(mammoGap);

    // Rule 3: Colorectal Cancer Screening
    const colorectalGap = detectColorectalScreeningGap(patient, observations);
    if (colorectalGap) gaps.push(colorectalGap);

    // Rule 4: Hypertension Control
    const htnGap = detectHypertensionControlGap(patient, conditions, observations);
    if (htnGap) gaps.push(htnGap);

    // Rule 5: Medication Adherence
    const medGap = detectMedicationAdherenceGap(patient, medications);
    if (medGap) gaps.push(medGap);

    // Sort by severity: high → medium → low
    const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    gaps.sort(
        (a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3)
    );

    return gaps;
}

/**
 * Human-readable severity label
 */
export function severityEmoji(severity: string): string {
    switch (severity) {
        case 'high':
            return '🔴';
        case 'medium':
            return '🟡';
        case 'low':
            return '🟢';
        default:
            return '⚪';
    }
}
