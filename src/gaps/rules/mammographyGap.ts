// ============================================================================
// HEDIS Rule: Mammography Screening Gap
// Females aged 50–74 with no mammography in the last 24 months
// ============================================================================

import { Observation, Patient, CareGap } from '../../fhir/types';

const MAMMOGRAPHY_LOINCS = ['24606-6', '24605-8', '26346-7', '26347-5', '26349-1'];
const MIN_AGE = 50;
const MAX_AGE = 74;
const MONTHS_THRESHOLD = 24;

function getAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

export function detectMammographyGap(
    patient: Patient,
    observations: Observation[]
): CareGap | null {
    // Only applies to females
    if (patient.gender !== 'female') return null;

    // Check age range
    if (!patient.birthDate) return null;
    const age = getAge(patient.birthDate);
    if (age < MIN_AGE || age > MAX_AGE) return null;

    // Find most recent mammography
    const mammoObs = observations
        .filter((o) =>
            o.code?.coding?.some((coding) =>
                MAMMOGRAPHY_LOINCS.includes(coding.code || '')
            )
        )
        .sort((a, b) => {
            const dateA = new Date(a.effectiveDateTime || 0).getTime();
            const dateB = new Date(b.effectiveDateTime || 0).getTime();
            return dateB - dateA;
        });

    const latestMammo = mammoObs[0];
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - MONTHS_THRESHOLD);

    const lastMammoDate = latestMammo?.effectiveDateTime
        ? new Date(latestMammo.effectiveDateTime)
        : null;

    if (lastMammoDate && lastMammoDate > cutoffDate) {
        return null; // Mammography is current
    }

    return {
        type: 'MammographyGap',
        severity: 'high',
        description: `Female patient aged ${age} has no mammography screening on record within the last ${MONTHS_THRESHOLD} months. HEDIS Breast Cancer Screening (BCS) measure requires biennial mammography for women 50–74.`,
        lastRelevantDate: latestMammo?.effectiveDateTime || undefined,
        recommendation: `Schedule mammography screening immediately. Provide patient education on breast cancer screening importance and early detection benefits.`,
    };
}
