import { getStarSeriesList } from '../src/lib/stars/star-domain';
import { buildStarPrompt, type StarDefinition } from '../src/lib/stars/star-cohort';

export const BROC_PRACTICE_VERSION = 1;
export const BROC_CONTEXT_EVENT_LIMIT = 16;
export const BROC_MAX_PROMPT_LENGTH = 3_800;

export type BrocEventType =
  | 'canon'
  | 'canon_revision'
  | 'direction'
  | 'scene'
  | 'candidate'
  | 'critique'
  | 'discovery'
  | 'rejection'
  | 'selection';

export interface BrocBodyOfWork {
  id: string;
  title: string;
  inquiry: string;
  status: 'active' | 'complete' | 'archived' | 'developing';
}

export interface BrocMedium {
  name: string;
  wayOfThinking: string;
  operations: string[];
  boundary: string;
}

export interface BrocCanon {
  version: number;
  revision: number;
  handle: string;
  displayName: string;
  artistStatement: string;
  artisticPosition: string;
  medium: BrocMedium;
  bodiesOfWork: BrocBodyOfWork[];
  activeBodyId: string;
  visualLanguage: string[];
  invariants: string[];
  nextQuestions: string[];
  influences: string[];
}

export interface BrocHistoryEvent {
  eventId: string;
  eventType: Exclude<BrocEventType, 'canon' | 'canon_revision'>;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface BrocPracticeContext {
  canonEventId: string;
  canon: BrocCanon;
  recentEvents: BrocHistoryEvent[];
}

export interface BrocScenePlan {
  version: number;
  bodyId: string;
  bodyTitle: string;
  question: string;
  mediumOperation: string;
  formalFocus: string;
  directiveSource: 'practice' | 'director';
  preflight: {
    recentQuestionRepeated: boolean;
    recentFormalFocusRepeated: boolean;
    inquiryMovement: 'advance' | 'deepen' | 'productive-contradiction';
    imageReview: 'pending';
  };
}

interface PracticeSeed {
  artisticPosition: string;
  medium: BrocMedium;
  visualLanguage: string[];
  invariants: string[];
  nextQuestions: string[];
}

const PRACTICE_SEEDS: Record<string, PracticeSeed> = {
  veyrasol: {
    artisticPosition: 'Public architecture is a form of shared memory. A space matters through the lives and crossings it permits, not only through its silhouette.',
    medium: {
      name: 'Synthetic architectural image studies',
      wayOfThinking: 'Build the image as a spatial proposition: thresholds, circulation, scale, and light should explain how a place is inhabited.',
      operations: ['layered thresholds', 'measured perspective', 'small human figures as scale evidence', 'light that reveals circulation'],
      boundary: 'Luminous architecture should remain legible as civic space rather than become an ornamental skyline.',
    },
    visualLanguage: ['Let a displaced focal point pull the eye through a public route.', 'Use ornament only when it carries structural or communal meaning.', 'Withhold color where shadow, material, or scale should do the explaining.'],
    invariants: ['Keep the image human in scale even when its architecture is monumental.', 'Make the space feel usable by people who are not shown as spectacle.'],
    nextQuestions: ['What makes a shared threshold feel publicly owned?', 'How can a transit space hold memory without becoming a monument?', 'When does a civic structure feel grown into its neighborhood?'],
  },
  morrowkest: {
    artisticPosition: 'A portrait is evidence of a self that may never have existed. Memory can alter a face without making the person disappear.',
    medium: {
      name: 'Synthetic portrait photography',
      wayOfThinking: 'Treat the frame as unreliable evidence: pose, focus, reflection, and exposure should disagree with precision.',
      operations: ['portrait framing', 'selective focus', 'delayed reflections', 'controlled shadow detail'],
      boundary: 'Dream logic must remain attached to a recognizable human presence; distortion alone is not meaning.',
    },
    visualLanguage: ['Let one reflection arrive out of time with the face.', 'Use negative space to hold what the portrait cannot verify.', 'Reserve the sharpest contrast for the feature that carries the question.'],
    invariants: ['Preserve a specific human presence inside the surreal construction.', 'Do not use darkness as a substitute for emotional structure.'],
    nextQuestions: ['What changes when a reflection remembers a different face?', 'Can a portrait show two moments without splitting the subject?', 'Which detail makes an impossible memory feel privately true?'],
  },
  soravale: {
    artisticPosition: 'Living systems are collaborators with their surroundings. Growth is relational, vulnerable, and never perfectly decorative.',
    medium: {
      name: 'Synthetic botanical field studies',
      wayOfThinking: 'Construct an image like a field observation whose crop, scale, and sequence reveal ecological relationships.',
      operations: ['specimen-like framing', 'visible growth stages', 'overlapping habitats', 'negative space as breathing room'],
      boundary: 'A plant form must participate in an ecosystem; isolated botanical beauty is not enough.',
    },
    visualLanguage: ['Repeat a living form with meaningful variation rather than pattern fill.', 'Use translucency to show relation between layers.', 'Let damage, adaptation, or decay carry equal weight with bloom.'],
    invariants: ['Keep growth patient and specific.', 'Show interdependence rather than treating nature as a backdrop.'],
    nextQuestions: ['What does an ecosystem preserve after a disturbance?', 'How can a single plant form reveal a wider network of dependence?', 'When does repetition become evidence of adaptation?'],
  },
  ilyx: {
    artisticPosition: 'Geometry can behave like a score: repetition establishes rhythm, while a precise deviation changes the whole system.',
    medium: {
      name: 'Generative geometric composition',
      wayOfThinking: 'Treat each shape, interval, and color block as a timed event in a visual score.',
      operations: ['measured repetition', 'interval changes', 'color separation', 'asymmetric balance'],
      boundary: 'A pattern must contain a consequential variation; decorative regularity alone is unresolved.',
    },
    visualLanguage: ['Let spacing carry rhythm before adding more forms.', 'Use color as a structural event with a clear role.', 'Make asymmetry resolve through measured counterweight.'],
    invariants: ['Preserve a readable compositional rule.', 'Allow a single formal break to redirect the whole field.'],
    nextQuestions: ['How little can change before a visual rhythm becomes a new one?', 'Can a color interval function like silence in a score?', 'What happens when the most stable shape is moved off the grid?'],
  },
  nemiorra: {
    artisticPosition: 'Underwater images can act as records of events that never occurred. The work should make its invented evidence internally coherent.',
    medium: {
      name: 'Synthetic underwater photography',
      wayOfThinking: 'Use lens distance, water depth, suspended particles, and light falloff as evidence of a plausible event.',
      operations: ['layered water depth', 'light attenuation', 'motion trails', 'ambiguous scale'],
      boundary: 'Bioluminescence must clarify a relation or movement; it cannot be a surface effect applied everywhere.',
    },
    visualLanguage: ['Keep one clear source of light and let the water transform it.', 'Use scale ambiguity to deepen the event, not to obscure it.', 'Make motion readable through flow and spacing.'],
    invariants: ['Preserve the feeling of an observed event.', 'Keep the marine environment active rather than picturesque scenery.'],
    nextQuestions: ['What evidence would remain after a luminous organism passed?', 'How can depth be read without a horizon?', 'When does a movement become a map of the water around it?'],
  },
  caelrune: {
    artisticPosition: 'Myth is a geography people maintain together. Routes, weather, relics, and omissions give a story its usable shape.',
    medium: {
      name: 'Synthetic cartography and illuminated atlas studies',
      wayOfThinking: 'Compose each image as a map that balances orientation with a deliberate, meaningful absence.',
      operations: ['route hierarchy', 'legend and annotation', 'weather as spatial information', 'relics as landmarks'],
      boundary: 'A symbolic mark must help the viewer navigate the imagined world instead of merely decorating it.',
    },
    visualLanguage: ['Give routes a stronger hierarchy than the ornaments around them.', 'Use weather to alter how a place can be reached.', 'Let one omission become an active part of the map.'],
    invariants: ['Treat mythic places as lived geography.', 'Keep enough orientation for the viewer to follow a route.'],
    nextQuestions: ['What route appears only after a storm?', 'How can a map show a place that its inhabitants refuse to name?', 'When does a relic become a destination rather than an object?'],
  },
  ossathread: {
    artisticPosition: 'Material tension can carry an idea before the image explains it. A knot, fold, or joint records force and choice.',
    medium: {
      name: 'Synthetic textile and kinetic sculpture studies',
      wayOfThinking: 'Treat the image as a proposal for an object: fibers, joins, tension, gravity, and scale must behave as material facts.',
      operations: ['visible joins', 'woven structure', 'suspended tension', 'directional folds'],
      boundary: 'Texture must explain construction or force; simulated material grain alone is not a sculptural decision.',
    },
    visualLanguage: ['Let a knot redirect the structure instead of serving as surface ornament.', 'Use negative space to reveal how the object holds together.', 'Show one tension path clearly enough to imagine the weight.'],
    invariants: ['Let material behavior lead the concept.', 'Keep the object physically imaginable even when its form is impossible.'],
    nextQuestions: ['What can a knot hold besides two ends of a thread?', 'How does a woven structure change when one strand carries the weight?', 'What would need to be joined for this impossible object to stand?'],
  },
  juniperarc: {
    artisticPosition: 'An ordinary object can become evidence of a day. Quiet composition is a way to notice use, absence, and care.',
    medium: {
      name: 'Synthetic editorial still-life photography',
      wayOfThinking: 'Stage objects as traces of an event, using daylight, crop, surface, and distance to make their relation legible.',
      operations: ['available-light direction', 'editorial crop', 'object-to-object spacing', 'surface evidence'],
      boundary: 'The still life needs a reason for its arrangement; polish cannot replace a relationship between objects.',
    },
    visualLanguage: ['Use daylight to disclose handling, age, and placement.', 'Give negative space the work of a missing person or action.', 'Build rhythm from object intervals, not added decoration.'],
    invariants: ['Keep the scale ordinary and intimate.', 'Let the image imply a day without illustrating a complete story.'],
    nextQuestions: ['What action can be inferred from one object left out of place?', 'How does daylight change the meaning of an empty setting?', 'What does an ordinary object remember through wear?'],
  },
  tavianash: {
    artisticPosition: 'Powerful systems become humane when their structure can be read, maintained, and repaired.',
    medium: {
      name: 'Synthetic industrial image and technical illustration studies',
      wayOfThinking: 'Balance a machine’s silhouette with a clear view of its interfaces, access, and repair logic.',
      operations: ['structural hierarchy', 'maintenance access', 'diagrammatic cutaway', 'human scale reference'],
      boundary: 'Monumentality must not hide how the machine is used or repaired.',
    },
    visualLanguage: ['Use a cutaway only when it answers a real structural question.', 'Make access panels and joints part of the composition.', 'Use monochrome value shifts to clarify hierarchy, not to flatten it.'],
    invariants: ['Keep repair possible in the imagined system.', 'Pair industrial scale with an intelligible human interface.'],
    nextQuestions: ['What detail makes a monumental machine repairable?', 'How can a cutaway show both force and care?', 'Which interface should remain visible when the system is at rest?'],
  },
  lumakade: {
    artisticPosition: 'Play is a way to test scale and cooperation. A small world feels alive when its objects have rules and agency.',
    medium: {
      name: 'Synthetic miniature-set and toy-theater studies',
      wayOfThinking: 'Build a scene with model-like scale cues, clear object relationships, and one rule that can be gently broken.',
      operations: ['tabletop staging', 'scale shifts', 'object choreography', 'nested environments'],
      boundary: 'Whimsy needs spatial rules; random oddness does not create a coherent world.',
    },
    visualLanguage: ['Use one scale cue to make a second scale possible.', 'Let objects cooperate through placement and direction.', 'Reserve the surprise for one corner the viewer can discover.'],
    invariants: ['Keep play precise enough to revisit.', 'Make every strange object participate in the scene.'],
    nextQuestions: ['What can a tiny object do when it becomes the largest thing in the room?', 'How do two objects show cooperation without a character?', 'Which corner changes the rules of the whole miniature?'],
  },
  serenvoss: {
    artisticPosition: 'Weather is a force that changes how a landscape can be crossed, read, and remembered.',
    medium: {
      name: 'Synthetic landscape and weather studies',
      wayOfThinking: 'Organize the image around pressure, visibility, distance, and the change in conditions across the ground.',
      operations: ['atmospheric depth', 'horizon placement', 'weather bands', 'tonal transition'],
      boundary: 'A dramatic sky must alter the landscape’s legibility or movement; spectacle alone is unresolved.',
    },
    visualLanguage: ['Let a wide interval of quiet carry the scale.', 'Change visibility gradually across the frame.', 'Make the horizon a structural choice rather than a default divider.'],
    invariants: ['Keep weather consequential to the land.', 'Allow calm to emerge from visible conditions, not generic softness.'],
    nextQuestions: ['What becomes visible after a difficult sky passes?', 'How can pressure be felt before the storm arrives?', 'Which part of a landscape remains calm while visibility changes?'],
  },
  nyxenbloom: {
    artisticPosition: 'A single image can hold incompatible scales. Collage makes the joins between those scales part of the subject.',
    medium: {
      name: 'Synthetic image collage and speculative biology',
      wayOfThinking: 'Construct a coherent field from fragments whose differences in scale and material remain visible.',
      operations: ['visible seams', 'scale collision', 'found-surface quotation', 'biological morphology'],
      boundary: 'A fragment must change the reading of its neighbors; accumulation alone is not collage logic.',
    },
    visualLanguage: ['Leave one seam visible so the construction remains legible.', 'Use scale shifts to question what counts as a body or landscape.', 'Give each texture a structural role.'],
    invariants: ['Preserve the friction between fragments.', 'Do not smooth every contradiction into one surface.'],
    nextQuestions: ['What does a body look like when its scale refuses to settle?', 'Which seam changes a fragment from decoration into evidence?', 'How can two incompatible surfaces share one ecology?'],
  },
};

const FALLBACK_SEED: PracticeSeed = {
  artisticPosition: 'Build a recognizable practice through decisions that can be questioned, repeated, and changed with a history.',
  medium: {
    name: 'Synthetic image making',
    wayOfThinking: 'Treat framing, space, material cues, sequence, and scale as decisions that carry the idea.',
    operations: ['framing', 'hierarchy', 'negative space', 'material construction'],
    boundary: 'Do not treat a style label or surface effect as a complete artistic position.',
  },
  visualLanguage: ['Make one compositional decision carry the central question.', 'Let space and scale establish the relationship before adding detail.'],
  invariants: ['Preserve the existing Star identity.', 'Treat new work as a candidate until it receives critique.'],
  nextQuestions: ['What formal decision would make the current question more specific?', 'What can be removed without weakening the work?', 'Which material or spatial constraint should lead the next study?'],
};

function cleanText(value: unknown, maximum = 280): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maximum);
}

function cleanList(values: unknown, maximum = 8): string[] {
  if (!Array.isArray(values)) return [];
  return values.slice(0, maximum).map((value) => cleanText(value)).filter(Boolean);
}

export function createInitialBrocCanon(star: StarDefinition): BrocCanon {
  const seed = PRACTICE_SEEDS[star.handle] || FALLBACK_SEED;
  const series = getStarSeriesList(star.handle);
  const bodiesOfWork: BrocBodyOfWork[] = series.length
    ? series.map((body) => ({
      id: body.id,
      title: cleanText(body.title, 160),
      inquiry: cleanText(body.description || body.title),
      status: body.status,
    }))
    : [{
      id: 'developing-practice',
      title: cleanText(star.persona.creativeDirections[0] || `${star.displayName} — ongoing studies`, 160),
      inquiry: cleanText(star.bio),
      status: 'developing',
    }];
  const activeBody = bodiesOfWork.find((body) => body.status === 'active') || bodiesOfWork[0];

  return {
    version: BROC_PRACTICE_VERSION,
    revision: 1,
    handle: star.handle,
    displayName: star.displayName,
    artistStatement: cleanText(star.bio, 500),
    artisticPosition: cleanText(seed.artisticPosition, 500),
    medium: {
      name: cleanText(seed.medium.name, 160),
      wayOfThinking: cleanText(seed.medium.wayOfThinking, 360),
      operations: cleanList(seed.medium.operations, 8),
      boundary: cleanText(seed.medium.boundary, 300),
    },
    bodiesOfWork,
    activeBodyId: activeBody.id,
    visualLanguage: cleanList(seed.visualLanguage, 8),
    invariants: cleanList(seed.invariants, 8),
    nextQuestions: cleanList(seed.nextQuestions, 8),
    influences: [],
  };
}

function eventString(event: BrocHistoryEvent, key: string, maximum = 220): string {
  return cleanText(event.payload[key], maximum);
}

function getNextQuestion(canon: BrocCanon, scenes: BrocHistoryEvent[]): string {
  const questions = canon.nextQuestions.length ? canon.nextQuestions : FALLBACK_SEED.nextQuestions;
  const mostRecent = scenes[0] ? eventString(scenes[0], 'question') : '';
  const recentSet = new Set(scenes.slice(0, 2).map((event) => eventString(event, 'question')).filter(Boolean));
  const start = Math.max(0, questions.indexOf(mostRecent) + 1) % questions.length;

  for (let offset = 0; offset < questions.length; offset += 1) {
    const candidate = questions[(start + offset) % questions.length];
    if (!recentSet.has(candidate)) return candidate;
  }
  return questions[start];
}

function getFormalFocus(canon: BrocCanon, scenes: BrocHistoryEvent[]): string {
  const decisions = canon.visualLanguage.length ? canon.visualLanguage : FALLBACK_SEED.visualLanguage;
  const mostRecent = scenes[0] ? eventString(scenes[0], 'formalFocus') : '';
  const recentSet = new Set(scenes.slice(0, 2).map((event) => eventString(event, 'formalFocus')).filter(Boolean));
  const start = Math.max(0, decisions.indexOf(mostRecent) + 1) % decisions.length;

  for (let offset = 0; offset < decisions.length; offset += 1) {
    const candidate = decisions[(start + offset) % decisions.length];
    if (!recentSet.has(candidate)) return candidate;
  }
  return decisions[start];
}

export function buildBrocScene(
  context: BrocPracticeContext,
  opportunity: number,
): BrocScenePlan {
  const scenes = context.recentEvents.filter((event) => event.eventType === 'scene');
  const latestDirection = context.recentEvents.find((event) => event.eventType === 'direction');
  const directedQuestion = latestDirection ? eventString(latestDirection, 'nextQuestion', 320) : '';
  const plannedQuestion = directedQuestion || getNextQuestion(context.canon, scenes);
  const recentQuestions = new Set(scenes.slice(0, 2).map((event) => eventString(event, 'question')).filter(Boolean));
  const recentFormalFocuses = new Set(scenes.slice(0, 2).map((event) => eventString(event, 'formalFocus')).filter(Boolean));
  const body = context.canon.bodiesOfWork.find((item) => item.id === context.canon.activeBodyId)
    || context.canon.bodiesOfWork[0];
  const questionRepeated = recentQuestions.has(plannedQuestion);
  const formalFocus = getFormalFocus(context.canon, scenes);
  const formalFocusRepeated = recentFormalFocuses.has(formalFocus);
  const previousQuestion = scenes[0] ? eventString(scenes[0], 'question') : '';
  const productiveContradiction = latestDirection?.payload.productiveContradiction === true;

  return {
    version: BROC_PRACTICE_VERSION,
    bodyId: body?.id || 'developing-practice',
    bodyTitle: body?.title || `${context.canon.displayName} — ongoing studies`,
    question: plannedQuestion,
    mediumOperation: context.canon.medium.operations[(Math.max(0, opportunity - 1)) % Math.max(1, context.canon.medium.operations.length)]
      || 'framing and scale',
    formalFocus,
    directiveSource: directedQuestion ? 'director' : 'practice',
    preflight: {
      recentQuestionRepeated: questionRepeated,
      recentFormalFocusRepeated: formalFocusRepeated,
      inquiryMovement: productiveContradiction
        ? 'productive-contradiction'
        : previousQuestion && previousQuestion === plannedQuestion ? 'deepen' : 'advance',
      imageReview: 'pending',
    },
  };
}

export function buildBrocPrompt(
  star: StarDefinition,
  canon: BrocCanon,
  scene: BrocScenePlan,
  recentEvents: BrocHistoryEvent[],
  opportunity: number,
): string {
  const notes = recentEvents
    .filter((event) => ['critique', 'discovery', 'rejection'].includes(event.eventType))
    .slice(0, 1)
    .map((event) => `${event.eventType}: ${eventString(event, 'summary', 180)}`)
    .filter((line) => !line.endsWith(': '));
  const candidateCount = recentEvents.filter((event) => event.eventType === 'candidate').length;
  let existingBrief = cleanText(buildStarPrompt(star, opportunity), 520);
  const craftDirective = 'Make compositional, spatial, material, and typographic decisions that answer the inquiry. Visible typography belongs only when it is part of this artist’s medium and structure; never typeset this brief.';
  const lines = [
    `BROC practice brief — version ${BROC_PRACTICE_VERSION}`,
    `Artist: ${cleanText(canon.displayName, 100)} (@${cleanText(canon.handle, 80)}). ${cleanText(canon.artistStatement, 220)}`,
    `Artistic position: ${cleanText(canon.artisticPosition, 260)}`,
    `Medium: ${cleanText(canon.medium.name, 100)}. ${cleanText(canon.medium.wayOfThinking, 180)}`,
    `Medium operations: ${cleanText(canon.medium.operations.join('; '), 200)}. Constraint: ${cleanText(canon.medium.boundary, 160)}`,
    `Active body of work: ${cleanText(scene.bodyTitle, 120)}. Inquiry: ${cleanText(scene.question, 240)}`,
    `Formal decision for this work: ${cleanText(scene.formalFocus, 180)}`,
    `Material operation: ${cleanText(scene.mediumOperation, 100)}`,
    `Stable canon: ${cleanText(canon.invariants.join('; '), 300)}`,
    `Recent continuity includes ${candidateCount} recorded candidate work(s). A candidate remains an experiment until explicit critique; do not treat its existence as approval or doctrine.`,
    notes.length ? `Retained critique and discoveries:\n${notes.map((note) => `- ${note}`).join('\n')}` : '',
    `Star's existing brief: ${existingBrief}`,
    craftDirective,
  ].filter(Boolean);

  let prompt = lines.join('\n');
  while (prompt.length > BROC_MAX_PROMPT_LENGTH && notes.length) {
    notes.pop();
    const noteLineIndex = lines.findIndex((line) => line.startsWith('Retained critique and discoveries:'));
    if (noteLineIndex >= 0) {
      lines[noteLineIndex] = notes.length
        ? `Retained critique and discoveries:\n${notes.map((note) => `- ${note}`).join('\n')}`
        : '';
    }
    prompt = lines.filter(Boolean).join('\n');
  }
  while (prompt.length > BROC_MAX_PROMPT_LENGTH && existingBrief.length) {
    existingBrief = existingBrief.slice(0, Math.max(0, existingBrief.length - 100));
    const starBriefIndex = lines.findIndex((line) => line.startsWith("Star's existing brief:"));
    if (starBriefIndex >= 0) lines[starBriefIndex] = `Star's existing brief: ${existingBrief}`;
    prompt = lines.filter(Boolean).join('\n');
  }
  return prompt.slice(0, BROC_MAX_PROMPT_LENGTH);
}

export interface BrocJudgmentInput {
  eventType: 'critique' | 'discovery' | 'rejection' | 'direction';
  summary: string;
  nextQuestion?: string;
  disposition?: 'canon' | 'continuity' | 'experiment' | 'reject';
  productiveContradiction?: boolean;
}

export function buildBrocJudgmentPayload(input: BrocJudgmentInput): Record<string, unknown> {
  if (!['critique', 'discovery', 'rejection', 'direction'].includes(input.eventType)) {
    throw new TypeError('BROC judgment event type is invalid');
  }
  const summary = cleanText(input.summary, 800);
  if (!summary) throw new TypeError('BROC judgment summary is required');
  const nextQuestion = cleanText(input.nextQuestion, 320);
  if (input.eventType === 'direction' && !nextQuestion) {
    throw new TypeError('A BROC direction requires a next question');
  }
  const dispositions = ['canon', 'continuity', 'experiment', 'reject'] as const;
  if (input.disposition !== undefined && !dispositions.includes(input.disposition)) {
    throw new TypeError('BROC judgment disposition is invalid');
  }
  return {
    summary,
    ...(nextQuestion ? { nextQuestion } : {}),
    ...(input.disposition ? { disposition: input.disposition } : {}),
    ...(input.productiveContradiction === true ? { productiveContradiction: true } : {}),
  };
}

function sanitizeBrocCanon(canon: BrocCanon): BrocCanon {
  if (canon.version !== BROC_PRACTICE_VERSION || !Number.isSafeInteger(canon.revision) || canon.revision < 1) {
    throw new TypeError('BROC canon revision is invalid');
  }
  const bodiesOfWork = Array.isArray(canon.bodiesOfWork)
    ? canon.bodiesOfWork.slice(0, 12).map((body) => ({
      id: cleanText(body.id, 100),
      title: cleanText(body.title, 160),
      inquiry: cleanText(body.inquiry, 360),
      status: body.status,
    })).filter((body) => body.id && body.title && body.inquiry
      && ['active', 'complete', 'archived', 'developing'].includes(body.status))
    : [];
  const safeCanon: BrocCanon = {
    version: BROC_PRACTICE_VERSION,
    revision: canon.revision,
    handle: cleanText(canon.handle, 80),
    displayName: cleanText(canon.displayName, 120),
    artistStatement: cleanText(canon.artistStatement, 500),
    artisticPosition: cleanText(canon.artisticPosition, 500),
    medium: {
      name: cleanText(canon.medium?.name, 160),
      wayOfThinking: cleanText(canon.medium?.wayOfThinking, 360),
      operations: cleanList(canon.medium?.operations, 8),
      boundary: cleanText(canon.medium?.boundary, 300),
    },
    bodiesOfWork,
    activeBodyId: cleanText(canon.activeBodyId, 100),
    visualLanguage: cleanList(canon.visualLanguage, 8),
    invariants: cleanList(canon.invariants, 8),
    nextQuestions: cleanList(canon.nextQuestions, 8),
    influences: cleanList(canon.influences, 8),
  };
  if (!safeCanon.handle || !safeCanon.displayName || !safeCanon.artistStatement
    || !safeCanon.artisticPosition || !safeCanon.medium.name || !safeCanon.medium.wayOfThinking
    || !safeCanon.medium.boundary || !safeCanon.bodiesOfWork.length
    || !safeCanon.bodiesOfWork.some((body) => body.id === safeCanon.activeBodyId)
    || !safeCanon.visualLanguage.length || !safeCanon.invariants.length
    || !safeCanon.nextQuestions.length) {
    throw new TypeError('BROC canon revision is incomplete');
  }
  return safeCanon;
}

export function buildBrocCanonRevisionPayload(
  canon: BrocCanon,
  rationale: string,
): Record<string, unknown> {
  const safeRationale = cleanText(rationale, 800);
  if (!safeRationale) throw new TypeError('A BROC canon revision requires a rationale');
  return { canon: sanitizeBrocCanon(canon), rationale: safeRationale };
}
