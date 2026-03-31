// ============================================================================
// A2A Agent — Prompt Opinion Platform Integration
// CareGap Intelligence Agent
// ============================================================================

import dotenv from 'dotenv';
import { FHIRClient } from '../fhir/client';
import { PatientSummary, CareGap, AIAnalysis } from '../fhir/types';
import { detectCareGaps } from '../gaps/detector';
import { analyzePatient } from '../ai/analyzer';

dotenv.config();

interface SharpContext {
    fhir?: {
        baseUrl?: string;
        patientId?: string;
    };
    auth?: {
        token?: string;
    };
}

interface A2ARequest {
    jsonrpc?: string;
    method?: string;
    id?: string | number;
    params?: {
        message?: string;
        context?: SharpContext;
        [key: string]: unknown;
    };
}

interface A2AResponse {
    jsonrpc: string;
    id: string | number | null;
    result: {
        status: 'completed' | 'failed' | 'pending';
        message: string;
        data?: {
            patientSummary: object;
            careGaps: CareGap[];
            aiAnalysis: AIAnalysis;
            handoffs: object[];
        };
    };
}

/**
 * Process an A2A request through the full care gap pipeline
 */
export async function handleA2ARequest(req: A2ARequest): Promise<A2AResponse> {
    const requestId = req.id || null;
    const sharpCtx = req.params?.context;

    try {
        // Resolve FHIR connection parameters
        const fhirBaseUrl =
            sharpCtx?.fhir?.baseUrl ||
            process.env.FHIR_BASE_URL ||
            'https://hapi.fhir.org/baseR4';

        const patientId =
            sharpCtx?.fhir?.patientId || process.env.FHIR_PATIENT_ID;

        const authToken = sharpCtx?.auth?.token || process.env.FHIR_AUTH_TOKEN;

        if (!patientId) {
            return {
                jsonrpc: '2.0',
                id: requestId,
                result: {
                    status: 'failed',
                    message:
                        'No patient ID provided. Supply via SHARP context (sharpCtx.fhir.patientId) or FHIR_PATIENT_ID env var.',
                },
            };
        }

        // Step 1: Fetch patient data from FHIR
        const fhirClient = new FHIRClient(fhirBaseUrl, authToken);

        const [patient, conditions, observations, medications, immunizations] =
            await Promise.all([
                fhirClient.getPatient(patientId),
                fhirClient.getConditions(patientId),
                fhirClient.getObservations(patientId),
                fhirClient.getMedications(patientId),
                fhirClient.getImmunizations(patientId),
            ]);

        const summary: PatientSummary = {
            patient,
            conditions,
            observations,
            medications,
            immunizations,
            careGaps: [],
        };

        // Step 2: Detect care gaps
        const careGaps = detectCareGaps(summary);
        summary.careGaps = careGaps;

        // Step 3: AI analysis
        const aiAnalysis = await analyzePatient(summary, careGaps);

        // Step 4: Handle scheduler handoffs
        const handoffs: object[] = [];
        for (const action of aiAnalysis.suggestedActions) {
            if (action.assignee === 'scheduler') {
                console.log(
                    `[A2A HANDOFF] Scheduling sub-agent handoff: "${action.action}" — timeframe: ${action.timeframe}`
                );
                handoffs.push({
                    type: 'a2a-sub-agent-handoff',
                    targetAgent: 'scheduling-agent',
                    action: action.action,
                    timeframe: action.timeframe,
                    status: 'pending',
                    note: 'Stub: In production, this would dispatch to a scheduling A2A sub-agent.',
                });
            }
        }

        const patientName = patient.name?.[0]
            ? `${patient.name[0].given?.join(' ') || ''} ${patient.name[0].family || ''}`.trim()
            : 'Unknown';

        return {
            jsonrpc: '2.0',
            id: requestId,
            result: {
                status: 'completed',
                message: `Care gap analysis completed for patient ${patientName}. Found ${careGaps.length} gap(s) with urgency score ${aiAnalysis.urgencyScore}/10.`,
                data: {
                    patientSummary: {
                        id: patientId,
                        name: patientName,
                        gender: patient.gender,
                        birthDate: patient.birthDate,
                    },
                    careGaps,
                    aiAnalysis,
                    handoffs,
                },
            },
        };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        console.error('[A2A Agent Error]', errorMessage);

        return {
            jsonrpc: '2.0',
            id: requestId,
            result: {
                status: 'failed',
                message: `Care gap analysis failed: ${errorMessage}`,
            },
        };
    }
}
