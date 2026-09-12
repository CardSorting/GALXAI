# Product: GALXAI

<!-- impeccable:product-schema 1 -->

## Platform

web

## Overview

GALXAI is an inference platform and governance control plane for model discovery, API access, routing, metering, reliability, and spend operations. Developers build and own the end-user applications and agent runtimes that consume its APIs.

## Primary Users & Jobs to Be Done

- Developers integrate inference into their applications and agents using API keys, compatible endpoints, and SDKs.
- Engineering operators diagnose rejected credentials, exhausted capacity, slow requests, and provider failures without guessing from an aggregate health indicator.
- Finance and operations teams inspect usage and billing through the platform's accounting surfaces. Provider pricing, discounts, and caching savings depend on the actual model, request, and commercial configuration.

## Core Capabilities

The repository contains the Next.js application, SDK integrations, model routing and credential registry, billing and governance modules, Cloudflare Worker implementation, and a capability-aware relay federation. These have separate deployment and authorization boundaries; the presence of a module is not evidence that it is enabled in production.

The relay supplies inference transport with credential eligibility checks, bounded retries, cancellation, request telemetry, and an operator dashboard. Each active shard owns an isolated Docker worker, managed by a supervised host controller. Fresh model capability precedes load selection. It does not execute user tools on the operator's device. Tool use remains a downstream agent capability; compatibility must be evaluated against the implemented request and response contract.

## Constraints & Invariants

- The hosted product centers on models, API configuration, billing, telemetry, and governance. The image studio at `/images` also lets users generate images and manage their personal image library (explicitly restored at user request on 2026-09-10). Destination chat applications remain downstream. The Sites workspace at `/sites` also provides the expressly requested conversation-and-preview authoring surface for simple managed pages.
- Successful authentication defaults to `/models`; explicit protected-route return destinations remain intact.
- Retiring hosted creation UI must preserve inference APIs and SDK capabilities.
- Model interpretation does not grant permission to execute on the relay host. Isolation is an operating-system/container boundary, not a prompt instruction or blanket prohibition of tool-call content.
- Provider rejection, credential expiry, quota cooldown, transport uncertainty, and local saturation must have distinct operator explanations. Unknown provider quota must remain unknown.
- Recovery is bounded. Acceptance is not completion; reconnection is not an exactly-once execution guarantee. Cancellation does not imply a relay-managed refund.
- Do not present unmeasured latency, fixed provider quotas, universal savings, compliance certification, or whole-stack containment as implemented guarantees.
- Use a readable, compact dark operator interface with clear hierarchy, accessible status labels, and useful empty and failure states.

## Current strategy and evidence

[Product Surface Strategy](docs/PRODUCT_SURFACE_STRATEGY.md) and [ADR 0119](docs/adr/0119-inference-first-product-surface-and-client-retirement.md) define the product boundary. The [federation contract](docs/FEDERATION_STRATEGY.md) defines current lifecycle, routing, explicit image compatibility, and bounded recovery. [Architecture](docs/ARCHITECTURE.md) describes the separate runtime paths; the [relay deployment runbook](docs/RELAY_VNEXT_RUNBOOK.md) records the dated deployment evidence and remaining limitations.

## Bounded Sites strategy

[ADRs 0134–0136](docs/adr/README.md) add fixed-price content generation and customer-owned delivery. The provisional $0.05 completion price and rolling account allowance are explicit product assumptions, configurable server-side. Unknown provider quota and expense remain unknown and do not block this mode; real completion and account authorization remain required. The initial authoring contract creates bounded static information pages. ADR 0139 adds the managed browser workspace; the earlier customer-local connection remains optional. Neither path claims an unverified model-provider integration.

Generation and publication are independently controlled; application deployment does not itself activate paid generation or managed hosting. Follow [Sites operations](docs/maintainers/SITES_OPERATIONS.md) for rollout and original-price recovery. Existing image studio, signup credit, general inference pricing and proposed agency-service fees retain their own contracts.

## Browser Sites workspace

[ADR 0139](docs/adr/0139-browser-sites-workspace-and-managed-publishing.md) makes GALX sign-in the onboarding boundary for new managed Sites. `/sites` and `/sites/:id` provide private drafts, conversation edits, previews and management. Username selection occurs at first explicit public publication; the existing worker handles exact-host DNS and TLS. Customer-native delivery remains a separate optional integration. Generation and managed publishing retain independent rollout gates, and this initial authoring surface uses the bounded structured page contract rather than arbitrary application execution.
