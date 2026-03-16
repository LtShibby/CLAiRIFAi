# CLAiRiFAi

A CLI tool that processes meeting transcripts into engineer-ready tickets via a 4-stage pipeline using Claude Code subprocesses. The initial build (Phases 1–5) is complete. The project is now in active development for new features and refinements.

## Working With This Codebase

- **Do not ask for permission or confirmation.** Just do it.
- **Do not ask clarifying questions.** Make reasonable decisions and document them in code comments.
- **Run and test your code.** After implementing, verify it compiles and works.
- **Commit after milestones.** Use conventional commits (feat:, fix:, chore:, docs:).

## Tech Stack

- Runtime: Node.js 22+
- Language: TypeScript (strict mode, ESM)
- Package manager: pnpm (not npm)
- CLI UI: Ink 5 (React for terminals)
- Validation: Zod
- LLM: Claude Code CLI subprocess (`claude --print`)
- GitHub: Octokit (`@octokit/rest`) for issue creation

## Key Architecture Decisions

- **All imports use `.js` extension** — ESM requirement, even for `.ts` source files.
- **No external UI selection library** — menus use hand-rolled `useInput` + arrow key pattern (see RetryPrompt.tsx, MainMenu.tsx).
- **Each pipeline stage spawns a fresh `claude --print` subprocess** — prompt written to stdin, output collected from stdout, validated against Zod schema.
- **Stage outputs are versioned** — `stage-clarify-v1.json`, `stage-clarify-v2.json`, etc. Nothing is overwritten.
- **Run folders** at `.clairifai/runs/<timestamp>-<name>/` contain all intermediate outputs, the original transcript, and the final report.
- **Config** lives in `.clairifai.json` at project root, validated with Zod, auto-generated with defaults on first run.

## CLI Modes

The CLI is menu-driven by default, with subcommand support:

```
clairifai                        → interactive main menu
clairifai process <transcript>   → run full pipeline
clairifai continue <run-id>      → answer open questions, re-run stages 3+4
clairifai push <run-id>          → push tickets to GitHub
clairifai <transcript>           → legacy backward compat (same as process)
```

Routing logic is in `src/index.tsx` — the `InteractiveApp` component manages a screen state machine.

## Project Structure

```
src/
  index.tsx              # Entry point + command router + InteractiveApp state machine
  config.ts              # Zod config loader (.clairifai.json)
  types.ts               # All shared TypeScript types (pipeline, domain, config, errors, RunSummary)
  errors.ts              # Error catalog with codes, messages, suggestions
  preflight.ts           # Startup checks (Node version, Claude CLI, auth, transcript)

  agent/
    runner.ts            # Pipeline orchestrator: processTranscript() + continueFromClarify()
    stage-runner.ts      # Spawns claude --print, handles timeout/failure, StageCallbacks
    watcher.ts           # OutputWatcher: collects stdout line-by-line for UI streaming
    json-extractor.ts    # Extracts JSON from Claude output (raw, fenced, preamble, balanced braces)
    prompt.ts            # wrapTranscript(), wrapParsedData(), INJECTION_GUARD
    transcript-validator.ts  # Format detection (plain/srt/vtt), word count estimation
    stages/
      parse.ts           # Stage 1 prompt builder
      extract.ts         # Stage 2 prompt builder
      clarify.ts         # Stage 3 prompt builder + buildClarifyPromptWithAnswers()
      generate.ts        # Stage 4 prompt builder
    prompts/             # Re-exports from stages/ (convenience)
    schemas/
      parsed-transcript.ts   # Zod schema for Stage 1 output
      extracted-tickets.ts   # Zod schema for Stage 2 output
      reviewed-tickets.ts    # Zod schema for Stage 3 output
      report-validator.ts    # Markdown structure validation for Stage 4

  state/
    manager.ts           # createRunFolder, writeStatus, writeStageOutput, listRuns, loadStageOutput, getRunFolder
    versions.ts          # Version manifest: load, save, getNextVersion, recordVersion
    progress.ts          # Append-only JSONL history (.clairifai/progress.jsonl)

  ui/
    App.tsx              # Full pipeline view with StageRows + LiveLog + retry + TicketPreview
    Welcome.tsx          # Startup banner (ASCII block letters, any-key continue)
    MainMenu.tsx         # 5-option interactive menu (process/continue/push/history/exit)
    RunSelector.tsx      # Lists runs from .clairifai/runs/, filters by mode (continue/push)
    RunHistory.tsx       # Read-only scrollable table of all past runs
    ContinueFlow.tsx     # Loads previous outputs → QuestionPrompt → re-runs stages 3+4
    PushOptions.tsx      # GitHub/Jira target selection, include-incomplete toggle, push
    StageRow.tsx         # Per-stage status row (icon + label + elapsed time)
    LiveLog.tsx          # Streaming Claude output panel (last N lines)
    QuestionPrompt.tsx   # Interactive Q&A for MULTIPLE_CHOICE / FREEFORM / CONFIRMATION
    TicketPreview.tsx    # Final ticket review with confidence indicators
    RetryPrompt.tsx      # Timeout/failure: retry (1.5x timeout) / skip / abort
    TranscriptInput.tsx  # File path text input

  github/
    issues.ts            # createGitHubIssues() via Octokit with labels and formatted body

fixtures/
  transcripts/           # 4 sample transcripts (standup, planning, ambiguous, conflicting)
  expected/              # Golden output dirs (not yet populated)

assets/
  CLAiRIFAi-logo.png    # Logo (pixel art anvil)
  CLAiRIFAi-banner.png  # Banner (used in README)
```

## Pipeline Flow

1. **Parse** — raw transcript → structured segments with speakers, types, timestamps
2. **Extract** — segments → draft tickets with acceptance criteria, decisions, open questions
3. **Clarify** — tickets → quality review, confidence scores, consolidated blocking questions
4. **Generate** — reviewed tickets → formatted Markdown report

Each stage: spawn `claude --print` → write prompt to stdin → collect stdout → extract JSON → validate with Zod → persist versioned output → next stage.

## Key Functions

- `processTranscript()` in `runner.ts` — full 4-stage pipeline
- `continueFromClarify()` in `runner.ts` — re-run stages 3+4 with user answers
- `runStageWithRetry()` in `runner.ts` — single stage with retry/skip/abort via callback
- `runStage()` in `stage-runner.ts` — low-level subprocess spawn
- `extractJson()` in `json-extractor.ts` — robust JSON extraction from LLM output
- `listRuns()` in `manager.ts` — scan run folders with metadata
- `loadStageOutput()` in `manager.ts` — read versioned stage JSON
- `createGitHubIssues()` in `issues.ts` — push tickets as GitHub Issues

## Quality Checks

Before shipping changes:

- `pnpm build` compiles with zero TypeScript errors
- New functions are tested manually or with a quick script
- Files follow the structure above
- Imports use `.js` extension
- Zod schemas match the Type System in `docs/clairifai-definition-v2.md`

## Reference

- Full spec: `docs/clairifai-definition-v2.md`
- Gitignore source: `docs/clairifai-gitignore`
- Repo: `https://github.com/LtShibby/CLAiRIFAi`
