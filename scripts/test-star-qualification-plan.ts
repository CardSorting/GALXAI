import test from 'node:test';
import assert from 'node:assert/strict';
import { getStarPopulationPlan } from '../src/lib/stars/StarPopulationController';
import {
  STAR_QUALIFICATION_DEFINITIONS,
  STAR_QUALIFICATION_COHORT_KEY,
  STAR_QUALIFICATION_RUN_KEY,
  STAR_QUALIFICATION_V2_COHORT_KEY,
  STAR_QUALIFICATION_V2_RUN_KEY,
} from '../src/lib/stars/star-cohort';
import { STAR_DEFINITIONS } from '../src/lib/stars/star-cohort';
import { STAR_RESIDENCY_COHORT_KEY, STAR_RESIDENCY_RUN_KEY,
  STAR_RESIDENCY_DEFINITIONS, STAR_RESIDENCY_WORKS,
  STAR_RESIDENCY_V2_COHORT_KEY, STAR_RESIDENCY_V2_RUN_KEY,
  STAR_RESIDENCY_V2_DEFINITIONS, STAR_RESIDENCY_V2_WORKS } from '../src/lib/stars/star-residency';
import { buildBrocPrompt, buildBrocScene, createInitialBrocCanon } from '../BROC/practice';

test('production Star qualification is a bounded reuse of four existing identities', () => {
  const plan = getStarPopulationPlan('qualification');
  assert.equal(plan.starCount, 4);
  assert.equal(plan.contentOpportunitiesPerStar, 2);
  assert.equal(plan.maxContentAttempts, 8);
  assert.equal(plan.realGenerationCeiling, 8);
  assert.equal(plan.maxGenerationConcurrency, 2);
  assert.equal(plan.avatarGenerationAttempts, 0);
  assert.equal(plan.schedulesCreated, 0);
  assert.equal(plan.recurringGeneration, false);

  assert.deepEqual(STAR_QUALIFICATION_DEFINITIONS.map((star) => star.handle), ['veyrasol', 'morrowkest', 'soravale', 'ilyx']);
});

test('second residency cannot reuse the closed first batch and retains the twelve-image ceiling', () => {
  const original = getStarPopulationPlan('residency');
  const second = getStarPopulationPlan('residency-v2');
  assert.notEqual(second.cohortKey, original.cohortKey);
  assert.notEqual(second.runKey, original.runKey);
  assert.deepEqual(second, { ...original, cohortKey: STAR_RESIDENCY_V2_COHORT_KEY,
    runKey: STAR_RESIDENCY_V2_RUN_KEY });
  assert.deepEqual(STAR_RESIDENCY_V2_DEFINITIONS.map(star => star.handle),
    STAR_RESIDENCY_DEFINITIONS.map(star => star.handle));
});

test('second residency subjects survive prompt bounds without replacing first-batch directions', () => {
  const prompts = STAR_RESIDENCY_V2_DEFINITIONS.map(star => {
    const work = STAR_RESIDENCY_V2_WORKS.find(candidate => candidate.handle === star.handle)!;
    const first = STAR_RESIDENCY_WORKS.find(candidate => candidate.handle === star.handle)!;
    const canon = createInitialBrocCanon(star);
    const scene = { ...buildBrocScene({ canon, canonEventId: 'fixture', recentEvents: [] }, 1),
      question: work.question, formalFocus: work.formalFocus, directiveSource: 'director' as const };
    const prompt = buildBrocPrompt(star, canon, scene, [], 1);
    assert.ok(prompt.length <= 3800);
    for (const value of [work.brief, work.question, work.formalFocus]) assert.ok(prompt.includes(value));
    for (const field of ['brief', 'question', 'formalFocus', 'title'] as const) assert.notEqual(work[field], first[field]);
    assert.deepEqual(STAR_RESIDENCY_DEFINITIONS.find(candidate => candidate.handle === star.handle)!.persona.creativeDirections,
      [first.brief]);
    return prompt;
  });
  assert.equal(new Set(prompts).size, 12);
  assert.equal(new Set(STAR_RESIDENCY_V2_WORKS.map(work => work.title)).size, 12);
});

test('versioned production Star qualification is fresh and preserves the same hard bounds', () => {
  const original = getStarPopulationPlan('qualification');
  const plan = getStarPopulationPlan('qualification-v2');

  assert.equal(plan.cohortKey, STAR_QUALIFICATION_V2_COHORT_KEY);
  assert.equal(plan.runKey, STAR_QUALIFICATION_V2_RUN_KEY);
  assert.notEqual(plan.cohortKey, STAR_QUALIFICATION_COHORT_KEY);
  assert.notEqual(plan.runKey, STAR_QUALIFICATION_RUN_KEY);
  assert.equal(plan.starCount, 4);
  assert.equal(plan.contentOpportunitiesPerStar, 2);
  assert.equal(plan.maxContentAttempts, 8);
  assert.equal(plan.realGenerationCeiling, 8);
  assert.equal(plan.maxGenerationConcurrency, 2);
  assert.equal(plan.avatarGenerationAttempts, 0);
  assert.equal(plan.schedulesCreated, 0);
  assert.equal(plan.recurringGeneration, false);
  assert.deepEqual(plan, {
    ...original,
    cohortKey: STAR_QUALIFICATION_V2_COHORT_KEY,
    runKey: STAR_QUALIFICATION_V2_RUN_KEY,
  });
});

test('residency uses twelve existing identities with one opportunity and no automatic follow-up', () => {
  const plan = getStarPopulationPlan('residency');
  assert.equal(plan.cohortKey, STAR_RESIDENCY_COHORT_KEY);
  assert.equal(plan.runKey, STAR_RESIDENCY_RUN_KEY);
  assert.equal(plan.starCount, 12);
  assert.equal(plan.contentOpportunitiesPerStar, 1);
  assert.equal(plan.realGenerationCeiling, 12);
  assert.equal(plan.maxContentAttempts, 12);
  assert.equal(plan.maxGenerationConcurrency, 1);
  assert.equal(plan.avatarGenerationAttempts, 0);
  assert.equal(plan.schedulesCreated, 0);
  assert.equal(plan.recurringGeneration, false);
  assert.deepEqual(STAR_RESIDENCY_DEFINITIONS.map(star => star.handle), STAR_DEFINITIONS.map(star => star.handle));
  for (const mode of ['initial', 'refresh', 'refresh-v2', 'retry', 'qualification', 'qualification-v2'] as const) {
    assert.notEqual(plan.cohortKey, getStarPopulationPlan(mode).cohortKey);
    assert.notEqual(plan.runKey, getStarPopulationPlan(mode).runKey);
  }
});

test('each residency brief remains distinct and complete within the bounded practice prompt', () => {
  const prompts = STAR_RESIDENCY_DEFINITIONS.map(star => {
    const work = STAR_RESIDENCY_WORKS.find(candidate => candidate.handle === star.handle)!;
    const canon = createInitialBrocCanon(star);
    const context = { canon, canonEventId: 'fixture', recentEvents: [] };
    const scene = { ...buildBrocScene(context, 1), question: work.question,
      formalFocus: work.formalFocus, directiveSource: 'director' as const };
    const prompt = buildBrocPrompt(star, canon, scene, [], 1);
    assert.ok(prompt.length <= 3800);
    assert.ok(prompt.includes(work.brief), `${star.handle} lost its authored subject`);
    assert.ok(prompt.includes(work.question));
    assert.ok(prompt.includes(work.formalFocus));
    assert.ok(STAR_DEFINITIONS.find(original => original.handle === star.handle)!.persona.creativeDirections.length === 3,
      'residency must not replace the original practice directions');
    return prompt;
  });
  assert.equal(new Set(prompts).size, 12);
  assert.equal(new Set(STAR_RESIDENCY_WORKS.map(work => work.title)).size, 12);
});
