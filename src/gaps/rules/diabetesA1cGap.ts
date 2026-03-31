// ============================================================================
// HEDIS Rule: Diabetes A1c Gap
// Patients with diabetes (E11.x) who have not had an HbA1c test in 12 months
// ============================================================================

import { Condition, Observation, Patient, CareGap } from '../../fhir/types';

const DIABETES_ICD10_PREFIX = 'E11';
const A1C_LOINC = '4548-4';
const MONTHS_THRESHOLD = 12;

export function detectDiabetesA1cGap(
    patient: Patient,
    conditions: Condition[],
    observations: Observation[]
): CareGap | null {
    // Check if patient has diabetes (E11.x)
    const hasDiabetes = conditions.some((c) =>
        c.code?.coding?.some(
            (coding) =>
                coding.code?.startsWith(DIABETES_ICD10_PREFIX) &&
                coding.system === 'http://hl7.org/fhir/sid/icd-10-cm'
        )
    );

    if (!hasDiabetes) return null;

    // Find most recent A1c observation
    const a1cObs = observations
        .filter((o) =>
            o.code?.coding?.some((coding) => coding.code === A1C_LOINC)
        )
        .sort((a, b) => {
            const dateA = new Date(a.effectiveDateTime || 0).getTime();
            const dateB = new Date(b.effectiveDateTime || 0).getTime();
            return dateB - dateA;
        });

    const latestA1c = a1cObs[0];
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - MONTHS_THRESHOLD);

    const lastA1cDate = latestA1c?.effectiveDateTime
        ? new Date(latestA1c.effectiveDateTime)
        : null;

    if (lastA1cDate && lastA1cDate > cutoffDate) {
        return null; // A1c is current
    }

    const lastValue = latestA1c?.valueQuantity?.value;
    const valueNote = lastValue ? ` (last value: ${lastValue}%)` : '';

    return {
        type: 'DiabetesA1cGap',
        severity: 'high',
        description: `Patient with Type 2 diabetes has not had an HbA1c test in the last ${MONTHS_THRESHOLD} months${valueNote}. HEDIS Comprehensive Diabetes Care measure requires annual A1c monitoring.`,
        lastRelevantDate: latestA1c?.effectiveDateTime || undefined,
        recommendation: `Schedule HbA1c lab test within 2 weeks. Review current diabetes management plan and medication efficacy.`,
    };
}
