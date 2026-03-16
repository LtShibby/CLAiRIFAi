<p align="center">
  <img src="assets/CLAiRIFAi-banner.png" alt="CLAiRiFAi Banner" width="100%" />
</p>

<h1 align="center">CLAiRiFAi</h1>

<p align="center">
  <strong>Meeting transcripts → Engineer-ready tickets</strong><br/>
  A CLI tool that processes meeting transcripts through a 4-stage Claude Code pipeline to generate structured tickets with acceptance criteria, confidence scoring, and open questions.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen" alt="Node 22+" />
  <img src="https://img.shields.io/badge/typescript-strict-blue" alt="TypeScript Strict" />
  <img src="https://img.shields.io/badge/powered%20by-Claude%20Code-blueviolet" alt="Powered by Claude Code" />
</p>

---

## What It Does

CLAiRiFAi takes a raw meeting transcript and runs it through a 4-stage pipeline:

| Stage | Input | Output |
|-------|-------|--------|
| **Parse** | Raw transcript (txt/srt/vtt) | Structured segments with speakers, types, timestamps |
| **Extract** | Parsed segments | Draft tickets with acceptance criteria, decisions, open questions |
| **Clarify** | Draft tickets | Quality review, confidence scores, consolidated blocking questions |
| **Generate** | Reviewed tickets | Formatted Markdown report with all tickets |

Each stage spawns a fresh `claude --print` subprocess. Outputs are validated against Zod schemas and persisted to disk between stages.

## Prerequisites

- **Node.js 22+**
- **Claude Code** installed and authenticated (`claude --version`)
- **pnpm** package manager

## Install

```bash
git clone <repo-url>
cd CLAiRiFAi
pnpm install
pnpm build
```

## Usage

```bash
# Process a transcript
pnpm start path/to/transcript.txt

# Or run the built binary directly
node dist/index.js path/to/transcript.txt
```

CLAiRiFAi accepts three transcript formats:

- **Plain text** — `Speaker: dialogue`
- **SRT** — SubRip subtitle format
- **VTT** — WebVTT subtitle format

## Pipeline Output

Every run creates a folder at `.clairifai/runs/<timestamp>-<name>/`:

```
.clairifai/runs/2026-03-16T10-22-00-sprint-planning/
├── status.json              # Pipeline progress
├── transcript.txt           # Original input (preserved)
├── versions.json            # Version history manifest
├── stage-parse-v1.json      # Structured transcript segments
├── stage-extract-v1.json    # Extracted tickets (JSON)
├── stage-clarify-v1.json    # Reviewed tickets + questions
├── report.md                # Final formatted report
└── log.txt                  # Subprocess log
```

## Configuration

Configuration lives in `.clairifai.json` at the project root. Auto-generated with defaults on first run.

```json
{
  "outputFormat": "markdown",
  "timeouts": {
    "parse": 120,
    "extract": 240,
    "clarify": 240,
    "generate": 300
  },
  "maxTranscriptTokens": 100000,
  "ticketDefaults": {
    "userStoryFormat": "as-a-i-want",
    "acceptanceCriteriaFormat": "given-when-then",
    "includeTechnicalNotes": true,
    "includeOutOfScope": true
  },
  "confidenceThreshold": "MEDIUM"
}
```

| Key | Description |
|-----|-------------|
| `repo` | GitHub `owner/repo` for issue creation (optional) |
| `outputFormat` | `markdown`, `jira-json`, or `both` |
| `timeouts` | Per-stage timeout in seconds |
| `maxTranscriptTokens` | Max estimated tokens before rejection |
| `ticketDefaults` | Ticket formatting preferences |
| `confidenceThreshold` | Minimum confidence to mark tickets as READY |

## Features

- **4-stage pipeline** — Parse → Extract → Clarify → Generate
- **Confidence scoring** — Each ticket rated HIGH / MEDIUM / LOW with explicit factors
- **Open questions** — Ambiguities surfaced as BLOCKING / IMPORTANT / NICE_TO_HAVE
- **Clarification loop** — Answer blocking questions interactively, re-run Stage 3
- **Versioned outputs** — Every stage output is versioned, nothing is overwritten
- **Interactive retry** — Timeout or failure? Retry with extended timeout, skip, or abort
- **Ink terminal UI** — Real-time progress, streaming Claude output, keyboard navigation
- **GitHub integration** — Push generated tickets as GitHub Issues (optional)
- **Prompt injection protection** — All external content wrapped in XML data tags

## Architecture

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  PARSE   │─ ─▶│ EXTRACT  │───▶│ CLARIFY  │───▶│ GENERATE │
│          │    │          │    │          │    │          │
│Transcript│    │ Tickets  │    │ Open Qs  │    │  Output  │
│   + ID   │    │  Draft   │    │  Check   │    │  Format  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     │               │               │               │
     ▼               ▼               ▼               ▼
subprocess 1    subprocess 2    subprocess 3    subprocess 4
claude --print  claude --print  claude --print  claude --print
```

## Tech Stack

- **Runtime:** Node.js 22+
- **Language:** TypeScript (strict mode, ESM)
- **CLI UI:** [Ink](https://github.com/vadimdemedes/ink) (React for terminals)
- **Validation:** [Zod](https://zod.dev)
- **LLM:** Claude Code CLI subprocess (`claude --print`)
- **GitHub:** [Octokit](https://github.com/octokit/rest.js) (optional)

## Project Structure

```
src/
  index.tsx              # CLI entry point
  config.ts              # Zod config loading
  types.ts               # All shared types
  errors.ts              # Error catalog
  preflight.ts           # Startup checks
  agent/
    runner.ts            # Pipeline orchestrator
    stage-runner.ts      # Subprocess spawner
    watcher.ts           # Stdout collector
    json-extractor.ts    # Robust JSON extraction
    prompt.ts            # Injection protection helpers
    stages/              # Per-stage prompt builders
    schemas/             # Zod schemas for stage outputs
  state/
    manager.ts           # Run folder + persistence
    versions.ts          # Version tracking
    progress.ts          # JSONL history
  ui/
    App.tsx              # Main pipeline view
    Welcome.tsx          # Startup screen with logo
    StageRow.tsx         # Per-stage status row
    LiveLog.tsx          # Streaming output panel
    QuestionPrompt.tsx   # Interactive Q&A
    TicketPreview.tsx    # Final ticket review
    RetryPrompt.tsx      # Timeout/failure recovery
  github/
    issues.ts            # GitHub Issue creation
```

<p align="center">
  Powered by Claude Code
</p>
