# CLAIRIFAI

You are building CLAIRIFAI, a CLI tool that processes meeting transcripts into engineer-ready tickets via a 4-stage pipeline using Claude Code subprocesses.

## Autonomous Mode

- **Do not ask for permission or confirmation.** Just do it.
- **Do not ask clarifying questions.** Make reasonable decisions and document them in code comments.
- **Do not stop between phases.** Complete Phase 1, then Phase 2, then Phase 3, etc.
- **Run and test your code.** After implementing each component, verify it works.
- **Commit after milestones.** Use conventional commits (feat:, fix:, chore:).

## Specification

The full implementation spec is at `docs/clairifai-definition-v2.md`. This is your source of truth.

Follow the **Implementation Plan** section exactly. It has 5 phases with numbered steps.

## Tech Stack

- Runtime: Node.js 22+
- Language: TypeScript (strict mode, ESM)
- Package manager: pnpm
- CLI UI: Ink (React for terminals)
- Validation: Zod
- LLM: Claude Code CLI subprocess (`claude --print`)
- GitHub: Octokit (optional, for issue creation)

## Project Structure

```
clairifai/
  src/
    index.tsx
    config.ts
    types.ts
    errors.ts
    preflight.ts
    agent/
      runner.ts
      watcher.ts
      prompt.ts
      json-extractor.ts
      transcript-validator.ts
      stages/
        parse.ts
        extract.ts
        clarify.ts
        generate.ts
      prompts/
        parse.prompt.ts
        extract.prompt.ts
        clarify.prompt.ts
        generate.prompt.ts
      schemas/
        parsed-transcript.ts
        extracted-tickets.ts
        reviewed-tickets.ts
        report-validator.ts
    github/
      issues.ts
    state/
      manager.ts
      versions.ts
      progress.ts
    ui/
      App.tsx
      StageRow.tsx
      LiveLog.tsx
      TranscriptInput.tsx
      QuestionPrompt.tsx
      TicketPreview.tsx
      Welcome.tsx
      RetryPrompt.tsx
  fixtures/
    transcripts/
    expected/
  .clairifai.json
  .gitignore
  package.json
  tsconfig.json
  pnpm-lock.yaml
```

## Implementation Order

1. **Phase 1: Core Pipeline** — Scaffold, errors, preflight, JSON extractor, OutputWatcher, Stage 2
2. **Phase 2: Remaining Stages** — Stages 1, 3, 4, pipeline runner, state manager
3. **Phase 3: CLI + UI** — Ink components, full CLI flow
4. **Phase 4: Clarification Loop** — QuestionPrompt, re-run logic, version tracking
5. **Phase 5: Polish + Integrations** — GitHub issues, Jira output, fixtures, tests

## Quality Checks

Before marking a phase complete:
- [ ] Code compiles with no TypeScript errors
- [ ] Each new function has been tested manually or with a quick script
- [ ] Files are in the correct locations per the structure above

## Notes

- The `.gitignore` content is in `docs/clairifai-gitignore` — copy it to the project root as `.gitignore`
- Use `pnpm` not `npm`
- All imports use `.js` extension (ESM requirement)
- Use Zod schemas exactly as defined in the spec's Type System section

