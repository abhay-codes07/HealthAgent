// ============================================================================
// FHIR R4 Type Definitions
// CareGap Intelligence Agent — Healthcare AI Hackathon
// ============================================================================

export interface FHIRResource {
    resourceType: string;
    id?: string;
    meta?: {
        lastUpdated?: string;
        versionId?: string;
    };
}

export interface HumanName {
    use?: string;
    family?: string;
    given?: string[];
    prefix?: string[];
    suffix?: string[];
}

export interface Address {
    use?: string;
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
}

export interface ContactPoint {
    system?: string;
    value?: string;
    use?: string;
}

export interface Coding {
    system?: string;
    code?: string;
    display?: string;
}

export interface CodeableConcept {
    coding?: Coding[];
    text?: string;
}

export interface Reference {
    reference?: string;
    display?: string;
}

export interface Period {
    start?: string;
    end?: string;
}

export interface Quantity {
    value?: number;
    unit?: string;
    system?: string;
    code?: string;
}

// --- Patient ---
export interface Patient extends FHIRResource {
    resourceType: 'Patient';
    name?: HumanName[];
    gender?: 'male' | 'female' | 'other' | 'unknown';
    birthDate?: string;
    address?: Address[];
    telecom?: ContactPoint[];
    maritalStatus?: CodeableConcept;
}

// --- Condition ---
export interface Condition extends FHIRResource {
    resourceType: 'Condition';
    subject?: Reference;
    code?: CodeableConcept;
    clinicalStatus?: CodeableConcept;
    verificationStatus?: CodeableConcept;
    category?: CodeableConcept[];
    onsetDateTime?: string;
    recordedDate?: string;
}

// --- Observation ---
export interface Observation extends FHIRResource {
    resourceType: 'Observation';
    status?: string;
    category?: CodeableConcept[];
    code?: CodeableConcept;
    subject?: Reference;
    effectiveDateTime?: string;
    valueQuantity?: Quantity;
    valueCodeableConcept?: CodeableConcept;
    valueString?: string;
    component?: ObservationComponent[];
}

export interface ObservationComponent {
    code?: CodeableConcept;
    valueQuantity?: Quantity;
    valueCodeableConcept?: CodeableConcept;
    valueString?: string;
}

// --- MedicationRequest ---
export interface MedicationRequest extends FHIRResource {
    resourceType: 'MedicationRequest';
    status?: string;
    intent?: string;
    medicationCodeableConcept?: CodeableConcept;
    medicationReference?: Reference;
    subject?: Reference;
    authoredOn?: string;
    dosageInstruction?: DosageInstruction[];
    dispenseRequest?: DispenseRequest;
}

export interface DosageInstruction {
    text?: string;
    timing?: {
        repeat?: {
            frequency?: number;
            period?: number;
            periodUnit?: string;
        };
    };
    doseAndRate?: {
        doseQuantity?: Quantity;
    }[];
}

export interface DispenseRequest {
    validityPeriod?: Period;
    numberOfRepeatsAllowed?: number;
    quantity?: Quantity;
    expectedSupplyDuration?: {
        value?: number;
        unit?: string;
    };
}

// --- Immunization ---
export interface Immunization extends FHIRResource {
    resourceType: 'Immunization';
    status?: string;
    vaccineCode?: CodeableConcept;
    patient?: Reference;
    occurrenceDateTime?: string;
    occurrenceString?: string;
    primarySource?: boolean;
}

// --- Bundle ---
export interface Bundle extends FHIRResource {
    resourceType: 'Bundle';
    type?: string;
    total?: number;
    entry?: BundleEntry[];
    link?: BundleLink[];
}

export interface BundleEntry {
    fullUrl?: string;
    resource?: FHIRResource;
}

export interface BundleLink {
    relation?: string;
    url?: string;
}

// --- Care Gap Result ---
export interface CareGap {
    type: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
    lastRelevantDate?: string;
    recommendation: string;
}

// --- AI Analysis Result ---
export interface SuggestedAction {
    action: string;
    timeframe: string;
    assignee: 'patient' | 'provider' | 'scheduler';
}

export interface PrioritizedGap {
    type: string;
    severity: string;
    clinicalRationale: string;
    recommendation: string;
}

export interface AIAnalysis {
    urgencyScore: number;
    prioritizedGaps: PrioritizedGap[];
    clinicalNote: string;
    patientLetter: string;
    suggestedActions: SuggestedAction[];
}

// --- Patient Summary (for AI input) ---
export interface PatientSummary {
    patient: Patient;
    conditions: Condition[];
    observations: Observation[];
    medications: MedicationRequest[];
    immunizations: Immunization[];
    careGaps: CareGap[];
}
