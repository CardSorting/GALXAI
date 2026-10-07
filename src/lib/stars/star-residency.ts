import { STAR_DEFINITIONS } from './star-cohort';

/** Private, finite artist-in-residence brief. Closed batches are never reused. */
export const STAR_RESIDENCY_COHORT_KEY = 'stars-residency-2026-10-07';
export const STAR_RESIDENCY_RUN_KEY = 'stars-residency-run-2026-10-07';
export const STAR_RESIDENCY_TITLE = 'Things That Hold Time';

export const STAR_RESIDENCY_WORKS = [
  { handle: 'veyrasol', title: 'The Station Between Tides',
    question: 'Can a civic threshold preserve the rhythm of a vanished shoreline?',
    formalFocus: 'Low oblique perspective; a tide line across warm stone connects the near bench to a distant public route.',
    brief: 'Create a cinematic architectural study of a small tidal railway station at blue hour. A seawater channel runs beneath worn limestone benches; amber windows illuminate the salt marks of past tides. Two small waiting figures anchor a long accessible ramp. Cropped foreground, immense quiet sky, one clear vanishing point. No lettering.' },
  { handle: 'morrowkest', title: 'A Face Borrowed from Tomorrow',
    question: 'Can one reflection carry a different age without breaking a person into fragments?',
    formalFocus: 'Intimate vertical portrait; a narrow mirror interrupts a softly lit cheek without splitting the face.',
    brief: 'Make an intimate portrait photograph of an invented adult woman in a plain oxblood room. A narrow tarnished mirror beside her face reflects the same woman decades older, her expression quietly amused. Soft window light, specific natural skin, pearl silk collar, deep shadow detail. One impossible reflection, no collage or lettering.' },
  { handle: 'soravale', title: 'The Garden Keeps the Scar',
    question: 'How does a living network preserve damage while continuing to grow?',
    formalFocus: 'Ground-level specimen framing; a pale broken root becomes the organizing diagonal.',
    brief: 'Construct a botanical field study at ground level after a forest fire: a pale fractured root supports tiny translucent seedlings, fungal threads and dew. Charred soil remains visible rather than covered by flowers. One emerging opal leaf catches overcast light. Ecological specificity, asymmetric macro composition, generous breathing space.' },
  { handle: 'ilyx', title: 'Six Beats and a Missing Seventh',
    question: 'Can an absent interval exert more pressure than a repeated shape?',
    formalFocus: 'Six precise blue modules; an empty seventh interval is held by a small acid-yellow counterweight.',
    brief: 'Create a rigorous abstract print on warm uncoated paper. Six cobalt rectangular beats cross an offset grid of thin violet lines; the seventh interval is deliberately empty. One small acid-yellow disc far below counterbalances the missing beat. Flat ink, slight print registration variation, no gradients, no objects or lettering.' },
  { handle: 'nemiorra', title: 'After the Lantern Passed',
    question: 'What remains visible in water after its only light source has moved away?',
    formalFocus: 'A dark vertical descent with one bending trail of faint light and clearly layered suspended particles.',
    brief: 'Make an underwater photographic study of the wake of an unseen luminous animal. A single pale green ribbon of bioluminescent plankton curls through navy water beside a half-buried stone stair. Depth and drifting particles supply the scale. The creature is absent; the wake fades toward black. Restrained light, no glowing scenery or text.' },
  { handle: 'caelrune', title: 'A Road Remembered Only by Rain',
    question: 'Can an omission be the most useful landmark on a map?',
    formalFocus: 'An overhead atlas plate; a single washed-out region redirects the route hierarchy.',
    brief: 'Create a hand-worked imaginary atlas plate on weathered ivory vellum. Terracotta paths wind between moss-green hill contours; a pale rain-washed blank interrupts the central valley. Tiny waystones lead around the absence. Graphite hatching, restrained gold pinpoints, legible spatial hierarchy. Symbols only, no readable labels or decorative compass rose.' },
  { handle: 'ossathread', title: 'The Knot Holds the Room',
    question: 'What changes when one small join carries the weight of an entire space?',
    formalFocus: 'One suspended textile structure fills a square frame; clear negative space reveals the load path.',
    brief: 'Photograph a physically imaginable textile sculpture in an empty plaster room. Broad unbleached linen bands descend from the ceiling into one dense rust-red knot, then open into a gently weighted woven basin above the floor. Visible seams, tension and directional folds explain its construction. Side daylight, quiet shadows, no people or text.' },
  { handle: 'juniperarc', title: 'Someone Left the Warm Cup',
    question: 'How can spacing between ordinary objects imply an unfinished act of care?',
    formalFocus: 'Close horizontal crop; an empty place setting carries as much weight as the remaining cup.',
    brief: 'Make an editorial still-life photograph of a scratched kitchen table in late winter daylight: one handmade cream cup, a peeled pear and a folded indigo napkin. A second cup has just been removed, leaving a warm wet ring. Precise object spacing, ordinary scale, subtle steam, tactile wear, honest window light. No flowers, props or lettering.' },
  { handle: 'tavianash', title: 'Maintenance at First Light',
    question: 'Which small interface makes a monumental system feel repairable?',
    formalFocus: 'Monochrome industrial cutaway; an open access panel and a single human-scale ladder organize the mass.',
    brief: 'Draw an industrial study of an immense dormant civic water pump in warm charcoal and chalk on grey paper. Its open maintenance panel reveals a clear simple impeller, gasket and hand tools. One ladder gives human scale; dawn crosses the heavy housing. Structure must be intelligible and repairable, with severe silhouette and tender wear. No diagrams labels.' },
  { handle: 'lumakade', title: 'The Orchard Inside the Thimble',
    question: 'Can one scale cue make a second world believable?',
    formalFocus: 'Tabletop miniature photographed low; the thimble rim establishes the scale of a carefully choreographed orchard.',
    brief: 'Build a precise miniature-set photograph: a tarnished silver sewing thimble contains three tiny apricot trees and a ladder made from matchsticks. One fallen apricot rests outside the thimble, larger than the orchard canopy. Pale peach tabletop, soft model-scale shadows, shallow but readable focus. Every object cooperates; one scale surprise, no characters or text.' },
  { handle: 'serenvoss', title: 'The Field After the Sound',
    question: 'Can calm be shown as the visible consequence of difficult weather?',
    formalFocus: 'Very low horizon; clearing bands of rain open a narrow light interval across dark land.',
    brief: 'Paint a wide landscape of an empty salt field immediately after a storm. A single wet path reflects a slim band of apricot dawn; slate rain curtains recede across the far hills. Huge quiet sky, low horizon, tangible shifting visibility, rough mineral ground. Tonal restraint and one small clearing, no buildings, lightning or text.' },
  { handle: 'nyxenbloom', title: 'The Seam Is a Coastline',
    question: 'Can two incompatible scales share an ecology without concealing their join?',
    formalFocus: 'An exposed torn seam joins a biological close-up to a distant aerial landscape.',
    brief: 'Create a material collage of a giant leaf vein merging into an aerial tidal delta. Leave the torn paper seam plainly visible: botanical magnification on one side, tiny channels and silt islands on the other. Copper foil fragments act as river sediment; bone-white paper and deep petrol green carry the field. Coherent ecology, no smooth fantasy creature or lettering.' },
] as const;

export const STAR_RESIDENCY_DEFINITIONS = STAR_DEFINITIONS.map((star) => {
  const work = STAR_RESIDENCY_WORKS.find((candidate) => candidate.handle === star.handle);
  if (!work) throw new Error('Residency brief is missing an existing Star');
  return { ...star, persona: { ...star.persona, creativeDirections: [work.brief] } };
});

/** Separately authorized second pass; the first residency remains immutable. */
export const STAR_RESIDENCY_V2_COHORT_KEY = 'stars-residency-2026-10-07-r2';
export const STAR_RESIDENCY_V2_RUN_KEY = 'stars-residency-run-2026-10-07-r2';
export const STAR_RESIDENCY_V2_TITLE = 'Instruments for the Impossible';

export const STAR_RESIDENCY_V2_WORKS = [
  { handle: 'veyrasol', title: 'A Stair That Measures Wind',
    question: 'Can a public route make an invisible force tangible without obstructing passage?',
    formalFocus: 'A steep side view of a broad civic stair; slender moving fins interrupt its otherwise solid silhouette.',
    brief: 'Create an architectural photograph of a broad ochre-concrete public stair on a dry high plateau. Slender brushed-aluminum fins mounted along its outer edge tilt by different amounts in the wind. A continuous accessible path curves beside the stair; three small walkers establish scale. Hard noon light, dusty blue sky, crisp cast shadows, intelligible construction. No lettering.' },
  { handle: 'morrowkest', title: 'The Weight of a Quiet Answer',
    question: 'Can an impossible object reveal concentration rather than spectacle?',
    formalFocus: 'An adult portrait in profile; a small suspended sphere connects the face to an open palm.',
    brief: 'Photograph an invented middle-aged man in profile against a muted olive studio wall. A small solid brass sphere hangs motionless a finger-width above his open palm, with no support visible. His calm gaze, worn dark cotton sleeve and fine skin texture carry the image. Narrow cool window light makes a believable sphere shadow. One restrained impossibility, no mirror, effects or text.' },
  { handle: 'soravale', title: 'The Pitch of Slow Growth',
    question: 'Can gradual colonization turn a manufactured instrument into a living measure?',
    formalFocus: 'A low macro view; the clean fork gap is countered by dense, uneven biological growth.',
    brief: 'Create a botanical specimen photograph of a small discarded steel tuning fork resting on damp slate. Grey-green crustose lichens colonize one tine; tiny amber spore cups cluster at its base while the opposite tine remains bare. Minute mineral grains and capillary water are sharply observed. Overcast light, low asymmetric crop, earthy restraint. No flowers, roots, glow or labels.' },
  { handle: 'ilyx', title: 'An Equation for Staying Afloat',
    question: 'How little contact can hold a visual system in balance?',
    formalFocus: 'Two unequal semicircles touch at a single point; a thin horizontal line tests their equilibrium.',
    brief: 'Make a severe geometric relief print on pale grey paper. A large black semicircle faces upward; a smaller vermilion semicircle balances on its uppermost point, facing downward. A hairline horizontal rule passes just below their contact. Broad empty margins, subtle embossed paper grain, exact optical balance. Flat black and vermilion only, no grids, gradients, lettering or depicted objects.' },
  { handle: 'nemiorra', title: 'A Bell That Rings in Silence',
    question: 'Can water make a familiar sound-producing object feel entirely unfamiliar?',
    formalFocus: 'A submerged bell seen from below; a few ascending bubbles reveal the stillness around its dark mouth.',
    brief: 'Photograph an old brass handbell suspended deep in clear blue water, viewed slightly from below. Its dark open mouth faces the viewer and holds one trapped silver bubble; three smaller bubbles ascend past the handle. Fine sediment clings to the rim. A narrow shaft of natural surface light reveals tarnish against vast indigo depth. No seabed, stairs, luminous trails or text.' },
  { handle: 'caelrune', title: 'An Atlas of Unbuilt Bridges',
    question: 'How can a map distinguish a possible connection from a completed crossing?',
    formalFocus: 'Four irregular islands separated by broad channels; interrupted routes preserve uncertainty.',
    brief: 'Draw an imaginary planning atlas on cool pale-blue rag paper. Four chalk-white islands are crossed by graphite contour lines. Thin vermilion bridge proposals stop just short of the far shores, leaving clear gaps over wide blue channels. Small punched pinholes mark endpoints; folded creases make it handled, not ornamental. Precise route hierarchy, no labels, gold, compass rose or readable text.' },
  { handle: 'ossathread', title: 'A Balance for Unspoken Words',
    question: 'Can two unequal containers express balance through their visible tension?',
    formalFocus: 'Two weighted felt pockets hang at different heights from one taut cross-cord.',
    brief: 'Photograph a textile balance in a plain cool-grey room. One deep mustard felt pocket and one smaller navy felt pocket hang from a taut horizontal charcoal cord, at different heights. Their stitched mouths are open; smooth pale river stones give visible weight. Fine supporting threads and stretched seams explain the tension. Frontal framing, soft top light, no central knot, basin, people or text.' },
  { handle: 'juniperarc', title: 'A Spoon for Catching Light',
    question: 'Can reflected light become the principal object of an ordinary still life?',
    formalFocus: 'A diagonal silver spoon and a water glass cast a bright oval onto a worn, nearly empty tabletop.',
    brief: 'Make a close still-life photograph on a worn pale-green kitchen table: one old silver spoon beside a simple half-full water glass. Late afternoon sunlight refracts through the glass and collects as a bright oval inside the spoon bowl. A crumpled white linen corner enters from the edge. Honest scale, scratches, optical specificity, generous empty space. No cups, fruit, flowers or text.' },
  { handle: 'tavianash', title: 'The Machine That Saves a Shadow',
    question: 'Can a monumental mechanism make the movement of daylight feel repairable?',
    formalFocus: 'A tall shutter array dominates the drawing; one small accessible crank explains its motion.',
    brief: 'Draw a civic daylight regulator in graphite on cream paper: five immense hinged steel vanes stand in a row inside an open workshop, linked by a visible rod to one waist-high hand crank. A narrow yellow-pastel sunlight strip falls between two vanes. Worn hinges, simple serviceable joints, severe mass and precise shadow explain the mechanism. No pumps, ladders, labels or lettering.' },
  { handle: 'lumakade', title: 'An Elevator for a Dandelion',
    question: 'Can a miniature mechanism make something almost weightless feel precious?',
    formalFocus: 'A tiny lift in a bell jar; the oversize seed head provides one unmistakable scale cue.',
    brief: 'Build a miniature-set photograph inside a small clear bell jar. A tiny walnut-wood elevator car rides two taut threads and carries one dandelion seed upright like a passenger. The seed plume nearly fills the car; a simple brass pulley sits above it. Lavender tabletop, delicate shadows, readable handcrafted mechanism, shallow but sufficient focus. No thimble, trees, fruit, people or text.' },
  { handle: 'serenvoss', title: 'The Hills Learn to Breathe',
    question: 'Can an interval of low cloud give a landscape the rhythm of an inhalation?',
    formalFocus: 'Two dark hill shoulders frame a pale fog interval above a still ochre lake.',
    brief: 'Paint a restrained winter landscape of two rounded charcoal hills with sparse snow, separated by rising pale mist above a still ochre-brown lake. The mist opens a soft vertical interval while the water reflects only the nearest hill edge. High overcast light, broad dry brush, quiet asymmetry, no sunrise, storm curtains, salt field, buildings or text.' },
  { handle: 'nyxenbloom', title: 'A Compass for the Unfamiliar',
    question: 'Can a direction emerge where biological growth meets an unfamiliar geometry?',
    formalFocus: 'One exposed angular fold interrupts a spiral; mismatched material scales stay visible.',
    brief: 'Make a physical collage on charcoal board: magnified cream moth-wing scales meet a small spiral of rough stone fragments. A sharp folded triangle of cobalt paper crosses their join like an uncertain direction marker. Leave cut edges, adhesive traces and scale mismatches visible. Close crop, raking light, coherent material ecology. No maps, leaf veins, rivers, copper foil, lettering or compass icon.' },
] as const;

export const STAR_RESIDENCY_V2_DEFINITIONS = STAR_DEFINITIONS.map((star) => {
  const work = STAR_RESIDENCY_V2_WORKS.find((candidate) => candidate.handle === star.handle);
  if (!work) throw new Error('Second residency brief is missing an existing Star');
  return { ...star, persona: { ...star.persona, creativeDirections: [work.brief] } };
});
