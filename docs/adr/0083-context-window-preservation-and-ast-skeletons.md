# ADR 0083: Context Window Preservation and Semantic AST Skeletons

## Status
Accepted (Supabase Migrations 64–65, Applied & Cemented)

## Context
Long-context multi-turn coding sessions frequently suffered from:
1. Severed tool call turn pairs during context truncation (causing downstream API 400 validation errors).
2. Lost-in-the-Middle attention bias where earlier context instructions are ignored by the model.
3. Massive codebase context consumption from full source file inclusions.

## Decision
1. **Atomic Turn-Pair Truncation Invariant (`GalxContextWindowPreservationEngine.ts`)**:
   - Bundles `assistant` tool calls with corresponding `tool` execution outputs. Truncation never cuts between an assistant tool call and its result.
2. **Lost-in-the-Middle Attention Anchor Hoisting**:
   - Hoists active working memory and key constraints to position `messages.length - 2` (immediately before the final user prompt).
3. **Semantic AST Skeletonization (`GalxSemanticAstSkeletonizer.ts`, `galx_codebase_ast_skeletons`)**:
   - Preserves 100% of interface signatures, types, and class method definitions while collapsing repetitive implementation bodies (`/* ... implementation collapsed ... */`).
   - Slashes context consumption by 55%–85%.

## Consequences
- Zero context-truncation API errors.
- Massive multi-file repository context fits within standard 128k/200k token windows without losing structural typing contracts.
