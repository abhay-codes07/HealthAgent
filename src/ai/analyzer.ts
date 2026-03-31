// ============================================================================
// AI Analyzer — Claude-powered clinical reasoning engine
// CareGap Intelligence Agent
// ============================================================================

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { PatientSummary, AIAnalysis, CareGap } from '../fhir/types';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompts';

dotenv.config();

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 2000;

/**
 * Create an Anthropic client instance
 */
function createClient(): Anthropic {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'your_key_here') {
        throw new Error(
            'ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.'
        );
    }
    return new Anthropic({ apiKey });
}

/**
 * Build a concise patient summary object for the AI prompt
 */
function buildPatientContext(summary: PatientSummary): object {
    const { patient, conditions, observations, medications, immunizations } = summary;

    const patientName = patient.name?.[0]
        ? `${patient.name[0].given?.join(' ') || ''} ${patient.name[0].family || ''}`.trim()
        : 'Unknown';

    const age = patient.birthDate
        ? Math.floor(
            (Date.now() - new Date(patient.birthDate).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000)
        )
        : null;

    return {
        name: patientName,
        age,
        gender: patient.gender,
        conditions: conditions.map((c) => ({
            code: c.code?.coding?.[0]?.code,
            display: c.code?.text || c.code?.coding?.[0]?.display,
            status: c.clinicalStatus?.coding?.[0]?.code,
            onset: c.onsetDateTime,
        })),
        recentObservations: observations.slice(0, 10).map((o) => ({
            code: o.code?.coding?.[0]?.code,
            display: o.code?.text || o.code?.coding?.[0]?.display,
            value: o.valueQuantity
                ? `${o.valueQuantity.value} ${o.valueQuantity.unit}`
                : o.valueString || (o.component ? 'panel' : undefined),
            date: o.effectiveDateTime,
            components: o.component?.map((comp) => ({
                display: comp.code?.coding?.[0]?.display,
                value: comp.valueQuantity
                    ? `${comp.valueQuantity.value} ${comp.valueQuantity.unit}`
                    : undefined,
            })),
        })),
        activeMedications: medications
            .filter((m) => m.status === 'active')
            .map((m) => ({
                name:
                    m.medicationCodeableConcept?.text ||
                    m.medicationCodeableConcept?.coding?.[0]?.display,
                dosage: m.dosageInstruction?.[0]?.text,
                authoredOn: m.authoredOn,
            })),
        immunizations: immunizations.map((i) => ({
            vaccine: i.vaccineCode?.coding?.[0]?.display,
            date: i.occurrenceDateTime,
        })),
    };
}

/**
 * Analyze a patient's care gaps using Claude AI
 */
export async function analyzePatient(
    summary: PatientSummary,
    careGaps: CareGap[]
): Promise<AIAnalysis> {
    const client = createClient();
    const patientContext = buildPatientContext(summary);
    const userPrompt = buildUserPrompt(patientContext, careGaps);

    const message = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [
            {
                role: 'user',
                content: userPrompt,
            },
        ],
        system: SYSTEM_PROMPT,
    });

    // Extract text content from the response
    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text content in AI response');
    }

    const rawText = textBlock.text.trim();

    // Parse JSON response — handle potential markdown fences
    let jsonStr = rawText;
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
    }

    try {
        const analysis = JSON.parse(jsonStr) as AIAnalysis;

        // Validate required fields
        if (typeof analysis.urgencyScore !== 'number') {
            throw new Error('Missing urgencyScore');
        }
        if (!Array.isArray(analysis.prioritizedGaps)) {
            throw new Error('Missing prioritizedGaps');
        }
        if (typeof analysis.clinicalNote !== 'string') {
            throw new Error('Missing clinicalNote');
        }
        if (typeof analysis.patientLetter !== 'string') {
            throw new Error('Missing patientLetter');
        }
        if (!Array.isArray(analysis.suggestedActions)) {
            throw new Error('Missing suggestedActions');
        }

        return analysis;
    } catch (parseError) {
        throw new Error(
            `Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}\n\nRaw response:\n${rawText.substring(0, 500)}`
        );
    }
}
