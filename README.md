# 🏥 CareGap Intelligence Agent

> **AI-powered care gap detection and patient outreach** — Built for [Agents Assemble: The Healthcare AI Endgame](https://devpost.com) hackathon

[![Built with Claude](https://img.shields.io/badge/AI-Claude%20Sonnet%204-blueviolet)](https://anthropic.com)
[![FHIR R4](https://img.shields.io/badge/FHIR-R4-orange)](https://hl7.org/fhir/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green)](https://nodejs.org)
[![A2A Protocol](https://img.shields.io/badge/Protocol-A2A-blue)](https://github.com/google/a2a-spec)

---

## What It Does

The CareGap Intelligence Agent reads **FHIR R4 patient data**, detects **care gaps** using HEDIS clinical rules, leverages **Claude AI** to reason about urgency and generate clinical documentation, and registers as an **A2A agent** on the Prompt Opinion platform.

### Key Features

- 🔍 **5 HEDIS-based care gap rules** — Diabetes A1c, Mammography, Colorectal Screening, Hypertension Control, Medication Adherence
- 🤖 **Claude AI clinical reasoning** — Urgency scoring, prioritized gaps with clinical rationale
- 📝 **Automated documentation** — SOAP-format clinical notes for EHR, plain-language patient letters
- 🔗 **A2A integration** — Prompt Opinion agent manifest, SHARP context support, scheduling sub-agent handoffs
- 📊 **CLI demo** — Full pipeline visualization across 3 synthetic patients

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CareGap Intelligence Agent                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │  FHIR R4     │    │  HEDIS Gap       │    │  Claude AI       │  │
│  │  Client      │───▶│  Detection       │───▶│  Analyzer        │  │
│  │              │    │  Engine           │    │                  │  │
│  │  • Patient   │    │                  │    │  • Urgency Score │  │
│  │  • Condition │    │  • Diabetes A1c  │    │  • Clinical Note │  │
│  │  • Observ.   │    │  • Mammography   │    │  • Patient Letter│  │
│  │  • MedReq    │    │  • Colorectal    │    │  • Actions       │  │
│  │  • Immuniz.  │    │  • Hypertension  │    │                  │  │
│  │              │    │  • Med Adherence │    │                  │  │
│  └──────┬───────┘    └──────────────────┘    └────────┬─────────┘  │
│         │                                             │            │
│         ▼                                             ▼            │
│  ┌──────────────┐                            ┌──────────────────┐  │
│  │  Synthea     │                            │  A2A Agent       │  │
│  │  Loader      │                            │  (Express)       │  │
│  │              │                            │                  │  │
│  │  Local JSON  │                            │  POST /a2a       │  │
│  │  Bundles     │                            │  GET  /health    │  │
│  │              │                            │  GET  /agent.json│  │
│  └──────────────┘                            └──────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
         │                                             │
         ▼                                             ▼
   HAPI FHIR R4                                Prompt Opinion
   Public Server                               A2A Platform
```

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/abhay-codes07/HealthAgent.git
cd HealthAgent
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...your-key-here
FHIR_BASE_URL=https://hapi.fhir.org/baseR4
```

### 3. Run the Demo

```bash
npm run demo
```

This will loop through all 3 synthetic patients, detect care gaps, run AI analysis, and print a formatted report.

### 4. Start the A2A Server

```bash
npm run dev
```

The server starts on port 3000 with:
- `POST /a2a` — A2A agent endpoint
- `GET /health` — Health check
- `GET /.well-known/agent.json` — Agent manifest

---

## Synthetic Patients

| Patient | Age | Key Conditions | Expected Gaps |
|---------|-----|----------------|---------------|
| Elena Martinez | 58F | T2 Diabetes (E11.9), A1c 7.8% (18mo ago) | Diabetes A1c, Medication Adherence |
| Sarah Johnson | 52F | No significant conditions | Mammography, Colorectal Screening |
| Robert Thompson | 65M | Hypertension (I10), BP 158/95 | Hypertension Control, Medication Adherence, Colorectal Screening |

---

## HEDIS Rules Implemented

1. **DiabetesA1cGap** — Diabetes (E11.x) + no HbA1c (LOINC 4548-4) in 12 months
2. **MammographyGap** — Female 50–74 + no mammography in 24 months
3. **ColorectalScreeningGap** — Age 45–75 + no colonoscopy/FOBT in 12 months
4. **HypertensionControlGap** — Hypertension (I10) + systolic BP > 140 mmHg
5. **MedicationAdherenceGap** — Active MedicationRequest + no refill in 90 days

---

## Prompt Opinion / A2A Integration

The agent exposes a standard A2A manifest at `/.well-known/agent.json` with capabilities:

- `care-gap-detection` — Detect HEDIS care gaps from FHIR data
- `patient-outreach` — Generate clinical notes and patient letters
- `scheduling-handoff` — Stub handoff to scheduling sub-agents

### SHARP Context Support

The A2A endpoint accepts SHARP context for dynamic FHIR connection:

```json
{
  "jsonrpc": "2.0",
  "method": "analyze",
  "id": "1",
  "params": {
    "context": {
      "fhir": {
        "baseUrl": "https://your-fhir-server.com/r4",
        "patientId": "12345"
      },
      "auth": {
        "token": "Bearer ..."
      }
    }
  }
}
```

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Node.js 20+** | Runtime |
| **TypeScript** | Type safety |
| **@anthropic-ai/sdk** | Claude AI integration |
| **axios** | FHIR REST client |
| **Express** | A2A server |
| **dotenv** | Config management |

---

## Project Structure

```
HealthAgent/
├── src/
│   ├── fhir/
│   │   ├── types.ts          # FHIR R4 type definitions
│   │   ├── client.ts         # Axios FHIR client
│   │   └── syntheaLoader.ts  # Local bundle loader
│   ├── gaps/
│   │   ├── detector.ts       # Gap detection orchestrator
│   │   └── rules/
│   │       ├── diabetesA1cGap.ts
│   │       ├── mammographyGap.ts
│   │       ├── colorectalScreeningGap.ts
│   │       ├── hypertensionControlGap.ts
│   │       └── medicationAdherenceGap.ts
│   ├── ai/
│   │   ├── prompts.ts        # System prompt
│   │   └── analyzer.ts       # Claude integration
│   ├── agent/
│   │   ├── a2aAgent.ts       # A2A agent logic
│   │   └── server.ts         # Express server
│   └── demo.ts               # CLI demo script
├── data/
│   └── sample-patients/      # Synthetic FHIR bundles
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## Hackathon

Built for **Agents Assemble: The Healthcare AI Endgame** on Devpost.

**Theme**: Leveraging AI agents to improve healthcare quality, close care gaps, and enhance patient engagement through intelligent automation and inter-agent collaboration.

---

## License

MIT
