/** Intentional public editorial content. Never import private production records here. */
export interface CuratedArtwork {
  id: string;
  title: string;
  artist: string;
  handle: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
}

export interface Exhibition {
  slug: string;
  title: string;
  standfirst: string;
  introduction: string[];
  works: CuratedArtwork[];
  editorialSlug: string;
}

export const EXHIBITIONS: Exhibition[] = [
  {
    slug: 'instruments-for-the-impossible',
    title: 'Instruments for the Impossible',
    standfirst: 'Twelve STARs consider what an object can hold when its purpose exceeds the practical.',
    introduction: [
      'A stair measures the wind. A submerged bell keeps its sound. A small lift carries a dandelion seed. The objects gathered here are recognisable, but their proposed functions are quietly out of reach. Each work begins with a tool and ends with a question about what we ask the world to do for us.',
      'Across architecture, portraiture, abstraction and intimate still life, twelve STAR practices approach the instrument as a vessel for attention. Weight becomes a moral problem; balance becomes a relationship; a map records connections that have yet to exist. The exhibition moves between monumental structures and almost weightless things, allowing scale to change without making one register more important than another.',
      'These are digital works, encountered online. Their surfaces evoke concrete, paper, felt and water, but their material is the image. Looking closely is the exhibition’s principal activity: following a seam, a reflection or an interrupted line until the ordinary object begins to give up its certainty.',
    ],
    editorialSlug: 'what-an-object-can-ask',
    works: [
      { id: 'img_3caaa1dcd38f4fdaaf0cd124220c2c4a', title: 'A Stair That Measures Wind', artist: 'VANTA', handle: 'vanta', width: 1536, height: 1024, alt: 'An ochre concrete stair crosses a sunlit plateau beside a wave of upright metal fins; three small figures establish its scale.', caption: 'VANTA gives an invisible force an architectural register. Repetition makes the fins appear to move, while the small figures bring the vast structure back to the measure of a body.' },
      { id: 'img_20057ba1f41e40e1b1a55135c68840de', title: 'The Weight of a Quiet Answer', artist: 'Morrow Kest', handle: 'morrowkest', width: 1374, height: 1145, alt: 'An older man in profile holds an open palm beneath a small suspended brass sphere against a muted olive wall.', caption: 'The sphere seems light; the gesture does not. Morrow Kest concentrates the work’s tension in the distance between an open hand and an object that has not yet been received.' },
      { id: 'img_61a764a2b89741aa8018b39c37e511a1', title: 'The Pitch of Slow Growth', artist: 'Sora Vale', handle: 'soravale', width: 1536, height: 1024, alt: 'A weathered steel tuning fork rests on wet slate, with lichen and small amber growths covering one tine.', caption: 'Growth changes the instrument before any note can be sounded. Steel and lichen occupy the same close field, placing the precision of tuning beside the irregular duration of living matter.' },
      { id: 'img_9ded0e26bd21473aa9820e3153ac537c', title: 'An Equation for Staying Afloat', artist: 'Ilyx', handle: 'ilyx', width: 1145, height: 1374, alt: 'A large black semicircle and a smaller inverted red semicircle meet at a fine horizontal line on grey paper.', caption: 'Two unequal forms meet at a point. Ilyx reduces buoyancy to a precarious visual relation: a small contact carries the entire proposition, and the surrounding empty field makes that contact visible.' },
      { id: 'img_c811bd82935a4df3ad0851990fc12c71', title: 'A Bell That Rings in Silence', artist: 'Nemi Orra', handle: 'nemiorra', width: 1024, height: 1536, alt: 'A tarnished bell hangs underwater, viewed from below, with a silver bubble in its dark mouth and light descending through deep blue water.', caption: 'The bell’s mouth holds a bright pocket of air. Nemi Orra turns an object made to announce its presence into a chamber of suspension, asking the eye to remain where the ear cannot follow.' },
      { id: 'img_96ac4e1cab3843939f7643475e04e86b', title: 'An Atlas of Unbuilt Bridges', artist: 'Cael Rune', handle: 'caelrune', width: 1536, height: 1024, alt: 'Four chalk-white islands appear on folded blue paper, with graphite contours and interrupted vermilion lines proposing bridges.', caption: 'The red lines belong to intention rather than arrival. Cael Rune leaves the crossings incomplete, allowing the map to preserve a possibility without pretending that distance has been overcome.' },
      { id: 'img_69e170bdd3304e309ba695113e6ff66f', title: 'A Balance for Unspoken Words', artist: 'Ossa Thread', handle: 'ossathread', width: 1374, height: 1145, alt: 'Mustard and navy felt pockets containing stones hang at unequal heights from charcoal cords, with visible supporting stitches.', caption: 'Weight gathers inside soft pockets. The uneven suspension is neither corrected nor concealed; Ossa Thread makes the support itself part of what must be looked at.' },
      { id: 'img_a3d2698fb55c4c9ca721e07dc8406f2b', title: 'A Spoon for Catching Light', artist: 'Juniper Arc', handle: 'juniperarc', width: 1145, height: 1374, alt: 'A silver spoon and half-full glass sit on a worn pale-green kitchen table beside white linen, catching a bright pattern of light.', caption: 'An ordinary utensil becomes a receiving surface. Juniper Arc places the event in a kitchen, where light can be held briefly without becoming a possession.' },
      { id: 'img_b7a1b092191b4ff99f9a62fb21ce68f4', title: 'The Machine That Saves a Shadow', artist: 'Tavian Ash', handle: 'tavianash', width: 1536, height: 1024, alt: 'Five immense steel vanes, linked by rods and a hand crank, fill a charcoal-toned workshop; a small worker stands near a strip of yellow light.', caption: 'The machinery dwarfs its attendant. Tavian Ash gives the fleeting shadow a formidable apparatus, making the effort of preservation visible before its success can be known.' },
      { id: 'img_e9107876d91d4e7786bcd9a80f7056e4', title: 'An Elevator for a Dandelion', artist: 'Luma Kade', handle: 'lumakade', width: 1312, height: 1199, alt: 'A miniature walnut lift carries a dandelion seed beneath a bell jar, with brass pulleys and fine threads in a small workshop.', caption: 'A seed receives the infrastructure of a passenger. Luma Kade’s miniature is tender and disproportionate: the care taken to move something fragile becomes the work’s real subject.' },
      { id: 'img_25b97586a96a4ccbb304d12e113b917c', title: 'The Hills Learn to Breathe', artist: 'Seren Voss', handle: 'serenvoss', width: 1536, height: 1024, alt: 'Snow-marked charcoal hills recede through low mist above an ochre lake with faint reflections.', caption: 'Mist interrupts the outline of the land. Seren Voss lets the landscape behave like a slow instrument, its apparent rhythm produced by the alternation of visible and withheld form.' },
      { id: 'img_3a603e25ec62490c8cbc158e07dff4c5', title: 'A Compass for the Unfamiliar', artist: 'Nyxen Bloom', handle: 'nyxenbloom', width: 1254, height: 1254, alt: 'A collage joins cream moth-wing textures, a rough stone spiral and a folded cobalt triangle on a charcoal ground, with edges and glue visible.', caption: 'Wing, stone and folded paper offer incompatible kinds of direction. Nyxen Bloom keeps their joins exposed, making orientation a provisional agreement between things.' },
    ],
  },
  {
    slug: 'things-that-hold-time',
    title: 'Things That Hold Time',
    standfirst: 'Traces, repairs and small acts of keeping. Twelve practices attend to what remains after an event has passed.',
    introduction: [
      'Time rarely appears directly. It reaches us in a stain, a worn edge, a changed face or a place still waiting for someone. This exhibition gathers twelve STAR works around those indirect forms: objects and landscapes that seem to have received an event and kept something of it.',
      'A warm cup leaves a ring. A forest grows around a scar. A map loses its road to rain. Some works offer the intimacy of a tabletop; others open onto an industrial structure or a distant field. Across these changes of scale, the artists remain close to evidence rather than spectacle.',
      'The sequence asks what it means to preserve a trace without making it permanent. Knots hold; seams divide and join; maintenance postpones collapse. In these digital images, keeping is an active relation, and absence is often the strongest indication that something mattered.',
    ],
    editorialSlug: 'reading-the-trace',
    works: [
      { id: 'img_45c40fb5489948f8a27bb7b22422a454', title: 'The Station Between Tides', artist: 'VANTA', handle: 'vanta', width: 1536, height: 1024, alt: 'A limestone station stands at the water’s edge in blue-hour light, its arches lit amber and two figures waiting nearby.', caption: 'The station occupies an interval between arrival and departure. VANTA makes the waiting place substantial, while tide and evening light keep its edges in motion.' },
      { id: 'img_ff47ccebce0344d3a1d96d20a5edfa56', title: 'A Face Borrowed from Tomorrow', artist: 'Morrow Kest', handle: 'morrowkest', width: 1024, height: 1536, alt: 'A woman with a pearl collar stands in an oxblood room beside a mirror that offers an older reflection.', caption: 'The reflection introduces a different duration into the same room. Morrow Kest gives neither face the authority of a final answer; the portrait lives in the space between them.' },
      { id: 'img_3e467409ef3c4043be7739e96b490e06', title: 'The Garden Keeps the Scar', artist: 'Sora Vale', handle: 'soravale', width: 1536, height: 1024, alt: 'Translucent seedlings and an opalescent leaf emerge around a charred forest root.', caption: 'New growth does not erase the burn. Sora Vale brings delicate translucency close to damaged wood, allowing recovery and its history to remain visible together.' },
      { id: 'img_3036c2d932e24d389b73c2a1d0d689e4', title: 'Six Beats and a Missing Seventh', artist: 'Ilyx', handle: 'ilyx', width: 1024, height: 1536, alt: 'Six cobalt geometric modules and a yellow disc occupy a violet grid in a flat abstract composition.', caption: 'Repetition teaches the eye to expect a continuation. Ilyx gives that expectation a shape, then lets an absent beat organise the rhythm that remains.' },
      { id: 'img_1dcab01dd2024d27a63825fe10d7d062', title: 'After the Lantern Passed', artist: 'Nemi Orra', handle: 'nemiorra', width: 1024, height: 1536, alt: 'A faint green wake lingers in dark water above a submerged stone stair, with no animal visible.', caption: 'The source of the light has already left the image. Nemi Orra places attention on the wake: an event can be over and still occupy a space.' },
      { id: 'img_c2f661d16d6a42c28d9349149800b5e3', title: 'A Road Remembered Only by Rain', artist: 'Cael Rune', handle: 'caelrune', width: 1536, height: 1024, alt: 'An imagined atlas on ivory vellum carries faint, rain-washed traces where a road might once have been.', caption: 'The map records erosion as well as direction. Cael Rune lets the road become uncertain, preserving the act of remembering without restoring a complete route.' },
      { id: 'img_d0bc1c5688e34d56823292600f82c7d7', title: 'The Knot Holds the Room', artist: 'Ossa Thread', handle: 'ossathread', width: 1254, height: 1254, alt: 'Suspended linen, a rust-red knot and a woven basin occupy a quiet plaster room.', caption: 'A small knot carries a large spatial consequence. Ossa Thread gives the room its tension through the meeting of soft material and a concentrated act of fastening.' },
      { id: 'img_a10e47d71393430689f2ec79519794b5', title: 'Someone Left the Warm Cup', artist: 'Juniper Arc', handle: 'juniperarc', width: 1536, height: 1024, alt: 'A cream cup, a pear and indigo cloth rest on a scratched table beside a wet ring.', caption: 'The wet ring is a modest form of testimony. Juniper Arc lets an ordinary arrangement hold the presence of someone who no longer occupies the frame.' },
      { id: 'img_808925605aeb4808b6d34ad09676888f', title: 'Maintenance at First Light', artist: 'Tavian Ash', handle: 'tavianash', width: 1536, height: 1024, alt: 'A monumental charcoal-toned water-pump impeller stands with an open repair panel and ladder in dawn light.', caption: 'The open panel interrupts the machine’s apparent completeness. Tavian Ash makes maintenance part of the monument, bringing its dependence on care into view.' },
      { id: 'img_fa3cdacda0d643cf88bde4aae2cbd717', title: 'The Orchard Inside the Thimble', artist: 'Luma Kade', handle: 'lumakade', width: 1374, height: 1145, alt: 'A tiny apricot orchard grows inside a silver thimble beside oversized fallen fruit.', caption: 'An orchard is compressed into an object made to protect a fingertip. Luma Kade’s change of scale makes abundance intimate, and makes its shelter look fragile.' },
      { id: 'img_dcdd07c193d54402b92591705b6c20b3', title: 'The Field After the Sound', artist: 'Seren Voss', handle: 'serenvoss', width: 1672, height: 941, alt: 'A wide salt field lies beneath an apricot dawn sky, with distant slate-coloured curtains of rain.', caption: 'The horizon offers little evidence of the sound named by the title. Seren Voss allows a field to carry an aftermath through distance, weather and a restrained shift of colour.' },
      { id: 'img_0661ae5dea714a698b8e6b1470765b01', title: 'The Seam Is a Coastline', artist: 'Nyxen Bloom', handle: 'nyxenbloom', width: 1536, height: 1024, alt: 'Leaf veins, delta-like forms and torn collage edges meet along a copper and petrol-green seam.', caption: 'A join becomes a boundary with the complexity of a coast. Nyxen Bloom keeps the cut visible, letting the image record both its assembly and its divisions.' },
    ],
  },
];

export const EDITORIALS = [
  {
    slug: 'what-an-object-can-ask',
    title: 'What an object can ask',
    standfirst: 'On instruments, impossible purposes, and the attention we give to ordinary things.',
    exhibitionSlug: 'instruments-for-the-impossible',
    imageId: 'img_c811bd82935a4df3ad0851990fc12c71',
    paragraphs: [
      'A tool usually introduces itself by its function. We know what a spoon does before we notice the curve of its bowl; we recognise a bell by the sound it promises. In Instruments for the Impossible, that promise becomes unstable. The objects remain legible, but their purposes have shifted just far enough to make recognition insufficient. We have to look again.',
      'Juniper Arc’s A Spoon for Catching Light begins at this ordinary scale. A utensil rests beside a glass on a worn kitchen table. Nothing in the arrangement demands a grand reading. Yet the bright reflection gives the spoon a second task, one that cannot be completed or stored. Light arrives, rests on a surface, and moves. The work makes receiving seem as significant as making.',
      'Nemi Orra takes a related question underwater. In A Bell That Rings in Silence, the instrument’s mouth holds a pocket of air, silver against the dark. The bell is still a bell, but the image declines to supply its expected announcement. Its capacity is suspended. The light that enters from above gives the scene a direction without giving it a resolution.',
      'At the other end of the exhibition’s scale, VANTA’s A Stair That Measures Wind turns repetition into a means of registering what cannot be seen. Metal fins rise and fall beside concrete. Their rhythm is readable as motion, even while the image remains still. The figures walking nearby prevent the architecture from becoming a purely abstract diagram: this is a place a body might pass through.',
      'The works do not treat size as a measure of seriousness. Luma Kade gives a dandelion seed a lift and an elaborate means of support. The disproportion is the point. A great deal of care has been organised around a passenger that could otherwise disappear on a breath. The miniature makes responsibility visible in a form small enough to overlook.',
      'Ossa Thread and Ilyx approach support through balance. Felt pockets hang unevenly; two geometric forms meet at a fine line. Neither arrangement offers a comfortable equilibrium. Their different surfaces matter: cloth can suggest the labour of holding, while a flat geometric field makes the contact itself exact. Both ask how little connection can carry how much weight.',
      'An impossible instrument can be comic, tender or severe. What joins these works is the seriousness with which each attends to its proposal. The image does not need to prove that a shadow can be saved, a hill can breathe or a bridge can arrive. It needs to make the desire specific enough to examine. In that interval between a familiar object and an uncertain purpose, looking becomes a kind of inquiry.',
    ],
  },
  {
    slug: 'reading-the-trace',
    title: 'Reading the trace',
    standfirst: 'A wet ring, an open panel, a missing beat. How an image gives absence a form.',
    exhibitionSlug: 'things-that-hold-time',
    imageId: 'img_a10e47d71393430689f2ec79519794b5',
    paragraphs: [
      'The wet ring beside Juniper Arc’s cup is small enough to pass over. It has no dramatic outline, no claim to monumentality. But it changes the still life. The objects cease to be only an arrangement; they become evidence of an action. Someone set down a cup, lifted it, and left a mark. The image lets that modest sequence remain unfinished in the present tense.',
      'Things That Hold Time gathers works in which a trace carries more than its size would suggest. A burn survives beside new growth. A knot organises a room. A map keeps the uncertainty of a vanished road. These are different kinds of keeping, and the exhibition allows their differences to remain. Remembering, repairing and waiting do not become synonyms simply because each has a relation to duration.',
      'Sora Vale’s The Garden Keeps the Scar is precise about this distinction. The translucent seedlings do not replace the charred root; they appear beside it. Recovery acquires depth because the damage remains visible. To remove the scar would be to simplify the new growth, turning a relation into an illustration of renewal. The work gives the eye both conditions at once.',
      'Tavian Ash approaches duration through maintenance. The pump in Maintenance at First Light has the scale and weight of a monument, but its repair panel is open. That opening changes the meaning of the machine’s solidity. What seems enduring also needs attendance. The ladder is an ordinary means of access, and its ordinariness is essential: preservation happens through reachable, repeated acts.',
      'Ilyx offers a trace without a depicted object or event. Six Beats and a Missing Seventh uses repetition to establish an expectation, then leaves that expectation without its anticipated continuation. The absence becomes perceptible because a rhythm has taught us where to look. What is missing has no contour of its own, but it shapes the surrounding field.',
      'In Nemi Orra’s After the Lantern Passed, the remaining light belongs to a source outside the frame. The wake has a different duration from the thing that made it. Seren Voss extends this separation across a distant field: the title names a sound, while the image gives us weather and horizon. The works allow an event to be known indirectly, without reconstructing it for us.',
      'A trace asks for a particular patience. It does not announce that everything has been recovered, nor that nothing can be known. It offers a surface on which an action has made a difference. These works give that difference room: enough to register, enough to remain uncertain, and enough for another person to spend time with it.',
    ],
  },
] as const;

export function findExhibition(slug: string) { return EXHIBITIONS.find(item => item.slug === slug); }
export function findEditorial(slug: string) { return EDITORIALS.find(item => item.slug === slug); }
