// ============================================================================
// HEDIS Rule: Colorectal Cancer Screening Gap
// Patients aged 45–75 with no colonoscopy or FOBT in the last 12 months
// ============================================================================

import { Observation, Patient, CareGap } from '../../fhir/types';

const COLONOSCOPY_LOINCS = ['28010-7', '18500-9'];
const FOBT_LOINCS = ['29771-3', '27396-1', '58453-2', '57905-2'];
const ALL_SCREENING_LOINCS = [...COLONOSCOPY_LOINCS, ...FOBT_LOINCS];
const MIN_AGE = 45;
const MAX_AGE = 75;
const MONTHS_THRESHOLD = 12;

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

export function detectColorectalScreeningGap(
    patient: Patient,
    observations: Observation[]
): CareGap | null {
    // Check age range
    if (!patient.birthDate) return null;
    const age = getAge(patient.birthDate);
    if (age < MIN_AGE || age > MAX_AGE) return null;

    // Find most recent colonoscopy or FOBT
    const screeningObs = observations
        .filter((o) =>
            o.code?.coding?.some((coding) =>
                ALL_SCREENING_LOINCS.includes(coding.code || '')
            )
        )
        .sort((a, b) => {
            const dateA = new Date(a.effectiveDateTime || 0).getTime();
            const dateB = new Date(b.effectiveDateTime || 0).getTime();
            return dateB - dateA;
        });

    const latestScreening = screeningObs[0];
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - MONTHS_THRESHOLD);

    const lastScreeningDate = latestScreening?.effectiveDateTime
        ? new Date(latestScreening.effectiveDateTime)
        : null;

    if (lastScreeningDate && lastScreeningDate > cutoffDate) {
        return null; // Screening is current
    }

    const neverScreened = !latestScreening;

    return {
        type: 'ColorectalScreeningGap',
        severity: neverScreened ? 'high' : 'medium',
        description: `Patient aged ${age} has ${neverScreened ? 'never had' : 'not had recent'} colorectal cancer screening. HEDIS Colorectal Cancer Screening (COL) measure requires annual FOBT or colonoscopy per guidelines for ages 45–75.`,
        lastRelevantDate: latestScreening?.effectiveDateTime || undefined,
        recommendation: `Schedule colorectal cancer screening. Discuss options: annual FOBT/FIT test, flexible sigmoidoscopy every 5 years, or colonoscopy every 10 years.`,
    };
}
