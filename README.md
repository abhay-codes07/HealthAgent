# CareGap Intelligence Agent

> AI-powered care gap detection and patient outreach using FHIR R4 + Claude AI

## Overview

The CareGap Intelligence Agent reads FHIR R4 patient data, detects care gaps using HEDIS-based clinical rules, leverages Claude AI for clinical reasoning and patient communication, and integrates as an A2A agent on the Prompt Opinion platform.

## Quick Start

```bash
git clone https://github.com/abhay-codes07/HealthAgent.git
cd HealthAgent
npm install
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
npm run demo
```

## Project Structure

```
src/
├── fhir/          # FHIR R4 client and type definitions
├── gaps/          # HEDIS-based care gap detection rules
├── ai/            # Claude AI reasoning and prompt layer
└── agent/         # A2A agent and Express server
data/
└── sample-patients/  # Synthetic FHIR patient bundles
```

## Tech Stack

- **Runtime**: Node.js 20+, TypeScript
- **AI**: Claude (via @anthropic-ai/sdk)
- **FHIR**: Axios client against HAPI FHIR R4
- **Server**: Express.js
- **Config**: dotenv

## License

MIT
