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
git clone https://github.com/LtShibby/CLAiRIFAi.git
cd CLAiRiFAi
pnpm install
pnpm build
```

## Usage

### Interactive Mode (recommended)

```bash
pnpm start
```

This launches the interactive menu:

```
 ██████╗██╗      █████╗ ██╗██████╗ ██╗███████╗ █████╗ ██╗
██╔════╝██║     ██╔══██╗██║██╔══██╗██║██╔════╝██╔══██╗██║
██║     ██║     ███████║██║██████╔╝██║█████╗  ███████║██║
██║     ██║     ██╔══██║██║██╔══██╗██║██╔══╝  ██╔══██║██║
╚██████╗███████╗██║  ██║██║██║  ██║██║██║     ██║  ██║██║
 ╚═════╝╚══════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═╝╚═╝     ╚═╝  ╚═╝╚═╝

What would you like to do?

 > Process a new transcript
   Continue a previous run
   Push tickets to GitHub/Jira
   View run history
   Exit
```

### Direct Commands

```bash
# Process a transcript directly
pnpm start process path/to/transcript.txt

# Continue a previous run (answer open questions, re-generate)
pnpm start continue 2026-03-16T10-22-00-sprint-planning

# Push tickets from a completed run
pnpm start push 2026-03-16T10-22-00-sprint-planning

# Legacy (backward compatible)
pnpm start path/to/transcript.txt
```

### Supported Transcript Formats

- **Plain text** — `Speaker: dialogue`
- **SRT** — SubRip subtitle format
- **VTT** — WebVTT subtitle format

---

## Application Flows

```
                              ┌─────────────┐
                              │   clairifai  │
                              └──────┬───────┘
                                     │
                         ┌───────────┴───────────┐
                         │  args?                 │
                         └───┬───────────────┬────┘
                             │               │
                          no args        has args
                             │               │
                             ▼               ▼
                      ┌─────────────┐  ┌──────────────────┐
                      │  Welcome    │  │  Command Router   │
                      │  Screen     │  │                   │
                      └──────┬──────┘  │ process <file>    │
                             │         │ continue <run-id> │
                             ▼         │ push <run-id>     │
                      ┌─────────────┐  │ <file> (legacy)   │
                      │  Main Menu  │  └────────┬──────────┘
                      └──────┬──────┘           │
                             │                  │
           ┌─────────┬──────┴───────┬───────┐  │
           │         │              │       │   │
           ▼         ▼              ▼       ▼   │
      ┌─────────┐ ┌────────┐ ┌─────────┐ ┌───────────┐
      │ Process │ │Continue│ │  Push   │ │  Run      │
      │ New     │ │Previous│ │ Tickets │ │  History  │
      └────┬────┘ └───┬────┘ └────┬────┘ └───────────┘
           │          │           │
           ▼          ▼           ▼
```

### Flow 1: Process New Transcript

```
┌──────────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Transcript  │────▶│  PARSE   │────▶│ EXTRACT  │────▶│ CLARIFY  │────▶│ GENERATE │
│  Input       │     │          │     │          │     │          │     │          │
└──────────────┘     │ claude   │     │ claude   │     │ claude   │     │ claude   │
                     │ --print  │     │ --print  │     │ --print  │     │ --print  │
                     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
                          │                │                │                │
                          ▼                ▼                ▼                ▼
                     Structured       Draft Tickets    Reviewed Tix     report.md
                     Transcript       + Questions      + Confidence    + Tickets
                     (JSON)           (JSON)           (JSON)          (Markdown)
                          │                │                │                │
                          └────────────────┴────────────────┴────────────────┘
                                                   │
                                                   ▼
                                         .clairifai/runs/<id>/
                                         (all outputs versioned)
```

### Flow 2: Continue Previous Run

```
┌───────────────┐     ┌──────────────┐     ┌──────────────┐
│  Run Selector │────▶│  Question    │────▶│  Re-run      │
│               │     │  Prompt      │     │  Stages 3+4  │
│  Pick a run   │     │              │     │              │
│  with open    │     │  Answer the  │     │  Clarify v2  │
│  questions    │     │  blocking    │     │  + Generate  │
└───────────────┘     │  questions   │     │  with answers│
                      └──────────────┘     └──────┬───────┘
                                                  │
                                                  ▼
                                          Updated report.md
                                          stage-clarify-v2.json
                                          (version incremented)
```

### Flow 3: Push Tickets

```
┌───────────────┐     ┌──────────────┐     ┌──────────────┐
│  Run Selector │────▶│  Push        │────▶│  GitHub /    │
│               │     │  Options     │     │  Jira        │
│  Pick a run   │     │              │     │              │
│  with tickets │     │  Target:     │     │  Creates     │
└───────────────┘     │  GitHub/Jira │     │  issues with │
                      │              │     │  labels +    │
                      │  [ ] Include │     │  body from   │
                      │  incomplete  │     │  tickets     │
                      └──────────────┘     └──────────────┘
```

### Flow 4: View Run History

```
┌─────────────────────────────────────────────────────────────┐
│  Run History                                                │
│  3 runs total                                               │
│                                                             │
│  Date        Time   Transcript          Tickets  Qs  Status│
│  2026-03-16  14:22  sprint-planning        5      0  ✓ done│
│  2026-03-16  10:05  standup                1      0  ✓ done│
│  2026-03-15  16:30  requirements           3      4  ⏱ open│
│                                                             │
│  [↑/↓] scroll  [Esc] back to menu                          │
└─────────────────────────────────────────────────────────────┘
```

---

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
├── stage-clarify-v2.json    # After answering questions (versioned)
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

- **Interactive menu** — Arrow-key driven UI with 5 main flows
- **4-stage pipeline** — Parse → Extract → Clarify → Generate
- **Confidence scoring** — Each ticket rated HIGH / MEDIUM / LOW with explicit factors
- **Open questions** — Ambiguities surfaced as BLOCKING / IMPORTANT / NICE_TO_HAVE
- **Clarification loop** — Answer blocking questions, re-run stages 3+4 with new version
- **Versioned outputs** — Every stage output is versioned, nothing is overwritten
- **Continue previous runs** — Pick up where you left off, answer open questions
- **Push to GitHub** — Create labeled issues from any completed run
- **Run history** — Browse all past runs with status, ticket counts, question counts
- **Interactive retry** — Timeout or failure? Retry with extended timeout, skip, or abort
- **Ink terminal UI** — Real-time progress, streaming Claude output, keyboard navigation
- **Prompt injection protection** — All external content wrapped in XML data tags

## Architecture

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  PARSE   │───▶│ EXTRACT  │───▶│ CLARIFY  │───▶│ GENERATE │
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
  index.tsx              # CLI entry point + command router
  config.ts              # Zod config loading
  types.ts               # All shared types
  errors.ts              # Error catalog
  preflight.ts           # Startup checks
  agent/
    runner.ts            # Pipeline orchestrator + continue support
    stage-runner.ts      # Subprocess spawner
    watcher.ts           # Stdout collector
    json-extractor.ts    # Robust JSON extraction
    prompt.ts            # Injection protection helpers
    stages/              # Per-stage prompt builders
    schemas/             # Zod schemas for stage outputs
  state/
    manager.ts           # Run folder persistence + listing
    versions.ts          # Version tracking
    progress.ts          # JSONL history
  ui/
    App.tsx              # Pipeline progress view
    Welcome.tsx          # Startup screen with banner
    MainMenu.tsx         # Interactive main menu (5 options)
    RunSelector.tsx      # Browse + select past runs
    RunHistory.tsx       # Read-only run history table
    ContinueFlow.tsx     # Answer questions + re-run stages 3+4
    PushOptions.tsx      # Target selection + push tickets
    StageRow.tsx         # Per-stage status row
    LiveLog.tsx          # Streaming output panel
    QuestionPrompt.tsx   # Interactive Q&A for open questions
    TicketPreview.tsx    # Final ticket review
    RetryPrompt.tsx      # Timeout/failure recovery
    TranscriptInput.tsx  # File path input
  github/
    issues.ts            # GitHub Issue creation via Octokit
```

## License

MIT

---

<p align="center">
  Powered by Claude Code
</p>
