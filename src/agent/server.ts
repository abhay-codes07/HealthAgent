// ============================================================================
// Express Server — A2A Agent Endpoint & Health Check
// CareGap Intelligence Agent
// ============================================================================

import express from 'express';
import dotenv from 'dotenv';
import { handleA2ARequest } from './a2aAgent';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// --- Agent Manifest ---
const AGENT_MANIFEST = {
    name: 'CareGapIntelligenceAgent',
    description:
        'AI-powered care gap detection and patient outreach agent. Reads FHIR R4 patient data, detects care gaps using HEDIS rules, leverages Claude AI for clinical reasoning, generates clinical notes and patient letters, and supports scheduling handoffs.',
    version: '1.0.0',
    capabilities: [
        'care-gap-detection',
        'patient-outreach',
        'scheduling-handoff',
    ],
    inputSchema: {
        type: 'object',
        properties: {
            jsonrpc: { type: 'string', default: '2.0' },
            method: { type: 'string', default: 'analyze' },
            id: { type: ['string', 'number'] },
            params: {
                type: 'object',
                properties: {
                    message: { type: 'string', description: 'Optional message or query' },
                    context: {
                        type: 'object',
                        description: 'SHARP context with FHIR connection details',
                        properties: {
                            fhir: {
                                type: 'object',
                                properties: {
                                    baseUrl: { type: 'string', description: 'FHIR server base URL' },
                                    patientId: { type: 'string', description: 'FHIR Patient resource ID' },
                                },
                            },
                            auth: {
                                type: 'object',
                                properties: {
                                    token: { type: 'string', description: 'Bearer token for FHIR server' },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    endpoint: '/a2a',
    protocol: 'a2a',
};

// --- Routes ---

/**
 * POST /a2a — A2A agent endpoint
 */
app.post('/a2a', async (req, res) => {
    console.log('[A2A] Incoming request:', JSON.stringify(req.body).substring(0, 200));

    try {
        const response = await handleA2ARequest(req.body);
        res.json(response);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[A2A] Unhandled error:', errorMessage);
        res.status(500).json({
            jsonrpc: '2.0',
            id: req.body?.id || null,
            error: { code: -32603, message: `Internal error: ${errorMessage}` },
        });
    }
});

/**
 * GET /health — Health check
 */
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        agent: 'CareGapIntelligenceAgent',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});

/**
 * GET /.well-known/agent.json — Agent manifest for discovery
 */
app.get('/.well-known/agent.json', (_req, res) => {
    res.json(AGENT_MANIFEST);
});

// --- Start server ---
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`\n🏥 CareGap Intelligence Agent is running`);
        console.log(`   Health:   http://localhost:${PORT}/health`);
        console.log(`   A2A:      http://localhost:${PORT}/a2a`);
        console.log(`   Manifest: http://localhost:${PORT}/.well-known/agent.json\n`);
    });
}

export { app };
