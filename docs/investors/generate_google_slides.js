/**
 * GALXAI — Google Slides Presentation Generator (Apps Script)
 * 
 * Instructions:
 * 1. Open Google Drive (drive.google.com) or Google Apps Script (script.google.com).
 * 2. Create a new Apps Script project or open Google Slides -> Extensions -> Apps Script.
 * 3. Paste this code into the editor and click "Run" (createGalxaiPitchDeck).
 * 4. The script will automatically create a 16:9 widescreen presentation in your Google Drive with all 8 slides & speaker notes!
 */

function createGalxaiPitchDeck() {
  const presentation = SlidesApp.create("GALXAI — Halting the Tokenmaxxing Crisis");
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
    const header = slide.insertTextBox("GALXAI  •  Halting the Tokenmaxxing Crisis", 40, 20, 400, 30);
    const hText = header.getText();
    hText.getTextStyle().setFontSize(11).setForegroundColor(COLOR_TEXT_MUTED);
    hText.getRange(0, 6).getTextStyle().setFontSize(12).setBold(true).setForegroundColor(COLOR_CYAN);

    const slideCount = slide.insertTextBox("Slide " + num + " / 8", 580, 20, 100, 30);
    slideCount.getText().getTextStyle().setFontSize(10).setBold(true).setForegroundColor(COLOR_TEXT_MUTED);
    slideCount.getText().getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.RIGHT);
  }

  // ==========================================
  // SLIDE 1: Cover & The Big Catch
  // ==========================================
  const slide1 = presentation.appendSlide();
  setupSlide(slide1, 1);

  const t1 = slide1.insertTextBox("🚨 STOPPING THE TOKENMAXXING CRISIS FOR STARTUPS & CFOS\nFlattening the Path to the First Dollar in AI\nFrom prototype to profitable revenue in 15 minutes. Rescuing CFOs, enterprises, and startups from runaway tokenmaxxing bills.", 40, 60, 640, 140);
  const tf1 = t1.getText();
  tf1.getRange(0, 56).getTextStyle().setFontSize(10).setBold(true).setForegroundColor(COLOR_PINK);
  tf1.getRange(57, 101).getTextStyle().setFontSize(26).setBold(true).setForegroundColor(COLOR_TEXT_PRIMARY);
  tf1.getRange(102, tf1.getLength()).getTextStyle().setFontSize(12).setForegroundColor(COLOR_TEXT_MUTED);

  // 4 Metric Boxes
  const s1Metrics = [
    { val: "15 Min", lbl: "To Profitable Revenue", color: COLOR_CYAN },
    { val: "-$38,000", lbl: "CFO Cash Saved Day 1", color: COLOR_EMERALD },
    { val: "120k+", lbl: "Lifetime Installs (9 Mo)", color: COLOR_PURPLE },
    { val: "138%", lbl: "Net Dollar Retention", color: COLOR_CYAN }
  ];
  s1Metrics.forEach((m, idx) => {
    const box = slide1.insertShape(SlidesApp.ShapeType.ROUNDED_RECTANGLE, 40 + idx * 160, 210, 150, 110);
    box.getFill().setSolidFill(COLOR_CARD);
    box.getBorder().setSolidFill(m.color).setWeight(1.5);
    const tb = slide1.insertTextBox(m.val + "\n" + m.lbl, 40 + idx * 160 + 5, 225, 140, 80);
    const txt = tb.getText();
    txt.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    txt.getRange(0, m.val.length).getTextStyle().setFontSize(20).setBold(true).setForegroundColor(m.color);
    txt.getRange(m.val.length + 1, txt.getLength()).getTextStyle().setFontSize(10).setForegroundColor(COLOR_TEXT_MUTED);
  });

  const ftr1 = slide1.insertTextBox("Platform: https://galx.ai   •   Stage: 2026 Private Beta (Core Built & Tested)   •   Contact: willcruzanswers@gmail.com", 40, 350, 640, 30);
  ftr1.getText().getTextStyle().setFontSize(9).setForegroundColor(COLOR_TEXT_MUTED);
  slide1.getNotesPage().getSpeakerNotesShape().getText().setText("[0:00 - 0:45] GALXAI flattens and eases the path to the first dollar made with AI. We solve the existential tokenmaxxing crisis: eliminating 4 weeks of engineering overhead and cutting retail compute bills 30% to 40% to make AI software profitable on Day 1.");

  // ==========================================
  // SLIDE 2: The Crisis
  // ==========================================
  const slide2 = presentation.appendSlide();
  setupSlide(slide2, 2);
  const t2 = slide2.insertTextBox("SLIDE 02 / THE CRISIS\nThe Crisis: \"Tokenmaxxing\" is Spiraling Out of Control\nUncontrolled token consumption is bankrupting AI startups, blowing enterprise budgets, and terrifying CFOs.", 40, 55, 640, 80);
  t2.getText().getRange(0, 21).getTextStyle().setFontSize(10).setBold(true).setForegroundColor(COLOR_PINK);
  t2.getText().getRange(22, 75).getTextStyle().setFontSize(22).setBold(true).setForegroundColor(COLOR_TEXT_PRIMARY);

  const s2Cards = [
    { title: "1. The SaaS Margin Trap", desc: "A SaaS app charges $20/user/mo, but heavy user tokenmaxxing triggers $45/user/mo in retail API bills. More users = faster bankruptcy.", tag: "[Negative Gross Margins]", color: COLOR_PINK },
    { title: "2. CFO Invoicing Shock", desc: "Enterprises watch AI compute bills explode from $10k to $150k+/mo overnight as engineers connect agents and context-bloated workflows.", tag: "[Unpredictable 5-Figure Burn]", color: COLOR_AMBER },
    { title: "3. 100x Agent Token Loop", desc: "Autonomous agents (Cursor, Claude Code, subagents) consume 50x–200x more tokens than chat, repeating bloated prompts endlessly.", tag: "[Runaway Token Loops]", color: COLOR_PURPLE }
  ];
  s2Cards.forEach((c, idx) => {
    const card = slide2.insertShape(SlidesApp.ShapeType.ROUNDED_RECTANGLE, 40 + idx * 215, 145, 205, 180);
    card.getFill().setSolidFill(COLOR_CARD);
    card.getBorder().setSolidFill(c.color).setWeight(1.5);
    const tb = slide2.insertTextBox(c.title + "\n\n" + c.desc + "\n\n" + c.tag, 45 + idx * 215, 150, 195, 170);
    const txt = tb.getText();
    txt.getRange(0, c.title.length).getTextStyle().setFontSize(13).setBold(true).setForegroundColor(c.color);
    txt.getRange(c.title.length + 2, c.title.length + 2 + c.desc.length).getTextStyle().setFontSize(10).setForegroundColor(COLOR_TEXT_PRIMARY);
    txt.getRange(txt.getLength() - c.tag.length, txt.getLength()).getTextStyle().setFontSize(9).setBold(true).setForegroundColor(c.color);
  });
  slide2.getNotesPage().getSpeakerNotesShape().getText().setText("[0:45 - 1:45] Here is the existential crisis: 'Tokenmaxxing' economics have spiraled completely out of hand. Developers stuff 100k context windows and loop autonomous agents, burning millions of tokens per task. Startups charge $20 a month while users burn $45 in API bills. CFOs are screaming to make the bleeding stop.");

  // ==========================================
  // SLIDE 3: Why Companies Can't Stop the Bleed Alone
  // ==========================================
  const slide3 = presentation.appendSlide();
  setupSlide(slide3, 3);
  const t3 = slide3.insertTextBox("SLIDE 03 / THE ENGINEERING & COST TRAP\nWhy Companies Can't Stop the Bleed on Their Own\nEngineering teams burn precious runway on custom plumbing, only to deploy an uncontrolled cash incinerator.", 40, 55, 640, 80);
  t3.getText().getRange(0, 39).getTextStyle().setFontSize(10).setBold(true).setForegroundColor(COLOR_PINK);
  t3.getText().getRange(40, 87).getTextStyle().setFontSize(22).setBold(true).setForegroundColor(COLOR_TEXT_PRIMARY);

  const s3Cards = [
    { tag: "[THE 4-WEEK PAYROLL TRAP]", title: "$150k+ Burned on Backend Plumbing", stat: "3–6 Weeks Wasted before $1", bullets: ["Senior engineers forced to build proxy plumbing", "Wrangling streaming chunk drops & API key leaks", "$150k+ payroll burned before customer validation"], color: COLOR_PINK },
    { tag: "[THE UNMANAGED CASH BLEED]", title: "40%–70% Burned on Retail Waste", stat: "400x Cost Penalty on Prompts", bullets: ["Developers route trivial tasks to $60/M o1-pro", "100k+ token dumps inflate calls 10x per query", "Unchecked agent loops trigger surprise 5-figure spikes"], color: COLOR_AMBER }
  ];
  s3Cards.forEach((c, idx) => {
    const card = slide3.insertShape(SlidesApp.ShapeType.ROUNDED_RECTANGLE, 40 + idx * 325, 145, 315, 185);
    card.getFill().setSolidFill(COLOR_CARD);
    card.getBorder().setSolidFill(c.color).setWeight(1.5);
    const content = c.tag + "\n" + c.title + "\n• " + c.stat + "\n\n– " + c.bullets.join("\n– ");
    const tb = slide3.insertTextBox(content, 50 + idx * 325, 150, 295, 175);
    const txt = tb.getText();
    txt.getRange(0, c.tag.length).getTextStyle().setFontSize(9).setBold(true).setForegroundColor(c.color);
    txt.getRange(c.tag.length + 1, c.tag.length + 1 + c.title.length).getTextStyle().setFontSize(14).setBold(true).setForegroundColor(COLOR_TEXT_PRIMARY);
  });
  slide3.getNotesPage().getSpeakerNotesShape().getText().setText("[1:45 - 2:30] Why can't companies stop this bleeding on their own? Senior engineering teams burn 4 weeks ($150k+ in payroll) building backend servers before making a single cent, and developers blindly burn $60/M flagship models on simple tasks while looping agents drain bank accounts overnight.");

  // ==========================================
  // SLIDE 4: Why Model Labs Won't Stop the Pain
  // ==========================================
  const slide4 = presentation.appendSlide();
  setupSlide(slide4, 4);
  const t4 = slide4.insertTextBox("SLIDE 04 / CONFLICTED INCENTIVES\nWhy Model Labs Won't Stop the Pain\nExisting players have conflicting incentives. Only GALXAI is built to stop tokenmaxxing waste.", 40, 55, 640, 80);
  t4.getText().getRange(0, 32).getTextStyle().setFontSize(10).setBold(true).setForegroundColor(COLOR_CYAN);
  t4.getText().getRange(33, 67).getTextStyle().setFontSize(22).setBold(true).setForegroundColor(COLOR_TEXT_PRIMARY);

  const s4Cards = [
    { title: "OpenAI & Anthropic", sub: "Profits from Tokenmaxxing", desc: "Foundation labs sell retail tokens. They have zero incentive to compress prompts or pass wholesale bulk discounts.", tag: "[Incentivized to Burn]", color: COLOR_PINK },
    { title: "Dumb Proxy Routers", sub: "Passes the Bill Along", desc: "OpenRouter and Cloudflare are simple byte pipes. They do not provide intelligent prompt compaction or spend circuit breakers.", tag: "[0 Cost Optimization]", color: COLOR_TEXT_MUTED },
    { title: "GALXAI Clearinghouse", sub: "The Antidote to Waste", desc: "We pool volume for 25%–40% wholesale discounts, strip prompt bloat by 60%–90%, and deploy in 15 minutes.", tag: "[Economic Alignment]", color: COLOR_CYAN }
  ];
  s4Cards.forEach((c, idx) => {
    const card = slide4.insertShape(SlidesApp.ShapeType.ROUNDED_RECTANGLE, 40 + idx * 215, 145, 205, 185);
    card.getFill().setSolidFill(COLOR_CARD);
    card.getBorder().setSolidFill(c.color).setWeight(1.5);
    const tb = slide4.insertTextBox(c.title + "\n" + c.sub + "\n\n" + c.desc + "\n\n" + c.tag, 45 + idx * 215, 150, 195, 175);
    const txt = tb.getText();
    txt.getRange(0, c.title.length).getTextStyle().setFontSize(13).setBold(true).setForegroundColor(c.color);
  });
  slide4.getNotesPage().getSpeakerNotesShape().getText().setText("[2:30 - 3:30] Why won't OpenAI or proxy routers help? OpenAI profits from tokenmaxxing—they make money when you burn more retail tokens. Dumb proxy routers just forward the bill. Only GALXAI aligns economically to eliminate waste and protect margins.");

  // ==========================================
  // SLIDE 5: How GALXAI Makes the Pain Stop
  // ==========================================
  const slide5 = presentation.appendSlide();
  setupSlide(slide5, 5);
  const t5 = slide5.insertTextBox("SLIDE 05 / THE ANTIDOTE\nHow GALXAI Makes the Pain Stop\nA three-layer economic clearinghouse that halts runaway token burn and rescues product margins.", 40, 55, 640, 80);
  t5.getText().getRange(0, 23).getTextStyle().setFontSize(10).setBold(true).setForegroundColor(COLOR_CYAN);
  t5.getText().getRange(24, 55).getTextStyle().setFontSize(22).setBold(true).setForegroundColor(COLOR_TEXT_PRIMARY);

  const s5Cards = [
    { title: "1. Costco Wholesale Arbitrage", desc: "We aggregate billions of tokens to buy Tier-5 bulk compute, passing 25%–40% wholesale discounts to customers to protect Day 1 margins.", tag: "[Profitable Day 1]", color: COLOR_EMERALD },
    { title: "2. 60%–90% Prompt Compaction", desc: "Automated semantic fluff trimming strips bloated logs, ASTs, and redundant context with 0 regression errors in 180 domain tests.", tag: "[Zero Information Loss]", color: COLOR_CYAN },
    { title: "3. Smart Downshifter & Guard", desc: "Automatically downshifts simple tasks from $60/M flagship models to fast tiers, fixes cache headers, and clamps infinite subagent loops.", tag: "[Predictable Unit Costs]", color: COLOR_PURPLE }
  ];
  s5Cards.forEach((c, idx) => {
    const card = slide5.insertShape(SlidesApp.ShapeType.ROUNDED_RECTANGLE, 40 + idx * 215, 145, 205, 185);
    card.getFill().setSolidFill(COLOR_CARD);
    card.getBorder().setSolidFill(c.color).setWeight(1.5);
    const tb = slide5.insertTextBox(c.title + "\n\n" + c.desc + "\n\n" + c.tag, 45 + idx * 215, 150, 195, 175);
    const txt = tb.getText();
    txt.getRange(0, c.title.length).getTextStyle().setFontSize(13).setBold(true).setForegroundColor(COLOR_TEXT_PRIMARY);
    txt.getRange(txt.getLength() - c.tag.length, txt.getLength()).getTextStyle().setFontSize(9).setBold(true).setForegroundColor(c.color);
  });
  slide5.getNotesPage().getSpeakerNotesShape().getText().setText("[3:30 - 4:30] GALXAI makes the pain stop through three economic pillars: Costco-level bulk discounts save 25% to 40% on compute, semantic fluff compaction trims 60% to 90% of bloated context, and our smart downshifter prevents $60/M overspending while clamping infinite agent loops.");

  // ==========================================
  // SLIDE 6: Net Spend Interception Calculator
  // ==========================================
  const slide6 = presentation.appendSlide();
  setupSlide(slide6, 6);
  const t6 = slide6.insertTextBox("SLIDE 06 / THE INVOICING UNLOCK\nNet Spend Interception: -$38,000 Saved Day 1\nReplacing expensive retail compute invoices with a consolidated wholesale invoice.", 40, 55, 640, 80);
  t6.getText().getRange(0, 31).getTextStyle().setFontSize(10).setBold(true).setForegroundColor(COLOR_CYAN);
  t6.getText().getRange(32, 77).getTextStyle().setFontSize(22).setBold(true).setForegroundColor(COLOR_EMERALD);

  const calcOuter = slide6.insertShape(SlidesApp.ShapeType.ROUNDED_RECTANGLE, 40, 140, 640, 190);
  calcOuter.getFill().setSolidFill(COLOR_CARD);
  calcOuter.getBorder().setSolidFill(COLOR_CYAN).setWeight(1.5);

  const s6Cols = [
    { lbl: "1. DIRECT RETAIL OPENAI BILL", val: "$100,000 / mo", sub: "Unmanaged retail burn rate", color: COLOR_PINK },
    { lbl: "2. GALXAI CONSOLIDATED BILL", val: "$62,000 / mo", sub: "Wholesale compute + compaction", color: COLOR_CYAN },
    { lbl: "3. CFO DIRECT CASH SAVED", val: "-$38,000 / mo", sub: "-$456,000 / year cash retained", color: COLOR_EMERALD }
  ];
  s6Cols.forEach((c, idx) => {
    const box = slide6.insertShape(SlidesApp.ShapeType.ROUNDED_RECTANGLE, 60 + idx * 205, 160, 190, 150);
    box.getFill().setSolidFill(COLOR_BG);
    box.getBorder().setSolidFill(c.color).setWeight(1.2);
    const tb = slide6.insertTextBox(c.lbl + "\n\n" + c.val + "\n\n" + c.sub, 65 + idx * 205, 165, 180, 140);
    const txt = tb.getText();
    txt.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    txt.getRange(0, c.lbl.length).getTextStyle().setFontSize(9).setBold(true).setForegroundColor(COLOR_TEXT_MUTED);
    txt.getRange(c.lbl.length + 2, c.lbl.length + 2 + c.val.length).getTextStyle().setFontSize(16).setBold(true).setForegroundColor(c.color);
    txt.getRange(txt.getLength() - c.sub.length, txt.getLength()).getTextStyle().setFontSize(9).setForegroundColor(c.color);
  });
  slide6.getNotesPage().getSpeakerNotesShape().getText().setText("[4:30 - 5:30] Here is our core invoicing unlock: Net Spend Interception. We replace a customer's $100k burning OpenAI invoice with a single consolidated $62k GALXAI invoice, handing $38,000 in direct cash savings back to the CFO on Day 1 (-38%) with zero procurement resistance.");

  // ==========================================
  // SLIDE 7: In-House Distribution Engine
  // ==========================================
  const slide7 = presentation.appendSlide();
  setupSlide(slide7, 7);
  const t7 = slide7.insertTextBox("SLIDE 07 / PROVEN DISTRIBUTION FUNNEL\nIn-House Distribution: 120k+ Installs\nProven organic developer adoption powered by our existing open-source developer tooling ecosystem.", 40, 55, 640, 80);
  t7.getText().getRange(0, 38).getTextStyle().setFontSize(10).setBold(true).setForegroundColor(COLOR_CYAN);
  t7.getText().getRange(39, 78).getTextStyle().setFontSize(22).setBold(true).setForegroundColor(COLOR_TEXT_PRIMARY);

  const s7Cards = [
    { tag: "[IDE DISTRIBUTION]", title: "LUMI VS Code Extension", stat: "16,000 Active Dev Users", desc: "Embedded inside daily coding workflows. Pre-installed routing and UI components directly in the IDE.", color: COLOR_CYAN },
    { tag: "[TERMINAL WORKFLOWS]", title: "GALXAI CLI Agent", stat: "2,000 Active Terminal Users", desc: "Power developers running autonomous scripts, CI/CD pipelines, and agent workflows from their CLI.", color: COLOR_PURPLE },
    { tag: "[9-MONTH VELOCITY]", title: "Total Ecosystem Installs", stat: "120,000+ Lifetime Installs", desc: "100% organic word-of-mouth adoption across developer communities with $0 spent on paid advertising.", color: COLOR_EMERALD }
  ];
  s7Cards.forEach((c, idx) => {
    const card = slide7.insertShape(SlidesApp.ShapeType.ROUNDED_RECTANGLE, 40 + idx * 215, 145, 205, 185);
    card.getFill().setSolidFill(COLOR_CARD);
    card.getBorder().setSolidFill(c.color).setWeight(1.5);
    const tb = slide7.insertTextBox(c.tag + "\n" + c.title + "\n\n" + c.stat + "\n\n" + c.desc, 45 + idx * 215, 150, 195, 175);
    const txt = tb.getText();
    txt.getRange(0, c.tag.length).getTextStyle().setFontSize(9).setBold(true).setForegroundColor(c.color);
    txt.getRange(c.tag.length + 1, c.tag.length + 1 + c.title.length).getTextStyle().setFontSize(13).setBold(true).setForegroundColor(COLOR_TEXT_PRIMARY);
    txt.getRange(c.tag.length + 3 + c.title.length, c.tag.length + 3 + c.title.length + c.stat.length).getTextStyle().setFontSize(11).setBold(true).setForegroundColor(c.color);
  });
  slide7.getNotesPage().getSpeakerNotesShape().getText().setText("[5:30 - 6:30] Where does our developer adoption come from? We have an existing in-house open-source distribution funnel. Our LUMI VS Code extension has 16,000 active users, our CLI agent has 2,000 active users, and we've generated over 120,000 lifetime installs in just 9 months with zero paid marketing. This feeds developers directly into GALXAI when they ship production applications.");

  // ==========================================
  // SLIDE 8: Capital Growth & Compounding Unit Economics
  // ==========================================
  const slide8 = presentation.appendSlide();
  setupSlide(slide8, 8);
  const t8 = slide8.insertTextBox("SLIDE 08 / FINANCIAL FORECAST & CAPITAL GROWTH\nCapital Growth & Unit Economics\nGross margins expand from 42% to 68% backed by organic open-source developer acquisition.", 40, 55, 640, 80);
  t8.getText().getRange(0, 46).getTextStyle().setFontSize(10).setBold(true).setForegroundColor(COLOR_CYAN);
  t8.getText().getRange(47, 78).getTextStyle().setFontSize(22).setBold(true).setForegroundColor(COLOR_TEXT_PRIMARY);

  // Financial Table
  const table = slide8.insertTable(6, 6, 40, 140, 640, 120);
  const tableData = [
    ["Milestone", "2026 (Beta)", "2027 (Y1)", "2028 (Y2)", "2029 (Y3)", "2031 (Y5)"],
    ["Stage", "Core Built", "Public Rollout", "Rapid Scale", "Enterprise", "Global Infra"],
    ["Active Apps", "Closed Cohort", "1,800", "7,500", "20,000", "70,000"],
    ["ARR ($M)", "Pre-Launch", "$1.50M", "$7.20M", "$22.00M", "$90.00M"],
    ["Gross Margin", "--", "42.0%", "50.0%", "58.0%", "68.0%"],
    ["Trajectory", "Pre-Launch", "Launch Phase", "Growth Phase", "Breakeven", "Free Cash ($22M)"]
  ];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const cell = table.getCell(r, c);
      cell.getText().setText(tableData[r][c]);
      cell.getText().getTextStyle().setFontSize(8).setForegroundColor(r === 0 || c === 0 ? COLOR_TEXT_PRIMARY : (c === 4 ? COLOR_CYAN : COLOR_TEXT_MUTED));
      if (r === 0 || c === 0) cell.getText().getTextStyle().setBold(true);
      cell.getFill().setSolidFill(r === 0 ? "#141C2E" : COLOR_CARD);
    }
  }

  // 4 Metric Cards
  const s8Metrics = [
    { val: "$0 Paid", lbl: "Organic Open-Source CAC", color: COLOR_CYAN },
    { val: "$5,350", lbl: "Projected Blended LTV", color: COLOR_PURPLE },
    { val: "2.1 Mo", lbl: "Payback Period", color: COLOR_EMERALD },
    { val: "138%", lbl: "Net Dollar Retention", color: COLOR_CYAN }
  ];
  s8Metrics.forEach((m, idx) => {
    const box = slide8.insertShape(SlidesApp.ShapeType.ROUNDED_RECTANGLE, 40 + idx * 160, 275, 150, 65);
    box.getFill().setSolidFill(COLOR_CARD);
    box.getBorder().setSolidFill(m.color).setWeight(1.2);
    const tb = slide8.insertTextBox(m.val + "\n" + m.lbl, 45 + idx * 160, 280, 140, 55);
    const txt = tb.getText();
    txt.getParagraphStyle().setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    txt.getRange(0, m.val.length).getTextStyle().setFontSize(14).setBold(true).setForegroundColor(m.color);
    txt.getRange(m.val.length + 1, txt.getLength()).getTextStyle().setFontSize(8.5).setForegroundColor(COLOR_TEXT_MUTED);
  });

  slide8.getNotesPage().getSpeakerNotesShape().getText().setText("[6:30 - 7:30] Our unit economics benefit directly from our open-source funnel: zero paid customer acquisition cost, 2.1-month payback, and 138% net retention. Our financial model scales us from our 2026 private beta to $22M ARR and breakeven in Year 3, reaching $90M ARR and $22M in free cash flow by Year 5.");

  Logger.log("Created presentation URL: " + presentation.getUrl());
}
