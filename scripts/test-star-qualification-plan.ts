import test from 'node:test';
import assert from 'node:assert/strict';
import { getStarPopulationPlan } from '../src/lib/stars/StarPopulationController';
import { STAR_QUALIFICATION_DEFINITIONS } from '../src/lib/stars/star-cohort';

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
