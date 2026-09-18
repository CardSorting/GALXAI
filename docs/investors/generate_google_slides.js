/**
 * GALX — Google Slides Presentation Generator (Apps Script)
 * 
 * Instructions:
 * 1. Open Google Drive (drive.google.com) or Google Apps Script (script.google.com).
 * 2. Create a new Apps Script project or open Google Slides -> Extensions -> Apps Script.
 * 3. Paste this code into the editor and click "Run" (createGalxPitchDeck).
 * 4. The script will automatically create a 16:9 widescreen presentation in your Google Drive with all 10 slides & speaker notes!
 */

function createGalxPitchDeck() {
  const presentation = SlidesApp.create("GALX — Venture Formation Thesis");
  const slides = presentation.getSlides();
  if (slides.length > 0) {
    slides[0].remove(); // Remove default title slide
  }

  // Color Palette Constants
  const COLOR_BG = "#06080D";
  const COLOR_CARD = "#0D121E";
  const COLOR_CYAN = "#00F0FF";
  const COLOR_PURPLE = "#A855F7";
  const COLOR_PINK = "#EC4899";
  const COLOR_EMERALD = "#10B981";
  const COLOR_AMBER = "#F59E0B";
  const COLOR_TEXT_PRIMARY = "#F8FAFC";
  const COLOR_TEXT_MUTED = "#94A3B8";

  function setupSlide(slide, num) {
    slide.getBackground().setSolidFill(COLOR_BG);
    
    // Header text
    const header = slide.insertTextBox("GALX  •  Venture Formation Thesis", 40, 20, 400, 30);
    const hText = header.getText();
    hText.getTextStyle().setFontSize(11).setForegroundColor(COLOR_TEXT_MUTED);
    hText.getRange(0, 4).getTextStyle().setFontSize(12).setBold(true).setForegroundColor(COLOR_CYAN);

    const slideCount = slide.insertTextBox("Slide " + num + " / 10", 580, 20, 100, 30);
    slideCount.getText().getTextStyle().setFontSize(10).setBold(true).setForegroundColor(COLOR_TEXT_MUTED);
    slideCount.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.RIGHT);
  }

  const slidesData = [
    {
      title: "Sustainable, Abundant AI Access for Anyone Who Wants to Build",
      subtitle: "The abstraction layer for the next era of software creation.",
      points: [
        { t: "Two Managed Models", b: "Concentrated surface, including GALX Nova." },
        { t: "Standard API Access", b: "Instant drop-in integration without custom proxies." },
        { t: "Abundant Serving", b: "Dependable operational execution at scale." },
        { t: "Build What You Want", b: "Simplicity is the intentional product decision." }
      ],
      notes: "GALX is building the abstraction layer for the next era of software creation. We believe AI capability will continue becoming abundant, but accessing and operating it is becoming fragmented and complicated. Our mission is to make intelligence abundant, reliable, and dead simple for anyone who wants to build."
    },
    {
      title: "The Future: Abundant Intelligence, Fragmented Infrastructure",
      subtitle: "AI capability is becoming abundant, while the systems required to access and sustain it are fragmenting.",
      points: [
        { t: "What Is Coming", b: "AI capability is becoming the fundamental substrate of all software creation." },
        { t: "The Impending Bottleneck", b: "Multiplying models, providers, and pricing structures create severe operational fragmentation." }
      ],
      notes: "Every investor agrees that AI capability is exploding. But as capability grows, the infrastructure underneath it is fragmenting. Developers now have to navigate dozens of providers, fluctuating pricing models, capacity cliffs, and API changes. The long-term winner won't be another model catalog that exposes all this chaos—it will be an abstraction layer that makes it disappear."
    },
    {
      title: "The Non-Consensus Thesis: The Sufficiency Principle",
      subtitle: "For a large class of applications, developers do not need maximum available intelligence. They need sufficient intelligence, reliably and economically delivered, to complete the task.",
      points: [
        { t: "The Consensus Trap", b: "Obsession with benchmark supremacy and endless model dropdowns." },
        { t: "The Intermediary Moat", b: "Model proliferation creates an opportunity for an intermediary to absorb complexity." }
      ],
      notes: "The market is obsessed with benchmark supremacy and exposing 100 model choices. Our thesis is different: For most real-world software, developers don't need maximum available intelligence—they need sufficient intelligence, reliably and economically delivered, to complete the job. As the ecosystem becomes more complicated, our opportunity to absorb that complexity grows."
    },
    {
      title: "Product Today: Radical Simplicity",
      subtitle: "Two models. API access. Abundant serving. Build what you want.",
      points: [
        { t: "Two Models", b: "Access focused models under clear GALX identities such as GALX Nova." },
        { t: "Standard API", b: "Drop-in execution with zero custom proxy plumbing." },
        { t: "Abundant Serving", b: "GALX handles availability, capacity, and resilience behind the scenes." }
      ],
      notes: "We make the current product brutally simple: Two models. API access. Abundant serving. Build what you want. We provide access to a tightly managed surface, featuring GALX Nova, through a clean API. We know about the machinery so the developer does not have to."
    },
    {
      title: "The Wedge: Builders Who Want to Make Something",
      subtitle: "We focus on high-velocity creators who want to build software rather than manage inference infrastructure.",
      points: [
        { t: "Independent Developers", b: "Building indie SaaS and productivity tools with predictable costs." },
        { t: "Creative Technologists", b: "Crafting interactive apps and media without cloud console friction." },
        { t: "AI Experimenters", b: "Testing application loops and agent workflows rapidly." }
      ],
      notes: "We aren't chasing bureaucratic enterprise RFP cycles today. Our initial wedge is builders—hobbyists, independent developers, creative technologists, and engineers experimenting with AI applications. They want to make something without model configuration and server maintenance becoming another full-time job. We give them an API key and let them build."
    },
    {
      title: "Why This Can Become Enormous",
      subtitle: "GALX sits directly between the application and fragmented intelligence infrastructure.",
      points: [
        { t: "The Expansion Loop", b: "More Builders -> More Applications -> More Application Usage -> More Execution Through GALX." },
        { t: "The Persistent Execution Layer", b: "Software built on GALX generates ongoing recurring execution demand with every user click." }
      ],
      notes: "Why is this venture-scale? Not because inference is big, but because of where GALX sits. When builders launch software on GALX, every user action in their app generates continuing execution through our platform. More builders lead to more applications, which lead to more end-user traffic, driving compounding execution volume through GALX."
    },
    {
      title: "Asymmetric Advantage: Absorb Complexity, Sell Simplicity",
      subtitle: "Operating knowledge turns heterogeneous, volatile AI capacity into a reliable developer product.",
      points: [
        { t: "Developer Simplicity", b: "Clean, dependable API with zero infrastructure maintenance." },
        { t: "Proprietary Depth", b: "Proprietary operational knowledge required to run heterogeneous capacity economically." }
      ],
      notes: "Our advantage is the operational knowledge required to turn heterogeneous, volatile AI capacity into a dead-simple developer product. The public product becomes simpler while the knowledge required to operate it becomes deeper. That asymmetry is our moat: GALX absorbs complexity and sells simplicity."
    },
    {
      title: "Founder-Market Fit: Built From Direct Systems Operation",
      subtitle: "Arrived at the problem through building AI applications and living the operational constraints.",
      points: [
        { t: "Hands-On Experience", b: "Direct exposure to building AI applications and operating autonomous agent systems." },
        { t: "Operational Learning", b: "Learning and iterating through live traffic and operational feedback." }
      ],
      notes: "I didn't start GALX from an investment thesis spreadsheet. I started it because I was building AI applications and operating autonomous agent systems, and I ran headfirst into the reliability, cost, and complexity walls of existing infrastructure. GALX was built out of operational necessity, and we are learning and adapting through live traffic every single day."
    },
    {
      title: "Evidence: Observations vs. Next Validations",
      subtitle: "Separating conviction from verified observations and upcoming milestones.",
      points: [
        { t: "What We Believe", b: "Abundant intelligence belongs behind a dependable abstraction layer." },
        { t: "What We Observed", b: "Representative workloads require substantially less model capability than assumed." },
        { t: "What We Demonstrated", b: "A functional, high-reliability platform serving real developer requests." },
        { t: "What We Are Testing Next", b: "Builder retention, application usage growth, and long-term execution margins." }
      ],
      notes: "We believe in intellectual honesty. We have demonstrated a functional, reliable two-model platform. We have observed that many real-world workloads do not require frontier overkill. What we are proving next is developer retention, application lifecycle longevity, and sustained gross margins as our builders scale."
    },
    {
      title: "The Venture Test: What Becomes Enormous?",
      subtitle: "GALX becomes the primary abstraction and execution layer through which software consumes AI capability.",
      points: [
        { t: "Scale Capacity", b: "Expand serving infrastructure to support high-concurrency builder apps." },
        { t: "Instrument Resilience", b: "Deepen operational knowledge tooling and serving cost optimization." },
        { t: "Onboard Builders", b: "Seed the next 1,000 applications building on top of GALX execution." }
      ],
      notes: "If GALX is right, what becomes enormous? We don't just sell inexpensive tokens. GALX becomes the primary execution layer through which software consumes intelligence. This round of capital allows us to expand our capacity, onboard thousands of builders, and prove that sustainable, abundant AI access is the winning foundation for software."
    }
  ];

  slidesData.forEach((sData, idx) => {
    const slide = presentation.appendSlide();
    setupSlide(slide, idx + 1);

    // Title & Subtitle
    const titleBox = slide.insertTextBox(sData.title, 40, 50, 640, 50);
    titleBox.getText().getTextStyle().setFontSize(20).setBold(true).setForegroundColor(COLOR_TEXT_PRIMARY);

    const subBox = slide.insertTextBox(sData.subtitle, 40, 100, 640, 50);
    subBox.getText().getTextStyle().setFontSize(11).setForegroundColor(COLOR_CYAN);

    // Content cards
    const numCards = sData.points.length;
    const cardWidth = (640 - (15 * (numCards - 1))) / numCards;
    sData.points.forEach((pt, pIdx) => {
      const left = 40 + pIdx * (cardWidth + 15);
      const card = slide.insertShape(SlidesApp.ShapeType.ROUNDED_RECTANGLE, left, 170, cardWidth, 180);
      card.getFill().setSolidFill(COLOR_CARD);
      card.getBorder().getLineFill().setSolidFill("#1E293B");

      const cardText = card.getText();
      cardText.setText(pt.t + "\n\n" + pt.b);
      cardText.getRange(0, pt.t.length).getTextStyle().setFontSize(13).setBold(true).setForegroundColor(COLOR_TEXT_PRIMARY);
      cardText.getRange(pt.t.length + 2, cardText.getLength()).getTextStyle().setFontSize(10).setForegroundColor(COLOR_TEXT_MUTED);
    });

    // Notes
    slide.getNotesPage().getSpeakerNotesShape().getText().setText(sData.notes);
  });
}
