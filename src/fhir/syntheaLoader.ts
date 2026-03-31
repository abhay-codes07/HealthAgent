// ============================================================================
// Synthea Patient Bundle Loader
// Loads synthetic FHIR patient bundles from data/sample-patients/
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import {
    Bundle,
    Patient,
    Condition,
    Observation,
    MedicationRequest,
    Immunization,
    FHIRResource,
    PatientSummary,
    CareGap,
} from './types';

const DATA_DIR = path.resolve(__dirname, '../../data/sample-patients');

/**
 * List all available patient bundle files
 */
export function listPatientFiles(): string[] {
    if (!fs.existsSync(DATA_DIR)) {
        throw new Error(`Sample patients directory not found: ${DATA_DIR}`);
    }
    return fs
        .readdirSync(DATA_DIR)
        .filter((f) => f.endsWith('.json'))
        .map((f) => path.join(DATA_DIR, f));
}

/**
 * Load a patient bundle from a JSON file
 */
export function loadBundle(filePath: string): Bundle {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as Bundle;
}

/**
 * Extract resources of a specific type from a bundle
 */
function extractByType<T extends FHIRResource>(bundle: Bundle, resourceType: string): T[] {
    if (!bundle.entry) return [];
    return bundle.entry
        .filter((e) => e.resource?.resourceType === resourceType)
        .map((e) => e.resource as unknown as T);
}

/**
 * Build a PatientSummary from a bundle file
 */
export function loadPatientSummary(filePath: string): PatientSummary {
    const bundle = loadBundle(filePath);

    const patients = extractByType<Patient>(bundle, 'Patient');
    if (patients.length === 0) {
        throw new Error(`No Patient resource found in bundle: ${filePath}`);
    }

    return {
        patient: patients[0],
        conditions: extractByType<Condition>(bundle, 'Condition'),
        observations: extractByType<Observation>(bundle, 'Observation'),
        medications: extractByType<MedicationRequest>(bundle, 'MedicationRequest'),
        immunizations: extractByType<Immunization>(bundle, 'Immunization'),
        careGaps: [] as CareGap[],
    };
}

/**
 * Load all patient summaries from the data directory
 */
export function loadAllPatients(): PatientSummary[] {
    const files = listPatientFiles();
    return files.map((f) => loadPatientSummary(f));
}
