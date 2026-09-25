import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  buildBrocCanonRevisionPayload,
  buildBrocJudgmentPayload,
  buildBrocPrompt,
  buildBrocScene,
  createInitialBrocCanon,
  type BrocHistoryEvent,
  type BrocPracticeContext,
} from '../BROC/practice';
import { STAR_DEFINITIONS } from '../src/lib/stars/star-cohort';

function event(
  eventType: BrocHistoryEvent['eventType'],
  payload: Record<string, unknown>,
  eventId = eventType,
): BrocHistoryEvent {
  return { eventId, eventType, payload, createdAt: '2026-09-25T00:00:00.000Z' };
}

function contextFor(handle: string, recentEvents: BrocHistoryEvent[] = []): BrocPracticeContext {
  const star = STAR_DEFINITIONS.find((item) => item.handle === handle);
  assert.ok(star);
  return { canonEventId: 'canon-1', canon: createInitialBrocCanon(star), recentEvents };
}

test('BROC seeds practice for existing Stars without creating new Star identities', () => {
  const canons = STAR_DEFINITIONS.map(createInitialBrocCanon);
  assert.equal(canons.length, STAR_DEFINITIONS.length);
  assert.equal(new Set(canons.map((canon) => canon.handle)).size, STAR_DEFINITIONS.length);
  assert.ok(canons.every((canon) => canon.medium.name && canon.medium.wayOfThinking));
  assert.ok(canons.every((canon) => canon.medium.name !== 'Synthetic image making'), 'existing Stars need distinct medium relationships');
  assert.ok(canons.every((canon) => canon.visualLanguage.length >= 2 && canon.nextQuestions.length >= 3));
});

test('scene and image brief carry medium, inquiry, and formal decisions', () => {
  const star = STAR_DEFINITIONS.find((item) => item.handle === 'veyrasol');
  assert.ok(star);
  const context = contextFor(star.handle);
  const scene = buildBrocScene(context, 1);
  const prompt = buildBrocPrompt(star, context.canon, scene, context.recentEvents, 1);

  assert.match(prompt, /Artistic position:/);
  assert.match(prompt, /Medium operations:/);
  assert.match(prompt, /Active body of work:/);
  assert.match(prompt, /Formal decision for this work:/);
  assert.match(prompt, /make compositional, spatial, material, and typographic decisions/i);
  assert.match(prompt, /do not treat its existence as approval or doctrine/i);
  assert.match(prompt, /never typeset this brief/i);
  assert.ok(prompt.length <= 3_800);

  for (const definition of STAR_DEFINITIONS) {
    const contextForStar = contextFor(definition.handle);
    const sceneForStar = buildBrocScene(contextForStar, 1);
    const brief = buildBrocPrompt(definition, contextForStar.canon, sceneForStar, [], 1);
    assert.ok(brief.length <= 3_800, `${definition.handle} prompt exceeded the practice context budget`);
    assert.match(brief, /never typeset this brief/i);
  }
});

test('recent scenes advance questions and formal focus without repeating the last two', () => {
  const context = contextFor('ilyx');
  const questions = context.canon.nextQuestions;
  const visualLanguage = context.canon.visualLanguage;
  context.recentEvents = [
    event('scene', { question: questions[1], formalFocus: visualLanguage[1] }, 'scene-2'),
    event('scene', { question: questions[0], formalFocus: visualLanguage[0] }, 'scene-1'),
  ];

  const scene = buildBrocScene(context, 3);
  assert.ok(!questions.slice(0, 2).includes(scene.question));
  assert.ok(!visualLanguage.slice(0, 2).includes(scene.formalFocus));
  assert.equal(scene.preflight.recentQuestionRepeated, false);
  assert.equal(scene.preflight.recentFormalFocusRepeated, false);
  assert.equal(scene.preflight.imageReview, 'pending');
});

test('an explicit director question can create a recorded contradiction without rewriting canon', () => {
  const context = contextFor('morrowkest');
  const question = context.canon.nextQuestions[0];
  context.recentEvents = [
    event('direction', {
      summary: 'Push the portrait toward a more material confrontation.',
      nextQuestion: question,
      productiveContradiction: true,
    }, 'direction-1'),
  ];

  const scene = buildBrocScene(context, 4);
  assert.equal(scene.directiveSource, 'director');
  assert.equal(scene.question, question);
  assert.equal(scene.preflight.inquiryMovement, 'productive-contradiction');
  assert.equal(context.canon.revision, 1);
});

test('judgment and canon revision payloads use bounded allowlists', () => {
  const judgment = buildBrocJudgmentPayload({
    eventType: 'critique',
    summary: 'A useful departure; keep the material question open.',
    disposition: 'experiment',
    nextQuestion: 'What should the next work test?',
    productiveContradiction: true,
    internalDiagnostic: 'must not persist',
  } as never);
  assert.deepEqual(Object.keys(judgment), ['summary', 'nextQuestion', 'disposition', 'productiveContradiction']);
  assert.equal('internalDiagnostic' in judgment, false);
  assert.throws(() => buildBrocJudgmentPayload({ eventType: 'direction', summary: 'No next question' }));
  assert.throws(() => buildBrocJudgmentPayload({
    eventType: 'direction', summary: 'Move forward', nextQuestion: '   ',
  }), /next question/);
  assert.throws(() => buildBrocJudgmentPayload({
    eventType: 'critique', summary: 'Review', disposition: 'rewrite' as never,
  }), /disposition/);

  const canon = createInitialBrocCanon(STAR_DEFINITIONS[0]);
  const revision = buildBrocCanonRevisionPayload({ ...canon, revision: 2 }, 'Reviewed change with a clear history.');
  assert.deepEqual(Object.keys(revision), ['canon', 'rationale']);
  assert.throws(() => buildBrocCanonRevisionPayload({ ...canon, revision: 2 }, ''));
});

test('practice schema stays private and rollback preserves recorded history', () => {
  const migration = readFileSync('supabase/migrations/20260925113752_broc_persistent_star_practice.sql', 'utf8');
  const rollback = readFileSync('supabase/rollbacks/20260925113752_broc_persistent_star_practice.down.sql', 'utf8');
  const store = readFileSync('BROC/store.ts', 'utf8');
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /FORCE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON TABLE private\.galx_star_practice_events[\s\S]*?FROM PUBLIC, anon, authenticated, service_role/);
  assert.match(migration, /BEFORE INSERT OR UPDATE OR DELETE/);
  assert.match(migration, /Only completed Star attempts can become practice candidates/);
  assert.match(store, /pg_advisory_xact_lock/);
  assert.match(store, /canon revision is stale or invalid/);
  assert.match(rollback, /IF EXISTS \(SELECT 1 FROM private\.galx_star_practice_events/);
  assert.match(rollback, /preserve its canon and events instead of dropping the table/);
});
