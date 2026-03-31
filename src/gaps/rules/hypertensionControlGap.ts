// ============================================================================
// HEDIS Rule: Hypertension Control Gap
// Patients with hypertension (I10) whose latest systolic BP > 140
// ============================================================================

import { Condition, Observation, Patient, CareGap } from '../../fhir/types';

const HYPERTENSION_ICD10 = 'I10';
const BP_PANEL_LOINC = '85354-9';
const SYSTOLIC_LOINC = '8480-6';
const SYSTOLIC_THRESHOLD = 140;

export function detectHypertensionControlGap(
    patient: Patient,
    conditions: Condition[],
    observations: Observation[]
): CareGap | null {
    // Check if patient has hypertension
    const hasHypertension = conditions.some((c) =>
        c.code?.coding?.some(
            (coding) =>
                coding.code === HYPERTENSION_ICD10 &&
                coding.system === 'http://hl7.org/fhir/sid/icd-10-cm'
        )
    );

    if (!hasHypertension) return null;

    // Find most recent BP observation
    const bpObs = observations
        .filter((o) =>
            o.code?.coding?.some((coding) => coding.code === BP_PANEL_LOINC)
        )
        .sort((a, b) => {
            const dateA = new Date(a.effectiveDateTime || 0).getTime();
            const dateB = new Date(b.effectiveDateTime || 0).getTime();
            return dateB - dateA;
        });

    const latestBP = bpObs[0];
    if (!latestBP) {
        return {
            type: 'HypertensionControlGap',
            severity: 'high',
            description: `Patient with hypertension has no blood pressure readings on record. HEDIS Controlling High Blood Pressure (CBP) measure requires regular BP monitoring.`,
            recommendation: `Schedule blood pressure check immediately. Assess medication compliance and lifestyle factors.`,
        };
    }

    // Extract systolic component
    const systolicComponent = latestBP.component?.find((c) =>
        c.code?.coding?.some((coding) => coding.code === SYSTOLIC_LOINC)
    );

    const systolicValue = systolicComponent?.valueQuantity?.value;
    if (!systolicValue) return null;

    if (systolicValue <= SYSTOLIC_THRESHOLD) return null;

    // Extract diastolic for the description
    const diastolicComponent = latestBP.component?.find((c) =>
        c.code?.coding?.some((coding) => coding.code === '8462-4')
    );
    const diastolicValue = diastolicComponent?.valueQuantity?.value;
    const bpStr = diastolicValue ? `${systolicValue}/${diastolicValue}` : `${systolicValue}`;

    return {
        type: 'HypertensionControlGap',
        severity: systolicValue >= 160 ? 'high' : 'medium',
        description: `Patient with hypertension has uncontrolled blood pressure (${bpStr} mmHg, systolic >${SYSTOLIC_THRESHOLD}). HEDIS Controlling High Blood Pressure (CBP) measure target: <140/90 mmHg.`,
        lastRelevantDate: latestBP.effectiveDateTime || undefined,
        recommendation: `Review antihypertensive medication regimen. Consider dose adjustment or additional agent. Schedule follow-up BP check in 2-4 weeks. Counsel on sodium restriction, exercise, and weight management.`,
    };
}
