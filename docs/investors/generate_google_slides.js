/**
 * GALX — Augmented Creative Intelligence investor deck (Apps Script)
 *
 * Open this file in Google Apps Script and run createGalxPitchDeck(). It
 * creates a ten-slide presentation whose copy follows the canonical
 * specification in 02_PITCH_DECK_SLIDE_BY_SLIDE.md.
 */

function createGalxPitchDeck() {
  const presentation = SlidesApp.create("GALX — Augmented Creative Intelligence");
  const slides = presentation.getSlides();
  if (slides.length > 0) slides[0].remove();

  const COLOR_BG = "#08090F";
  const COLOR_CARD = "#141523";
  const COLOR_CARD_BORDER = "#30334A";
  const COLOR_CYAN = "#8DEBFF";
  const COLOR_PURPLE = "#BFA4FF";
  const COLOR_PINK = "#FF9CCB";
  const COLOR_TEXT_PRIMARY = "#F8FAFC";
  const COLOR_TEXT_MUTED = "#A8ADBF";

  function setupSlide(slide, number) {
    slide.getBackground().setSolidFill(COLOR_BG);

    const header = slide.insertTextBox("GALX  •  Augmented Creative Intelligence", 40, 20, 490, 30);
    const headerText = header.getText();
    headerText.getTextStyle().setFontSize(11).setForegroundColor(COLOR_TEXT_MUTED);
    headerText.getRange(0, 4).getTextStyle().setFontSize(12).setBold(true).setForegroundColor(COLOR_CYAN);

    const slideCount = slide.insertTextBox("Slide " + number + " / 10", 580, 20, 100, 30);
    slideCount.getText().getTextStyle().setFontSize(10).setBold(true).setForegroundColor(COLOR_TEXT_MUTED);
    slideCount.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.RIGHT);
  }

  const slidesData = [
    {
      title: "More capable machines will create demand for more capable people",
      subtitle: "GALX is building around what people become able to accomplish through agents.",
      points: [
        { t: "The forecast", b: "Agent capability may shift the bottleneck from execution to direction." },
        { t: "The first proof", b: "One person creates something meaningful that was previously beyond practical reach." }
      ],
      notes: "GALX is building around a forecast for the agent age: more capable machines will create demand for more capable people. The opportunity is not only what an agent can execute; it is what a person becomes able to create through that agent."
    },
    {
      title: "The bottleneck is between human intention and agent execution",
      subtitle: "Creative work often develops through interaction rather than a single complete instruction.",
      points: [
        { t: "The relationship", b: "Express → delegate → inspect → redirect → preserve → continue." },
        { t: "The risk", b: "More output can leave the person with more interpretation and correction." }
      ],
      notes: "The product question is whether a person can reliably turn agent capability toward something they actually intend. This is not an argument against autonomy; successful delegation can expand capability when it serves the person's purpose."
    },
    {
      title: "Augmented Creative Intelligence changes the unit of analysis",
      subtitle: "The system is the person, their agents, their tools, and the work they create together.",
      points: [
        { t: "ACI asks", b: "What can the person now initiate, influence, complete, and return to?" },
        { t: "ACI is not", b: "A claim that GALX invented human augmentation or a new model category." }
      ],
      notes: "We call the thesis Augmented Creative Intelligence, or ACI. It is a product and market forecast: make the combined system useful enough that people choose it repeatedly."
    },
    {
      title: "The first individual experiment is obtainable now",
      subtitle: "Enough capability exists to test the creative experience directly, without building an institution first.",
      points: [
        { t: "Then", b: "DreamBees pursued creative range when the capability layer was harder to access." },
        { t: "Now", b: "Agentic capability makes the person-level experiment practical to run and measure." }
      ],
      notes: "The timing claim is not that every creative workload is solved. It is that the first experiment—one person pursuing a meaningful idea through an agent-supported workflow—is obtainable enough to test."
    },
    {
      title: "The founder has studied both sides of the relationship",
      subtitle: "Human-centered systems, creative work, agent construction, and operational judgment meet in one problem.",
      points: [
        { t: "Continuity", b: "DreamBees → LUMI → GALX: recurring pursuit of individual creative capability." },
        { t: "Evidence", b: "The May 2026 JoyZoning report distinguished generated changes from accepted work." }
      ],
      notes: "William's founder fit is proximity to both what people are trying to make and what happens when working systems act. The JoyZoning field report is project evidence, not independent market validation; it shows that the generation-versus-completion distinction predates the positioning."
    },
    {
      title: "One creator. One visual idea. One meaningful result.",
      subtitle: "Image creation and community discovery are the focused commercial entry point.",
      points: [
        { t: "The loop", b: "Bring an idea → direct and revise → keep or share → return." },
        { t: "The customer", b: "An independent creator with recurring visual ideas, not a one-time generator." }
      ],
      notes: "GALX starts with image creation and community discovery for independent creators with visual ideas they want to develop repeatedly. The product must be useful when one person is present, before community scale."
    },
    {
      title: "Permission becomes action; the product earns the next visit",
      subtitle: "HEAV3NS MANDATE activates. LUMI remains a software-creation instrument.",
      points: [
        { t: "HEAV3NS MANDATE", b: "The call to begin—not a product tier or a promise to be productive." },
        { t: "LUMI", b: "A maintained expression of the thesis, not a second general-purpose coding-agent race." }
      ],
      notes: "HEAV3NS MANDATE turns available capability into permission to begin. LUMI is coding-agent-shaped but is judged on what a person can create through it. Neither replaces the focused GALX image-creation wedge."
    },
    {
      title: "Turn individual capability into repeatable paid value",
      subtitle: "The economic unit is a retained, paying creator—not an externally supplied token.",
      points: [
        { t: "The sequence", b: "Meaningful result → recurring projects → retained creator → preferred environment." },
        { t: "The scale condition", b: "Customer value must grow faster than founder intervention." }
      ],
      notes: "The venture opportunity is to deliver independently useful creative capability to a large population of people with recurring reasons to use it. Expansion begins with depth, then follows demonstrated demand."
    },
    {
      title: "The thesis must survive comparison, behavior, and economics",
      subtitle: "Capability, product, and business are separate proofs.",
      points: [
        { t: "Capability", b: "Meaningful completion, direction, revision, and recoverability." },
        { t: "Product", b: "Independent return and preference over relevant alternatives." },
        { t: "Business", b: "Payment, sustainable cost to serve, and repeatable distribution." }
      ],
      notes: "Human-AI collaboration must be evaluated rather than assumed. GALX will compare relevant tools and measure meaningful work, return behavior, payment, cost to serve, and founder intervention. HCI is founder fit; accumulated product learning is a defensibility hypothesis."
    },
    {
      title: "Make the first proof small enough to perform",
      subtitle: "Capital accelerates product quality, bounded cohorts, measurement, and dependable delivery.",
      points: [
        { t: "Next milestones", b: "Meaningful capability → paid return → repeatable delivery." },
        { t: "The close", b: "One person demonstrates possibility; repeated use and payment demonstrate the business." }
      ],
      notes: "Capital should strengthen the image-first experience, run bounded activation cohorts, measure behavior and willingness to pay, and build delivery capacity that removes founder dependency. It should not finance a return to arbitrary public inference demand or every possible medium."
    }
  ];

  slidesData.forEach((slideData, index) => {
    const slide = presentation.appendSlide();
    setupSlide(slide, index + 1);

    const titleBox = slide.insertTextBox(slideData.title, 40, 50, 640, 60);
    titleBox.getText().getTextStyle().setFontSize(20).setBold(true).setForegroundColor(COLOR_TEXT_PRIMARY);

    const subtitleBox = slide.insertTextBox(slideData.subtitle, 40, 112, 640, 45);
    subtitleBox.getText().getTextStyle().setFontSize(11).setForegroundColor(COLOR_CYAN);

    const cardGap = 15;
    const cardWidth = (640 - (cardGap * (slideData.points.length - 1))) / slideData.points.length;
    slideData.points.forEach((point, pointIndex) => {
      const left = 40 + pointIndex * (cardWidth + cardGap);
      const card = slide.insertShape(SlidesApp.ShapeType.ROUNDED_RECTANGLE, left, 180, cardWidth, 180);
      card.getFill().setSolidFill(COLOR_CARD);
      card.getBorder().getLineFill().setSolidFill(pointIndex === 0 ? COLOR_PURPLE : COLOR_CARD_BORDER);

      const cardText = card.getText();
      cardText.setText(point.t + "\n\n" + point.b);
      cardText.getRange(0, point.t.length).getTextStyle().setFontSize(13).setBold(true).setForegroundColor(COLOR_TEXT_PRIMARY);
      cardText.getRange(point.t.length + 2, cardText.getLength()).getTextStyle().setFontSize(10).setForegroundColor(COLOR_TEXT_MUTED);
    });

    slide.getNotesPage().getSpeakerNotesShape().getText().setText(slideData.notes);
  });
}
