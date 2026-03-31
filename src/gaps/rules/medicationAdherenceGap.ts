// ============================================================================
// HEDIS Rule: Medication Adherence Gap
// Active MedicationRequest with no refill in the last 90 days
// ============================================================================

import { MedicationRequest, Patient, CareGap } from '../../fhir/types';

const DAYS_THRESHOLD = 90;

export function detectMedicationAdherenceGap(
    patient: Patient,
    medications: MedicationRequest[]
): CareGap | null {
    const activeMeds = medications.filter((m) => m.status === 'active');

    if (activeMeds.length === 0) return null;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_THRESHOLD);

    const overdueRefills: string[] = [];

    for (const med of activeMeds) {
        const medName =
            med.medicationCodeableConcept?.text ||
            med.medicationCodeableConcept?.coding?.[0]?.display ||
            'Unknown medication';

        const authoredDate = med.authoredOn ? new Date(med.authoredOn) : null;

        // Check if the supply duration would have run out
        const supplyDays = med.dispenseRequest?.expectedSupplyDuration?.value || 30;
        const repeats = med.dispenseRequest?.numberOfRepeatsAllowed || 0;
        const totalSupplyDays = supplyDays * (repeats + 1);

        if (authoredDate) {
            const expectedEndDate = new Date(authoredDate);
            expectedEndDate.setDate(expectedEndDate.getDate() + totalSupplyDays);

            // If their total supply should have run out by now
            const now = new Date();
            if (expectedEndDate < now) {
                overdueRefills.push(medName);
                continue;
            }

            // If last prescription is more than 90 days old and supply is < 90 days
            if (authoredDate < cutoffDate && supplyDays < DAYS_THRESHOLD) {
                overdueRefills.push(medName);
            }
        }
    }

    if (overdueRefills.length === 0) return null;

    return {
        type: 'MedicationAdherenceGap',
        severity: overdueRefills.length > 1 ? 'high' : 'medium',
        description: `Patient may have medication adherence issues. The following active medications have not been refilled in over ${DAYS_THRESHOLD} days: ${overdueRefills.join(', ')}. HEDIS adherence measures track continuous medication use.`,
        recommendation: `Contact patient to assess medication adherence barriers. Verify prescription refill status with pharmacy. Consider medication synchronization or 90-day supply options.`,
    };
}
