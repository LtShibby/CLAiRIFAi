# CLAiRiFAi

![CLAiRiFAi Banner](assets/CLAiRIFAi-banner.png)

Meeting transcripts → Engineer-ready tickets

A CLI tool that processes meeting transcripts through a 4-stage
Claude Code pipeline to generate structured tickets with acceptance
criteria, confidence scoring, and open questions.

Created by [Matt Wozniak](https://www.linkedin.com/in/matthew-wozniak/)

![Node 22+](https://img.shields.io/badge/node-%3E%3D22-brightgreen)
![TypeScript Strict](https://img.shields.io/badge/typescript-strict-blue)
![Powered by Claude Code](https://img.shields.io/badge/powered%20by-Claude%20Code-blueviolet)

---

## What It Does

CLAiRiFAi takes a raw meeting transcript and runs it through
a 4-stage pipeline:

| Stage        | Input                   | Output                         |
| ------------ | ----------------------- | ------------------------------ |
| **Parse**    | Raw transcript          | Structured segments            |
| **Extract**  | Parsed segments         | Draft tickets + questions      |
| **Clarify**  | Draft tickets           | Reviewed tickets + confidence  |
| **Generate** | Reviewed tickets        | Markdown report with tickets   |

Each stage spawns a fresh `claude --print` subprocess. Outputs
are validated against Zod schemas and persisted to disk between
stages.

## Prerequisites

- **Node.js 22+**
- **Claude Code** installed and authenticated (`claude --version`)

## Install

```bash
npm install -g clairifai
```

Or build from source:

```bash
git clone https://github.com/LtShibby/CLAiRIFAi.git
cd CLAiRiFAi
pnpm install
pnpm build
```

## Usage

### Interactive Mode (recommended)

```bash
clairifai
```

This launches the interactive menu:

```text
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
   Help
   Exit
```

### Selecting a Transcript

When you choose "Process a new transcript", you can either:

- **[B] Browse for file** — opens your OS native file picker (Windows, macOS, Linux)
- **[T] Type a path** — paste or type the file path directly

### Direct Commands

```bash
# Process a transcript directly
clairifai process path/to/transcript.txt

# Continue a previous run
clairifai continue 2026-03-16T10-22-00-sprint-planning

# Push tickets from a completed run
clairifai push 2026-03-16T10-22-00-sprint-planning

# Show help
clairifai help

# Show version
clairifai --version

# Legacy (backward compatible)
clairifai path/to/transcript.txt
```

### Supported Transcript Formats

- **Plain text** — `Speaker: dialogue`
- **SRT** — SubRip subtitle format
- **VTT** — WebVTT subtitle format
- **Markdown** — `.md` files

---

## Application Flows

```text
                        ┌─────────────┐
                        │  clairifai   │
                        └──────┬───────┘
                               │
                   ┌───────────┴──────────┐
                   │  args?               │
                   └───┬─────────────┬────┘
                       │             │
                    no args      has args
                       │             │
                       ▼             ▼
                ┌───────────┐  ┌────────────┐
                │  Welcome  │  │  Command   │
                │  Screen   │  │  Router    │
                └─────┬─────┘  └─────┬──────┘
                      │              │
                      ▼              │
                ┌───────────┐        │
                │ Main Menu │        │
                └─────┬─────┘        │
                      │              │
        ┌────┬────┬───┴───┬────┐     │
        │    │    │       │    │     │
        ▼    ▼    ▼       ▼    ▼     ▼
     Process  Continue  Push  History  Help
```

### Flow 1: Process New Transcript

```text
Select File ──▶ PARSE ──▶ EXTRACT ──▶ CLARIFY ──▶ GENERATE
  │                │          │           │            │
  ▼                ▼          ▼           ▼            ▼
[B] Browse      Segments   Tickets    Reviewed      report.md
[T] Type path   (JSON)     (JSON)     (JSON)        (Markdown)
                   │          │           │            │
                   └──────────┴───────────┴────────────┘
                                    │
                                    ▼
                          .clairifai/runs/<id>/
                          (all outputs versioned)
```

### Flow 2: Continue Previous Run

```text
Run Selector ──▶ Question Prompt ──▶ Re-run Stages 3+4
                                            │
Pick a run        Answer blocking           ▼
with open         questions          Updated report.md
questions                            stage-clarify-v2.json
                                     (version incremented)
```

### Flow 3: Push Tickets

```text
Run Selector ──▶ Push Options ──▶ GitHub / Jira
                                        │
Pick a run        Target: GitHub/Jira   ▼
with tickets      [x] Include           Creates issues
                  incomplete             with labels
```

### Flow 4: View Run History

```text
┌─────────────────────────────────────────────┐
│ Run History — 3 runs total                  │
│                                             │
│ Date        Transcript      Tix  Qs  Status │
│ 2026-03-16  sprint-planning  5    0  ✓ done │
│ 2026-03-16  standup          1    0  ✓ done │
│ 2026-03-15  requirements     3    4  ⏱ open │
│                                             │
│ [↑/↓] scroll  [Esc] back to menu           │
└─────────────────────────────────────────────┘
```

---

## Pipeline Output

Every run creates a folder at `.clairifai/runs/<timestamp>-<name>/`:

```text
.clairifai/runs/2026-03-16T10-22-00-sprint-planning/
├── status.json              # Pipeline progress
├── transcript.txt           # Original input (preserved)
├── versions.json            # Version history manifest
├── stage-parse-v1.json      # Structured segments
├── stage-extract-v1.json    # Extracted tickets (JSON)
├── stage-clarify-v1.json    # Reviewed tickets + questions
├── stage-clarify-v2.json    # After answering questions
├── report.md                # Final formatted report
└── log.txt                  # Subprocess log
```

## Configuration

Configuration lives in `.clairifai.json` at the project root.
Auto-generated with defaults on first run.

```json
{
  "outputFormat": "markdown",
  "timeouts": {
    "parse": 300,
    "extract": 300,
    "clarify": 300,
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

| Key                    | Description                              |
| ---------------------- | ---------------------------------------- |
| `repo`                 | GitHub `owner/repo` for issues (optional)|
| `outputFormat`         | `markdown`, `jira-json`, or `both`       |
| `timeouts`             | Per-stage timeout in seconds             |
| `maxTranscriptTokens`  | Max estimated tokens before rejection    |
| `ticketDefaults`       | Ticket formatting preferences            |
| `confidenceThreshold`  | Minimum confidence to mark as READY      |

## Features

- **Interactive menu** — Arrow-key driven UI with 6 options
- **4-stage pipeline** — Parse → Extract → Clarify → Generate
- **Native file browser** — Browse for files or type/paste a path
- **Large transcript support** — Auto-condenses parse prompt for
  transcripts over 30k characters to stay within output limits
- **Confidence scoring** — HIGH / MEDIUM / LOW with factors
- **Open questions** — BLOCKING / IMPORTANT / NICE_TO_HAVE
- **Clarification loop** — Answer questions, re-run stages 3+4
- **Versioned outputs** — Nothing is overwritten
- **Continue previous runs** — Pick up where you left off
- **Push to GitHub** — Labeled issues from any completed run
- **Run history** — Browse past runs with stats
- **Interactive retry** — Retry with extended timeout or abort
- **Built-in help** — `clairifai help` or Help menu option
- **Version check** — `clairifai --version`
- **Ink terminal UI** — Real-time progress, streaming output
- **Cross-platform** — Windows, macOS, and Linux
- **Injection protection** — External content in XML data tags

## Architecture

```text
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  PARSE   │──▶│ EXTRACT  │──▶│ CLARIFY  │──▶│ GENERATE │
│          │   │          │   │          │   │          │
│Transcript│   │ Tickets  │   │ Open Qs  │   │  Output  │
│   + ID   │   │  Draft   │   │  Check   │   │  Format  │
└──────────┘   └──────────┘   └──────────┘   └──────────┘
     │              │              │              │
     ▼              ▼              ▼              ▼
subprocess 1   subprocess 2  subprocess 3   subprocess 4
claude --print claude --print claude --print claude --print
```

## Tech Stack

- **Runtime:** Node.js 22+
- **Language:** TypeScript (strict mode, ESM)
- **CLI UI:** [Ink](https://github.com/vadimdemedes/ink)
- **Validation:** [Zod](https://zod.dev)
- **LLM:** Claude Code CLI subprocess (`claude --print`)
- **GitHub:** [Octokit](https://github.com/octokit/rest.js)

## Project Structure

```text
src/
  index.tsx              # CLI entry point + command router
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
    manager.ts           # Run folder persistence + listing
    versions.ts          # Version tracking
    progress.ts          # JSONL history
  ui/
    App.tsx              # Pipeline progress view
    Welcome.tsx          # Startup screen with banner
    MainMenu.tsx         # Interactive main menu
    RunSelector.tsx      # Browse + select past runs
    RunHistory.tsx       # Read-only run history table
    ContinueFlow.tsx     # Answer questions + re-run
    PushOptions.tsx      # Target selection + push
    HelpScreen.tsx       # Help / about screen
    StageRow.tsx         # Per-stage status row
    LiveLog.tsx          # Streaming output panel
    QuestionPrompt.tsx   # Interactive Q&A
    TicketPreview.tsx    # Final ticket review
    RetryPrompt.tsx      # Timeout/failure recovery
    TranscriptInput.tsx  # File selection (browse or type)
    file-picker.ts       # Native OS file dialog
  github/
    issues.ts            # GitHub Issue creation
```

## License

VallySeed

---

Created by [Matt Wozniak](https://www.linkedin.com/in/matthew-wozniak/) • Powered by Claude Code
