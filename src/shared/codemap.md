# src/shared/

## Responsibility
Cross-cutting domain model, contracts, and runtime-agnostic rule evaluation primitives.

## Design
- Typed core models (`types.ts`) with Zod runtime validation in `contracts.ts`.
- Deterministic rule execution in `rule-engine.ts` using pure functions over a normalized `RuleContext`.
- Message-level contract ownership in `message-contracts.ts` for extension boundary safety.
- Anti-bot heuristics in `anti-bot.ts` compute backend-engine recommendation.

## Flow
1. Incoming request and artifacts are validated against Zod schemas (`scanRequestSchema`, `scanResultSchema`, etc.).
2. DOM extraction output is fed into `runRules` to produce deterministic `ScanSnapshot`.
3. Snapshot issue lists can be grouped, diffed (`diffSnapshots`), and summarized.
4. Orchestrator and service worker consume typed message and contract helpers to keep transport and computation decoupled.

## Integration
- Imported by every runtime segment: `background`, `content`, `ui`.
- Rule registry and rule sets in `shared/rules*` are the configurable behavior extension points.
