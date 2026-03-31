// ============================================================================
// CareGap Intelligence Agent — CLI Demo
// Loops through all synthetic patients, detects care gaps, and runs AI analysis
// ============================================================================

import dotenv from 'dotenv';
dotenv.config();

import { loadAllPatients } from './fhir/syntheaLoader';
import { detectCareGaps, severityEmoji } from './gaps/detector';
import { analyzePatient } from './ai/analyzer';
import { PatientSummary, AIAnalysis, CareGap } from './fhir/types';

// -- Formatting Helpers (ASCII-safe for Windows PowerShell) ------------------

function getPatientName(summary: PatientSummary): string {
    const name = summary.patient.name?.[0];
    return name
        ? `${name.given?.join(' ') || ''} ${name.family || ''}`.trim()
        : 'Unknown';
}

function getPatientAge(summary: PatientSummary): number | string {
    if (!summary.patient.birthDate) return 'N/A';
    return Math.floor(
        (Date.now() - new Date(summary.patient.birthDate).getTime()) /
        (365.25 * 24 * 60 * 60 * 1000)
    );
}

function printDivider(char = '=', len = 78): void {
    console.log(char.repeat(len));
}

function printHeader(text: string): void {
    console.log();
    printDivider('=');
    console.log(`  ${text}`);
    printDivider('=');
}

function printSubHeader(text: string): void {
    console.log();
    console.log(`  -- ${text} ${'-'.repeat(Math.max(0, 68 - text.length))}`);
}

function severityTag(severity: string): string {
    switch (severity) {
        case 'high': return '[!!!HIGH]';
        case 'medium': return '[ !MEDIUM]';
        case 'low': return '[  LOW]';
        default: return '[UNKNOWN]';
    }
}

// -- Main Demo ---------------------------------------------------------------

interface DemoResult {
    name: string;
    age: number | string;
    gender: string;
    gapCount: number;
    urgencyScore: number;
    gaps: CareGap[];
}

async function runDemo(): Promise<void> {
    console.log(`
  +============================================================+
  |     CareGap Intelligence Agent -- Demo                     |
  |     AI-Powered Care Gap Detection & Patient Outreach       |
  +============================================================+
  `);

    const patients = loadAllPatients();
    console.log(`  Loaded ${patients.length} synthetic patient(s) from data/sample-patients/\n`);

    const results: DemoResult[] = [];

    for (let i = 0; i < patients.length; i++) {
        const summary = patients[i];
        const name = getPatientName(summary);
        const age = getPatientAge(summary);

        printHeader(`Patient ${i + 1}/${patients.length}: ${name}`);
        console.log(`  Age: ${age} | Gender: ${summary.patient.gender} | ID: ${summary.patient.id}`);

        // Detect care gaps
        printSubHeader('Care Gap Detection');
        const gaps = detectCareGaps(summary);
        summary.careGaps = gaps;

        if (gaps.length === 0) {
            console.log('  [OK] No care gaps detected');
        } else {
            for (const gap of gaps) {
                console.log(`  ${severityTag(gap.severity)} ${gap.type}`);
                console.log(`     ${gap.description}`);
                if (gap.lastRelevantDate) {
                    console.log(`     Last relevant date: ${gap.lastRelevantDate}`);
                }
                console.log(`     -> ${gap.recommendation}`);
                console.log();
            }
        }

        // AI Analysis
        printSubHeader('AI Clinical Analysis (Claude)');
        let analysis: AIAnalysis | null = null;

        try {
            analysis = await analyzePatient(summary, gaps);

            console.log(`  URGENCY SCORE: ${analysis.urgencyScore}/10\n`);

            // Prioritized Gaps
            if (analysis.prioritizedGaps.length > 0) {
                console.log('  PRIORITIZED GAPS with Clinical Rationale:');
                for (const pg of analysis.prioritizedGaps) {
                    console.log(`     * [${pg.severity}] ${pg.type}`);
                    console.log(`       ${pg.clinicalRationale}`);
                    console.log();
                }
            }

            // Clinical Note
            printSubHeader('Clinical Note (SOAP Format)');
            console.log(`  ${analysis.clinicalNote.split('\n').join('\n  ')}`);

            // Patient Letter
            printSubHeader('Patient Letter');
            console.log(`  ${analysis.patientLetter.split('\n').join('\n  ')}`);

            // Suggested Actions
            printSubHeader('Suggested Actions');
            for (const action of analysis.suggestedActions) {
                const icon =
                    action.assignee === 'patient'
                        ? '[PATIENT]'
                        : action.assignee === 'provider'
                            ? '[PROVIDER]'
                            : '[SCHEDULER]';
                console.log(`  ${icon} ${action.action}`);
                console.log(`     Timeframe: ${action.timeframe}`);
            }

            results.push({
                name,
                age,
                gender: summary.patient.gender || 'N/A',
                gapCount: gaps.length,
                urgencyScore: analysis.urgencyScore,
                gaps,
            });
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            console.log(`  [WARN] AI analysis skipped: ${errMsg}`);
            results.push({
                name,
                age,
                gender: summary.patient.gender || 'N/A',
                gapCount: gaps.length,
                urgencyScore: 0,
                gaps,
            });
        }
    }

    // -- Summary Table ---------------------------------------------------------
    printHeader('Summary Report');
    console.log();
    console.log(
        '  +--------------------------+-----+--------+------+---------+'
    );
    console.log(
        '  | Patient                  | Age | Gender | Gaps | Urgency |'
    );
    console.log(
        '  +--------------------------+-----+--------+------+---------+'
    );
    for (const r of results) {
        const nameCol = r.name.padEnd(24).substring(0, 24);
        const ageCol = String(r.age).padStart(3);
        const genCol = (r.gender || 'N/A').padEnd(6).substring(0, 6);
        const gapCol = String(r.gapCount).padStart(4);
        const urgCol =
            r.urgencyScore > 0 ? `${r.urgencyScore}/10`.padStart(7) : '  N/A  ';
        console.log(
            `  | ${nameCol} | ${ageCol} | ${genCol} | ${gapCol} | ${urgCol} |`
        );
    }
    console.log(
        '  +--------------------------+-----+--------+------+---------+'
    );

    const totalGaps = results.reduce((s, r) => s + r.gapCount, 0);
    const avgUrgency =
        results.filter((r) => r.urgencyScore > 0).length > 0
            ? (
                results
                    .filter((r) => r.urgencyScore > 0)
                    .reduce((s, r) => s + r.urgencyScore, 0) /
                results.filter((r) => r.urgencyScore > 0).length
            ).toFixed(1)
            : 'N/A';

    console.log(`\n  Total care gaps detected: ${totalGaps}`);
    console.log(`  Average urgency score: ${avgUrgency}`);
    console.log(
        `\n  [OK] Demo complete. ${patients.length} patients analyzed.\n`
    );
}

// Run
runDemo().catch((err) => {
    console.error('Demo failed:', err);
    process.exit(1);
});
