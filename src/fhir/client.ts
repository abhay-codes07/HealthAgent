// ============================================================================
// FHIR R4 Client — Axios-based REST client for HAPI FHIR Server
// CareGap Intelligence Agent
// ============================================================================

import axios, { AxiosInstance } from 'axios';
import {
    Patient,
    Condition,
    Observation,
    MedicationRequest,
    Immunization,
    Bundle,
} from './types';

export class FHIRClient {
    private client: AxiosInstance;
    private baseUrl: string;

    constructor(baseUrl?: string, authToken?: string) {
        this.baseUrl = baseUrl || process.env.FHIR_BASE_URL || 'https://hapi.fhir.org/baseR4';

        const headers: Record<string, string> = {
            'Content-Type': 'application/fhir+json',
            Accept: 'application/fhir+json',
        };

        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        this.client = axios.create({
            baseURL: this.baseUrl,
            headers,
            timeout: 30000,
        });
    }

    /**
     * Fetch a Patient resource by ID
     */
    async getPatient(patientId: string): Promise<Patient> {
        const response = await this.client.get<Patient>(`/Patient/${patientId}`);
        return response.data;
    }

    /**
     * Fetch all Conditions for a patient
     */
    async getConditions(patientId: string): Promise<Condition[]> {
        const response = await this.client.get<Bundle>('/Condition', {
            params: { patient: patientId, _count: 100 },
        });
        return this.extractResources<Condition>(response.data);
    }

    /**
     * Fetch all Observations for a patient
     */
    async getObservations(patientId: string): Promise<Observation[]> {
        const response = await this.client.get<Bundle>('/Observation', {
            params: { patient: patientId, _count: 100 },
        });
        return this.extractResources<Observation>(response.data);
    }

    /**
     * Fetch all MedicationRequests for a patient
     */
    async getMedications(patientId: string): Promise<MedicationRequest[]> {
        const response = await this.client.get<Bundle>('/MedicationRequest', {
            params: { patient: patientId, _count: 100 },
        });
        return this.extractResources<MedicationRequest>(response.data);
    }

    /**
     * Fetch all Immunizations for a patient
     */
    async getImmunizations(patientId: string): Promise<Immunization[]> {
        const response = await this.client.get<Bundle>('/Immunization', {
            params: { patient: patientId, _count: 100 },
        });
        return this.extractResources<Immunization>(response.data);
    }

    /**
     * Extract typed resources from a FHIR Bundle
     */
    private extractResources<T>(bundle: Bundle): T[] {
        if (!bundle.entry) return [];
        return bundle.entry
            .filter((entry) => entry.resource)
            .map((entry) => entry.resource as unknown as T);
    }
}
