import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.dml.color import RGBColor

def create_deck():
    prs = Presentation()
    # 16:9 Widescreen dimensions
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_slide_layout = prs.slide_layouts[6]

    # Color Palette
    COLOR_BG = RGBColor(6, 8, 13)          # #06080D
    COLOR_CARD = RGBColor(13, 18, 30)       # #0D121E
    COLOR_CARD_BORDER = RGBColor(30, 41, 59)# #1E293B
    COLOR_CYAN = RGBColor(0, 240, 255)      # #00F0FF
    COLOR_PURPLE = RGBColor(168, 85, 247)   # #A855F7
    COLOR_PINK = RGBColor(236, 72, 153)     # #EC4899
    COLOR_EMERALD = RGBColor(16, 185, 129)  # #10B981
    COLOR_AMBER = RGBColor(245, 158, 11)    # #F59E0B
    COLOR_TEXT_PRIMARY = RGBColor(248, 250, 252) # #F8FAFC
    COLOR_TEXT_MUTED = RGBColor(148, 163, 184)   # #94A3B8
    COLOR_TEXT_DARK = RGBColor(100, 116, 139)    # #64748B

    def set_slide_bg(slide):
        bg_shape = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), prs.slide_width, prs.slide_height
        )
        bg_shape.fill.solid()
        bg_shape.fill.fore_color.rgb = COLOR_BG
        bg_shape.line.fill.background() # No border
        return bg_shape

    def add_header(slide, slide_num, total_slides=8):
        # Header Container
        header_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.733), Inches(0.5))
        tf = header_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        
        # Logo & Brand
        r1 = p.add_run()
        r1.text = "GALXAI "
        r1.font.bold = True
        r1.font.size = Pt(14)
        r1.font.color.rgb = COLOR_CYAN
        
        r2 = p.add_run()
        r2.text = "•  Halting the Tokenmaxxing Crisis"
        r2.font.size = Pt(11)
        r2.font.color.rgb = COLOR_TEXT_MUTED

        # Slide Number on Right
        num_box = slide.shapes.add_textbox(Inches(10.5), Inches(0.4), Inches(2.0), Inches(0.5))
        tf2 = num_box.text_frame
        tf2.margin_left = tf2.margin_top = tf2.margin_right = tf2.margin_bottom = 0
        p2 = tf2.paragraphs[0]
        p2.alignment = PP_ALIGN.RIGHT
        r_num = p2.add_run()
        r_num.text = f"Slide {slide_num} / {total_slides}"
        r_num.font.bold = True
        r_num.font.size = Pt(11)
        r_num.font.color.rgb = COLOR_TEXT_MUTED

    def add_card(slide, left, top, width, height, bg_color=COLOR_CARD, border_color=COLOR_CARD_BORDER):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = bg_color
        card.line.color.rgb = border_color
        card.line.width = Pt(1.5)
        return card

    # ==========================================================
    # SLIDE 1: Cover & The Big Catch
    # ==========================================================
    slide1 = prs.slides.add_slide(blank_slide_layout)
    set_slide_bg(slide1)
    add_header(slide1, 1)

    # Title Box
    title_box = slide1.shapes.add_textbox(Inches(0.8), Inches(1.1), Inches(11.733), Inches(2.2))
    tf1 = title_box.text_frame
    tf1.word_wrap = True
    
    p_meta = tf1.paragraphs[0]
    r_meta = p_meta.add_run()
    r_meta.text = "🚨 STOPPING THE TOKENMAXXING CRISIS FOR STARTUPS & CFOS"
    r_meta.font.bold = True
    r_meta.font.size = Pt(11)
    r_meta.font.color.rgb = COLOR_PINK

    p_title = tf1.add_paragraph()
    p_title.space_before = Pt(8)
    r_t1 = p_title.add_run()
    r_t1.text = "Flattening the Path to the "
    r_t1.font.bold = True
    r_t1.font.size = Pt(36)
    r_t1.font.color.rgb = COLOR_TEXT_PRIMARY

    r_t2 = p_title.add_run()
    r_t2.text = "First Dollar in AI"
    r_t2.font.bold = True
    r_t2.font.size = Pt(36)
    r_t2.font.color.rgb = COLOR_CYAN

    p_sub = tf1.add_paragraph()
    p_sub.space_before = Pt(8)
    r_sub = p_sub.add_run()
    r_sub.text = "From prototype to profitable revenue in 15 minutes. Rescuing CFOs, enterprises, and startups from runaway tokenmaxxing bills and negative unit economics."
    r_sub.font.size = Pt(14)
    r_sub.font.color.rgb = COLOR_TEXT_MUTED

    # 4 Stat Cards
    metrics_s1 = [
        ("15 Min", "To Profitable Revenue", COLOR_CYAN),
        ("-$38,000", "CFO Cash Saved Day 1", COLOR_EMERALD),
        ("120k+", "Lifetime Installs (9 Mo)", COLOR_PURPLE),
        ("138%", "Net Dollar Retention", COLOR_CYAN)
    ]
    card_w = Inches(2.7)
    card_gap = Inches(0.31)
    start_x = Inches(0.8)
    top_y = Inches(3.6)
    card_h = Inches(2.2)

    for i, (val, label, color) in enumerate(metrics_s1):
        x = start_x + i * (card_w + card_gap)
        add_card(slide1, x, top_y, card_w, card_h, COLOR_CARD, color)
        tb = slide1.shapes.add_textbox(x + Inches(0.15), top_y + Inches(0.35), card_w - Inches(0.3), card_h - Inches(0.7))
        tf = tb.text_frame
        tf.word_wrap = True
        p_val = tf.paragraphs[0]
        p_val.alignment = PP_ALIGN.CENTER
        r_v = p_val.add_run()
        r_v.text = val
        r_v.font.bold = True
        r_v.font.size = Pt(28)
        r_v.font.color.rgb = color

        p_lbl = tf.add_paragraph()
        p_lbl.space_before = Pt(12)
        p_lbl.alignment = PP_ALIGN.CENTER
        r_l = p_lbl.add_run()
        r_l.text = label
        r_l.font.size = Pt(12)
        r_l.font.color.rgb = COLOR_TEXT_MUTED

    # Footer
    ftr_box = slide1.shapes.add_textbox(Inches(0.8), Inches(6.3), Inches(11.733), Inches(0.5))
    tff = ftr_box.text_frame
    pf = tff.paragraphs[0]
    r_f1 = pf.add_run()
    r_f1.text = "Platform: https://galx.ai    •    Stage: 2026 Private Beta (Core Built & Tested)    •    Contact: willcruzanswers@gmail.com"
    r_f1.font.size = Pt(11)
    r_f1.font.color.rgb = COLOR_TEXT_DARK

    slide1.notes_slide.notes_text_frame.text = (
        "[0:00 - 0:45] GALXAI flattens and eases the path to the first dollar made with AI. "
        "We solve the existential tokenmaxxing crisis: eliminating 4 weeks of engineering overhead "
        "and cutting retail compute bills 30% to 40% to make AI software profitable on Day 1."
    )

    # ==========================================================
    # SLIDE 2: The Crisis (Tokenmaxxing Spiraling Out of Control)
    # ==========================================================
    slide2 = prs.slides.add_slide(blank_slide_layout)
    set_slide_bg(slide2)
    add_header(slide2, 2)

    tb2 = slide2.shapes.add_textbox(Inches(0.8), Inches(1.0), Inches(11.733), Inches(1.3))
    tf2 = tb2.text_frame
    tf2.word_wrap = True
    p2_m = tf2.paragraphs[0]
    r2_m = p2_m.add_run()
    r2_m.text = "SLIDE 02 / THE CRISIS"
    r2_m.font.bold = True
    r2_m.font.size = Pt(11)
    r2_m.font.color.rgb = COLOR_PINK

    p2_t = tf2.add_paragraph()
    p2_t.space_before = Pt(4)
    r2_t1 = p2_t.add_run()
    r2_t1.text = "The Crisis: "
    r2_t1.font.bold = True
    r2_t1.font.size = Pt(28)
    r2_t1.font.color.rgb = COLOR_TEXT_PRIMARY

    r2_t2 = p2_t.add_run()
    r2_t2.text = "\"Tokenmaxxing\" is Spiraling Out of Control"
    r2_t2.font.bold = True
    r2_t2.font.size = Pt(28)
    r2_t2.font.color.rgb = COLOR_PINK

    p2_s = tf2.add_paragraph()
    p2_s.space_before = Pt(4)
    r2_s = p2_s.add_run()
    r2_s.text = "Uncontrolled token consumption is bankrupting AI startups, blowing enterprise budgets, and terrifying CFOs."
    r2_s.font.size = Pt(13)
    r2_s.font.color.rgb = COLOR_TEXT_MUTED

    # 3 Danger Cards
    cards_s2 = [
        ("1. The SaaS Margin Trap", "A SaaS app charges $20/user/mo, but heavy user tokenmaxxing triggers $45/user/mo in retail API bills. More users = faster bankruptcy.", "Negative Gross Margins", COLOR_PINK),
        ("2. CFO Invoicing Shock", "Enterprises watch AI compute bills explode from $10k to $150k+/mo overnight as engineers connect agents and context-bloated workflows.", "Unpredictable 5-Figure Burn", COLOR_AMBER),
        ("3. 100x Agent Token Loop", "Autonomous agents (Cursor, Claude Code, subagent fleets) consume 50x–200x more tokens than chat, repeating bloated prompts endlessly.", "Runaway Token Loops", COLOR_PURPLE)
    ]
    card_w3 = Inches(3.7)
    card_gap3 = Inches(0.31)
    for i, (head, desc, tag, color) in enumerate(cards_s2):
        x = start_x + i * (card_w3 + card_gap3)
        add_card(slide2, x, Inches(2.6), card_w3, Inches(3.2), COLOR_CARD, color)
        tb = slide2.shapes.add_textbox(x + Inches(0.25), Inches(2.8), card_w3 - Inches(0.5), Inches(2.8))
        tf = tb.text_frame
        tf.word_wrap = True
        
        ph = tf.paragraphs[0]
        rh = ph.add_run()
        rh.text = head
        rh.font.bold = True
        rh.font.size = Pt(16)
        rh.font.color.rgb = color

        pd = tf.add_paragraph()
        pd.space_before = Pt(10)
        rd = pd.add_run()
        rd.text = desc
        rd.font.size = Pt(12)
        rd.font.color.rgb = COLOR_TEXT_PRIMARY

        pt = tf.add_paragraph()
        pt.space_before = Pt(16)
        rt = pt.add_run()
        rt.text = f"[{tag}]"
        rt.font.bold = True
        rt.font.size = Pt(10)
        rt.font.color.rgb = color

    # Callout
    c_box = slide2.shapes.add_textbox(Inches(0.8), Inches(6.1), Inches(11.733), Inches(0.6))
    tfc = c_box.text_frame
    pc = tfc.paragraphs[0]
    pc.alignment = PP_ALIGN.CENTER
    rc = pc.add_run()
    rc.text = "🚨 The CFO Mandate: \"Make the bleeding stop.\" Companies need an immediate circuit breaker and economic clearinghouse."
    rc.font.bold = True
    rc.font.size = Pt(12)
    rc.font.color.rgb = COLOR_PINK

    slide2.notes_slide.notes_text_frame.text = (
        "[0:45 - 1:45] Here is the existential crisis: 'Tokenmaxxing' economics have spiraled completely out of hand. "
        "Developers stuff 100k context windows and loop autonomous agents, burning millions of tokens per task. "
        "Startups charge $20 a month while users burn $45 in API bills. CFOs are screaming to make the bleeding stop."
    )

    # ==========================================================
    # SLIDE 3: Why Companies Can't Stop the Bleed Alone
    # ==========================================================
    slide3 = prs.slides.add_slide(blank_slide_layout)
    set_slide_bg(slide3)
    add_header(slide3, 3)

    tb3 = slide3.shapes.add_textbox(Inches(0.8), Inches(1.0), Inches(11.733), Inches(1.3))
    tf3 = tb3.text_frame
    tf3.word_wrap = True
    p3_m = tf3.paragraphs[0]
    r3_m = p3_m.add_run()
    r3_m.text = "SLIDE 03 / THE ENGINEERING & COST TRAP"
    r3_m.font.bold = True
    r3_m.font.size = Pt(11)
    r3_m.font.color.rgb = COLOR_PINK

    p3_t = tf3.add_paragraph()
    p3_t.space_before = Pt(4)
    r3_t1 = p3_t.add_run()
    r3_t1.text = "Why Companies "
    r3_t1.font.bold = True
    r3_t1.font.size = Pt(28)
    r3_t1.font.color.rgb = COLOR_TEXT_PRIMARY

    r3_t2 = p3_t.add_run()
    r3_t2.text = "Can't Stop the Bleed on Their Own"
    r3_t2.font.bold = True
    r3_t2.font.size = Pt(28)
    r3_t2.font.color.rgb = COLOR_PINK

    p3_s = tf3.add_paragraph()
    p3_s.space_before = Pt(4)
    r3_s = p3_s.add_run()
    r3_s.text = "Engineering teams burn precious runway on custom plumbing, only to deploy an uncontrolled cash incinerator."
    r3_s.font.size = Pt(13)
    r3_s.font.color.rgb = COLOR_TEXT_MUTED

    # 2 Large Cards
    w2 = Inches(5.7)
    gap2 = Inches(0.33)
    cards_s3 = [
        ("THE 4-WEEK PAYROLL TRAP", "$150k+ Burned on Backend Plumbing", "3–6 Weeks Wasted", [
            "Senior engineers forced to build custom proxy infrastructure from scratch",
            "Wrangling streaming chunk drops, aspect ratios, and API key leak risks",
            "$150k+ in unbillable payroll vaporized before validating customer demand"
        ], COLOR_PINK),
        ("THE UNMANAGED CASH BLEED", "40%–70% Burned on Retail Waste", "400x Cost Penalty", [
            "Developers route trivial tasks to $60/M o1-pro flagship models",
            "100k+ token context dumps regurgitate stale logs, inflating costs 10x",
            "Unchecked recursive subagent loops trigger surprise 5-figure overnight spikes"
        ], COLOR_AMBER)
    ]

    for i, (tag, head, stat, bullets, color) in enumerate(cards_s3):
        x = start_x + i * (w2 + gap2)
        add_card(slide3, x, Inches(2.6), w2, Inches(3.3), COLOR_CARD, color)
        tb = slide3.shapes.add_textbox(x + Inches(0.3), Inches(2.8), w2 - Inches(0.6), Inches(3.0))
        tf = tb.text_frame
        tf.word_wrap = True
        
        pt = tf.paragraphs[0]
        rt = pt.add_run()
        rt.text = f"[{tag}]"
        rt.font.bold = True
        rt.font.size = Pt(10)
        rt.font.color.rgb = color

        ph = tf.add_paragraph()
        ph.space_before = Pt(6)
        rh = ph.add_run()
        rh.text = head
        rh.font.bold = True
        rh.font.size = Pt(17)
        rh.font.color.rgb = COLOR_TEXT_PRIMARY

        ps = tf.add_paragraph()
        ps.space_before = Pt(4)
        rs = ps.add_run()
        rs.text = f"• {stat} before collecting revenue"
        rs.font.bold = True
        rs.font.size = Pt(12)
        rs.font.color.rgb = color

        for b in bullets:
            pb = tf.add_paragraph()
            pb.space_before = Pt(4)
            rb = pb.add_run()
            rb.text = f"– {b}"
            rb.font.size = Pt(11.5)
            rb.font.color.rgb = COLOR_TEXT_MUTED

    c3_box = slide3.shapes.add_textbox(Inches(0.8), Inches(6.1), Inches(11.733), Inches(0.6))
    tfc3 = c3_box.text_frame
    pc3 = tfc3.paragraphs[0]
    pc3.alignment = PP_ALIGN.CENTER
    rc3 = pc3.add_run()
    rc3.text = "🚨 The Result: Startups vaporize seed runway in 90 days, and Enterprise CFOs freeze AI roadmaps in panic."
    rc3.font.bold = True
    rc3.font.size = Pt(12)
    rc3.font.color.rgb = COLOR_PINK

    slide3.notes_slide.notes_text_frame.text = (
        "[1:45 - 2:30] Why can't companies stop this bleeding on their own? Two catastrophic traps: "
        "senior engineering teams burn 4 weeks ($150k+ in payroll) building backend servers before making a single cent, "
        "and developers blindly burn $60/M flagship models on simple tasks while looping agents drain bank accounts overnight."
    )

    # ==========================================================
    # SLIDE 4: Why Model Labs Won't Stop the Pain
    # ==========================================================
    slide4 = prs.slides.add_slide(blank_slide_layout)
    set_slide_bg(slide4)
    add_header(slide4, 4)

    tb4 = slide4.shapes.add_textbox(Inches(0.8), Inches(1.0), Inches(11.733), Inches(1.3))
    tf4 = tb4.text_frame
    tf4.word_wrap = True
    p4_m = tf4.paragraphs[0]
    r4_m = p4_m.add_run()
    r4_m.text = "SLIDE 04 / CONFLICTED INCENTIVES"
    r4_m.font.bold = True
    r4_m.font.size = Pt(11)
    r4_m.font.color.rgb = COLOR_CYAN

    p4_t = tf4.add_paragraph()
    p4_t.space_before = Pt(4)
    r4_t1 = p4_t.add_run()
    r4_t1.text = "Why Model Labs "
    r4_t1.font.bold = True
    r4_t1.font.size = Pt(28)
    r4_t1.font.color.rgb = COLOR_TEXT_PRIMARY

    r4_t2 = p4_t.add_run()
    r4_t2.text = "Won't Stop the Pain"
    r4_t2.font.bold = True
    r4_t2.font.size = Pt(28)
    r4_t2.font.color.rgb = COLOR_CYAN

    p4_s = tf4.add_paragraph()
    p4_s.space_before = Pt(4)
    r4_s = p4_s.add_run()
    r4_s.text = "Existing players have conflicting incentives. Only GALXAI is built to eliminate tokenmaxxing waste."
    r4_s.font.size = Pt(13)
    r4_s.font.color.rgb = COLOR_TEXT_MUTED

    cards_s4 = [
        ("OpenAI & Anthropic", "Profits from Tokenmaxxing", "Foundation labs sell retail tokens. They have zero incentive to compress prompts or pass wholesale bulk discounts.", "Incentivized to Burn", COLOR_PINK),
        ("Dumb Proxy Routers", "Passes the Bill Along", "OpenRouter and Cloudflare are simple byte pipes. They do not provide intelligent prompt compaction or spend circuit breakers.", "0 Cost Optimization", COLOR_TEXT_DARK),
        ("GALXAI Clearinghouse", "The Antidote to Waste", "We pool volume for 25%–40% wholesale discounts, strip prompt bloat by 60%–90%, and deploy in 15 minutes.", "Economic Alignment", COLOR_CYAN)
    ]
    for i, (head, sub, desc, tag, color) in enumerate(cards_s4):
        x = start_x + i * (card_w3 + card_gap3)
        add_card(slide4, x, Inches(2.6), card_w3, Inches(3.2), COLOR_CARD, color)
        tb = slide4.shapes.add_textbox(x + Inches(0.25), Inches(2.8), card_w3 - Inches(0.5), Inches(2.8))
        tf = tb.text_frame
        tf.word_wrap = True
        
        ph = tf.paragraphs[0]
        rh = ph.add_run()
        rh.text = head
        rh.font.bold = True
        rh.font.size = Pt(16)
        rh.font.color.rgb = color

        ps = tf.add_paragraph()
        ps.space_before = Pt(4)
        rs = ps.add_run()
        rs.text = sub
        rs.font.bold = True
        rs.font.size = Pt(12)
        rs.font.color.rgb = COLOR_TEXT_PRIMARY

        pd = tf.add_paragraph()
        pd.space_before = Pt(8)
        rd = pd.add_run()
        rd.text = desc
        rd.font.size = Pt(11.5)
        rd.font.color.rgb = COLOR_TEXT_MUTED

        pt = tf.add_paragraph()
        pt.space_before = Pt(14)
        rt = pt.add_run()
        rt.text = f"[{tag}]"
        rt.font.bold = True
        rt.font.size = Pt(10)
        rt.font.color.rgb = color

    c4_box = slide4.shapes.add_textbox(Inches(0.8), Inches(6.1), Inches(11.733), Inches(0.6))
    tfc4 = c4_box.text_frame
    pc4 = tfc4.paragraphs[0]
    pc4.alignment = PP_ALIGN.CENTER
    rc4 = pc4.add_run()
    rc4.text = "✓ 25%–40% wholesale rebate passed to customer    •    ✓ 60%–90% prompt fluff trimmed    •    ✓ Automated spend circuit breakers"
    rc4.font.size = Pt(11.5)
    rc4.font.color.rgb = COLOR_TEXT_MUTED

    slide4.notes_slide.notes_text_frame.text = (
        "[2:30 - 3:30] Why won't OpenAI or proxy routers help? OpenAI profits from tokenmaxxing—they make money "
        "when you burn more retail tokens. Dumb proxy routers just forward the bill. Only GALXAI aligns economically to eliminate waste and protect margins."
    )

    # ==========================================================
    # SLIDE 5: How GALXAI Makes the Pain Stop
    # ==========================================================
    slide5 = prs.slides.add_slide(blank_slide_layout)
    set_slide_bg(slide5)
    add_header(slide5, 5)

    tb5 = slide5.shapes.add_textbox(Inches(0.8), Inches(1.0), Inches(11.733), Inches(1.3))
    tf5 = tb5.text_frame
    tf5.word_wrap = True
    p5_m = tf5.paragraphs[0]
    r5_m = p5_m.add_run()
    r5_m.text = "SLIDE 05 / THE ANTIDOTE"
    r5_m.font.bold = True
    r5_m.font.size = Pt(11)
    r5_m.font.color.rgb = COLOR_CYAN

    p5_t = tf5.add_paragraph()
    p5_t.space_before = Pt(4)
    r5_t1 = p5_t.add_run()
    r5_t1.text = "How GALXAI "
    r5_t1.font.bold = True
    r5_t1.font.size = Pt(28)
    r5_t1.font.color.rgb = COLOR_TEXT_PRIMARY

    r5_t2 = p5_t.add_run()
    r5_t2.text = "Makes the Pain Stop"
    r5_t2.font.bold = True
    r5_t2.font.size = Pt(28)
    r5_t2.font.color.rgb = COLOR_CYAN

    p5_s = tf5.add_paragraph()
    p5_s.space_before = Pt(4)
    r5_s = p5_s.add_run()
    r5_s.text = "A three-layer economic clearinghouse that halts runaway token burn and rescues product margins."
    r5_s.font.size = Pt(13)
    r5_s.font.color.rgb = COLOR_TEXT_MUTED

    cards_s5 = [
        ("1. Costco Wholesale Arbitrage", "We aggregate billions of tokens to buy Tier-5 bulk compute, passing 25%–40% wholesale discounts to customers to protect Day 1 margins.", "Profitable Day 1", COLOR_EMERALD),
        ("2. 60%–90% Prompt Compaction", "Automated semantic fluff trimming strips bloated logs, ASTs, and redundant context with 0 regression errors across 180 domain tests.", "Zero Information Loss", COLOR_CYAN),
        ("3. Smart Downshifter & Guard", "Automatically downshifts simple tasks from $60/M flagship models to fast tiers, fixes cache headers, and clamps infinite subagent loops.", "Predictable Unit Costs", COLOR_PURPLE)
    ]
    for i, (head, desc, tag, color) in enumerate(cards_s5):
        x = start_x + i * (card_w3 + card_gap3)
        add_card(slide5, x, Inches(2.6), card_w3, Inches(3.2), COLOR_CARD, color)
        tb = slide5.shapes.add_textbox(x + Inches(0.25), Inches(2.8), card_w3 - Inches(0.5), Inches(2.8))
        tf = tb.text_frame
        tf.word_wrap = True
        
        ph = tf.paragraphs[0]
        rh = ph.add_run()
        rh.text = head
        rh.font.bold = True
        rh.font.size = Pt(16)
        rh.font.color.rgb = COLOR_TEXT_PRIMARY

        pd = tf.add_paragraph()
        pd.space_before = Pt(10)
        rd = pd.add_run()
        rd.text = desc
        rd.font.size = Pt(12)
        rd.font.color.rgb = COLOR_TEXT_MUTED

        pt = tf.add_paragraph()
        pt.space_before = Pt(16)
        rt = pt.add_run()
        rt.text = f"[{tag}]"
        rt.font.bold = True
        rt.font.size = Pt(10)
        rt.font.color.rgb = color

    c5_box = slide5.shapes.add_textbox(Inches(0.8), Inches(6.1), Inches(11.733), Inches(0.6))
    tfc5 = c5_box.text_frame
    pc5 = tfc5.paragraphs[0]
    pc5.alignment = PP_ALIGN.CENTER
    rc5 = pc5.add_run()
    rc5.text = "💡 The Economic Impact: Flips negative gross margin AI features (-20%) into immediate high-margin revenue (+50% to +68%)."
    rc5.font.bold = True
    rc5.font.size = Pt(12)
    rc5.font.color.rgb = COLOR_EMERALD

    slide5.notes_slide.notes_text_frame.text = (
        "[3:30 - 4:30] GALXAI makes the pain stop through three economic pillars: Costco-level bulk discounts "
        "save 25% to 40% on compute, semantic fluff compaction trims 60% to 90% of bloated context, and our smart "
        "downshifter prevents $60/M overspending while clamping infinite agent loops."
    )

    # ==========================================================
    # SLIDE 6: Net Spend Interception Calculator
    # ==========================================================
    slide6 = prs.slides.add_slide(blank_slide_layout)
    set_slide_bg(slide6)
    add_header(slide6, 6)

    tb6 = slide6.shapes.add_textbox(Inches(0.8), Inches(1.0), Inches(11.733), Inches(1.3))
    tf6 = tb6.text_frame
    tf6.word_wrap = True
    p6_m = tf6.paragraphs[0]
    r6_m = p6_m.add_run()
    r6_m.text = "SLIDE 06 / THE INVOICING UNLOCK"
    r6_m.font.bold = True
    r6_m.font.size = Pt(11)
    r6_m.font.color.rgb = COLOR_CYAN

    p6_t = tf6.add_paragraph()
    p6_t.space_before = Pt(4)
    r6_t1 = p6_t.add_run()
    r6_t1.text = "Net Spend Interception: "
    r6_t1.font.bold = True
    r6_t1.font.size = Pt(28)
    r6_t1.font.color.rgb = COLOR_TEXT_PRIMARY

    r6_t2 = p6_t.add_run()
    r6_t2.text = "-$38,000 Saved Day 1"
    r6_t2.font.bold = True
    r6_t2.font.size = Pt(28)
    r6_t2.font.color.rgb = COLOR_EMERALD

    p6_s = tf6.add_paragraph()
    p6_s.space_before = Pt(4)
    r6_s = p6_s.add_run()
    r6_s.text = "Replacing expensive retail compute invoices with a single consolidated wholesale invoice."
    r6_s.font.size = Pt(13)
    r6_s.font.color.rgb = COLOR_TEXT_MUTED

    # Hero Calculator Outer Card
    calc_outer = add_card(slide6, Inches(0.8), Inches(2.4), Inches(11.733), Inches(3.5), COLOR_CARD, COLOR_CYAN)

    # Top Spend Banner
    sb_box = slide6.shapes.add_textbox(Inches(1.1), Inches(2.6), Inches(11.133), Inches(0.6))
    tfsb = sb_box.text_frame
    psb = tfsb.paragraphs[0]
    rsb1 = psb.add_run()
    rsb1.text = "ENTERPRISE MONTHLY AI SPEND BENCHMARK:  "
    rsb1.font.bold = True
    rsb1.font.size = Pt(13)
    rsb1.font.color.rgb = COLOR_TEXT_PRIMARY

    rsb2 = psb.add_run()
    rsb2.text = "$100,000 / mo"
    rsb2.font.bold = True
    rsb2.font.size = Pt(16)
    rsb2.font.color.rgb = COLOR_CYAN

    # 3 Hero Display Panels Inside
    cw_sub = Inches(3.4)
    cg_sub = Inches(0.46)
    panels_s6 = [
        ("1. DIRECT RETAIL OPENAI BILL", "$100,000 / mo", "Unmanaged retail burn rate", COLOR_TEXT_MUTED, COLOR_PINK),
        ("2. GALXAI CONSOLIDATED BILL", "$62,000 / mo", "Wholesale compute + compaction", COLOR_CYAN, COLOR_CYAN),
        ("3. CFO DIRECT CASH SAVED", "-$38,000 / mo", "-$456,000 / year cash retained", COLOR_EMERALD, COLOR_EMERALD)
    ]

    for i, (tag, amount, subtext, text_col, border_col) in enumerate(panels_s6):
        px = Inches(1.1) + i * (cw_sub + cg_sub)
        py = Inches(3.3)
        add_card(slide6, px, py, cw_sub, Inches(2.3), RGBColor(6, 8, 13), border_col)
        
        tb = slide6.shapes.add_textbox(px + Inches(0.15), py + Inches(0.2), cw_sub - Inches(0.3), Inches(1.9))
        tf = tb.text_frame
        tf.word_wrap = True
        
        pt = tf.paragraphs[0]
        pt.alignment = PP_ALIGN.CENTER
        rt = pt.add_run()
        rt.text = tag
        rt.font.bold = True
        rt.font.size = Pt(10.5)
        rt.font.color.rgb = COLOR_TEXT_MUTED

        pa = tf.add_paragraph()
        pa.space_before = Pt(10)
        pa.alignment = PP_ALIGN.CENTER
        ra = pa.add_run()
        ra.text = amount
        ra.font.bold = True
        ra.font.size = Pt(22)
        ra.font.color.rgb = text_col

        ps = tf.add_paragraph()
        ps.space_before = Pt(8)
        ps.alignment = PP_ALIGN.CENTER
        rs = ps.add_run()
        rs.text = subtext
        rs.font.size = Pt(11)
        rs.font.color.rgb = text_col if i == 2 else COLOR_TEXT_DARK

    c6_box = slide6.shapes.add_textbox(Inches(0.8), Inches(6.1), Inches(11.733), Inches(0.6))
    tfc6 = c6_box.text_frame
    pc6 = tfc6.paragraphs[0]
    pc6.alignment = PP_ALIGN.CENTER
    rc6 = pc6.add_run()
    rc6.text = "✔ Zero Procurement Resistance: CFOs approve immediately because GALXAI reduces existing cash burn on Day 1 (-38%)."
    rc6.font.bold = True
    rc6.font.size = Pt(12)
    rc6.font.color.rgb = COLOR_EMERALD

    slide6.notes_slide.notes_text_frame.text = (
        "[4:30 - 5:30] Here is our core invoicing unlock: Net Spend Interception. We replace a customer's $100k "
        "burning OpenAI invoice with a single consolidated $62k GALXAI invoice, handing $38,000 in direct cash savings "
        "back to the CFO on Day 1 (-38%) with zero procurement resistance."
    )

    # ==========================================================
    # SLIDE 7: In-House Distribution Engine (120k+ Installs)
    # ==========================================================
    slide7 = prs.slides.add_slide(blank_slide_layout)
    set_slide_bg(slide7)
    add_header(slide7, 7)

    tb7 = slide7.shapes.add_textbox(Inches(0.8), Inches(1.0), Inches(11.733), Inches(1.3))
    tf7 = tb7.text_frame
    tf7.word_wrap = True
    p7_m = tf7.paragraphs[0]
    r7_m = p7_m.add_run()
    r7_m.text = "SLIDE 07 / PROVEN DISTRIBUTION FUNNEL"
    r7_m.font.bold = True
    r7_m.font.size = Pt(11)
    r7_m.font.color.rgb = COLOR_CYAN

    p7_t = tf7.add_paragraph()
    p7_t.space_before = Pt(4)
    r7_t1 = p7_t.add_run()
    r7_t1.text = "In-House Distribution: "
    r7_t1.font.bold = True
    r7_t1.font.size = Pt(28)
    r7_t1.font.color.rgb = COLOR_TEXT_PRIMARY

    r7_t2 = p7_t.add_run()
    r7_t2.text = "120k+ Installs"
    r7_t2.font.bold = True
    r7_t2.font.size = Pt(28)
    r7_t2.font.color.rgb = COLOR_CYAN

    p7_s = tf7.add_paragraph()
    p7_s.space_before = Pt(4)
    r7_s = p7_s.add_run()
    r7_s.text = "Proven organic developer adoption powered by our existing open-source developer tooling ecosystem."
    r7_s.font.size = Pt(13)
    r7_s.font.color.rgb = COLOR_TEXT_MUTED

    cards_s7 = [
        ("LUMI VS Code Extension", "16,000", "Active Dev Users", "Embedded inside the developer's daily coding environment. Pre-installed routing and components directly in the IDE.", "IDE Distribution", COLOR_CYAN),
        ("GALXAI CLI Agent", "2,000", "Active Terminal Users", "Power developers running autonomous scripts, CI/CD pipelines, and agent workflows directly from their command line.", "Terminal Workflows", COLOR_PURPLE),
        ("Total Ecosystem Installs", "120,000+", "Lifetime Installs", "100% organic word-of-mouth adoption across developer communities in 9 months with $0 spent on paid ads.", "9-Month Velocity", COLOR_EMERALD)
    ]

    for i, (head, stat, stat_lbl, desc, tag, color) in enumerate(cards_s7):
        x = start_x + i * (card_w3 + card_gap3)
        add_card(slide7, x, Inches(2.6), card_w3, Inches(3.2), COLOR_CARD, color)
        tb = slide7.shapes.add_textbox(x + Inches(0.25), Inches(2.8), card_w3 - Inches(0.5), Inches(2.8))
        tf = tb.text_frame
        tf.word_wrap = True
        
        pt = tf.paragraphs[0]
        rt = pt.add_run()
        rt.text = f"[{tag}]"
        rt.font.bold = True
        rt.font.size = Pt(10)
        rt.font.color.rgb = color

        ph = tf.add_paragraph()
        ph.space_before = Pt(4)
        rh = ph.add_run()
        rh.text = head
        rh.font.bold = True
        rh.font.size = Pt(16)
        rh.font.color.rgb = COLOR_TEXT_PRIMARY

        ps = tf.add_paragraph()
        ps.space_before = Pt(8)
        rs1 = ps.add_run()
        rs1.text = f"{stat} "
        rs1.font.bold = True
        rs1.font.size = Pt(22)
        rs1.font.color.rgb = color

        rs2 = ps.add_run()
        rs2.text = stat_lbl
        rs2.font.size = Pt(11)
        rs2.font.color.rgb = COLOR_TEXT_MUTED

        pd = tf.add_paragraph()
        pd.space_before = Pt(8)
        rd = pd.add_run()
        rd.text = desc
        rd.font.size = Pt(11.5)
        rd.font.color.rgb = COLOR_TEXT_MUTED

    c7_box = slide7.shapes.add_textbox(Inches(0.8), Inches(6.1), Inches(11.733), Inches(0.6))
    tfc7 = c7_box.text_frame
    pc7 = tfc7.paragraphs[0]
    pc7.alignment = PP_ALIGN.CENTER
    rc7 = pc7.add_run()
    rc7.text = "💡 The Built-In Funnel: 18,000+ active developers already trust our tools daily, creating an immediate conversion bridge into GALXAI clearing."
    rc7.font.bold = True
    rc7.font.size = Pt(12)
    rc7.font.color.rgb = COLOR_CYAN

    slide7.notes_slide.notes_text_frame.text = (
        "[5:30 - 6:30] Where does our developer adoption come from? We have an existing in-house open-source distribution funnel. "
        "Our LUMI VS Code extension has 16,000 active users, our CLI agent has 2,000 active users, and we've generated over 120,000 "
        "lifetime installs in just 9 months with zero paid marketing. This feeds developers directly into GALXAI when they ship production applications."
    )

    # ==========================================================
    # SLIDE 8: Capital Growth & Compounding Unit Economics
    # ==========================================================
    slide8 = prs.slides.add_slide(blank_slide_layout)
    set_slide_bg(slide8)
    add_header(slide8, 8)

    tb8 = slide8.shapes.add_textbox(Inches(0.8), Inches(1.0), Inches(11.733), Inches(1.1))
    tf8 = tb8.text_frame
    tf8.word_wrap = True
    p8_m = tf8.paragraphs[0]
    r8_m = p8_m.add_run()
    r8_m.text = "SLIDE 08 / FINANCIAL FORECAST & CAPITAL GROWTH"
    r8_m.font.bold = True
    r8_m.font.size = Pt(11)
    r8_m.font.color.rgb = COLOR_CYAN

    p8_t = tf8.add_paragraph()
    p8_t.space_before = Pt(4)
    r8_t1 = p8_t.add_run()
    r8_t1.text = "Capital Growth & "
    r8_t1.font.bold = True
    r8_t1.font.size = Pt(28)
    r8_t1.font.color.rgb = COLOR_TEXT_PRIMARY

    r8_t2 = p8_t.add_run()
    r8_t2.text = "Unit Economics"
    r8_t2.font.bold = True
    r8_t2.font.size = Pt(28)
    r8_t2.font.color.rgb = COLOR_CYAN

    # Financial Table
    rows, cols = 6, 6
    table_shape = slide8.shapes.add_table(rows, cols, Inches(0.8), Inches(2.2), Inches(11.733), Inches(2.4))
    table = table_shape.table

    table_data = [
        ["Milestone", "2026 (Private Beta)", "2027 (Launch Y1)", "2028 (Scale Y2)", "2029 (Exp. Y3)", "2031 (Y5)"],
        ["Stage", "Core Built & Testing", "Public Rollout", "Rapid Scale", "Enterprise Exp.", "Global Infra"],
        ["Active Apps", "Closed Cohort", "1,800", "7,500", "20,000", "70,000"],
        ["ARR ($M)", "Pre-Launch", "$1.50M", "$7.20M", "$22.00M", "$90.00M"],
        ["Gross Margin (%)", "--", "42.0%", "50.0%", "58.0%", "68.0%"],
        ["Operating Trajectory", "Engineering Done", "Launch Phase", "Growth Phase", "Breakeven (Mo 34)", "Free Cash ($22.0M)"]
    ]

    for r_idx, row in enumerate(table_data):
        for c_idx, val in enumerate(row):
            cell = table.cell(r_idx, c_idx)
            cell.text = val
            p = cell.text_frame.paragraphs[0]
            p.alignment = PP_ALIGN.CENTER if c_idx > 0 else PP_ALIGN.LEFT
            r = p.runs[0]
            r.font.size = Pt(11)
            
            if r_idx == 0:
                r.font.bold = True
                r.font.color.rgb = COLOR_CYAN if c_idx == 4 else (COLOR_AMBER if c_idx == 1 else COLOR_TEXT_PRIMARY)
                cell.fill.solid()
                cell.fill.fore_color.rgb = RGBColor(20, 28, 46)
            elif c_idx == 0:
                r.font.bold = True
                r.font.color.rgb = COLOR_TEXT_PRIMARY
                cell.fill.solid()
                cell.fill.fore_color.rgb = RGBColor(13, 18, 30)
            elif c_idx == 4:
                r.font.bold = True
                r.font.color.rgb = COLOR_CYAN
                cell.fill.solid()
                cell.fill.fore_color.rgb = RGBColor(16, 24, 40)
            else:
                r.font.color.rgb = COLOR_TEXT_MUTED
                cell.fill.solid()
                cell.fill.fore_color.rgb = RGBColor(10, 14, 22)

    # 4 Unit Economics Stat Cards Below Table
    metrics_s8 = [
        ("$0 Paid", "Organic Open-Source CAC", COLOR_CYAN),
        ("$5,350", "Projected Blended LTV", COLOR_PURPLE),
        ("2.1 Mo", "Payback Period", COLOR_EMERALD),
        ("138%", "Net Dollar Retention", COLOR_CYAN)
    ]
    card_h8 = Inches(1.2)
    top_y8 = Inches(4.8)

    for i, (val, label, color) in enumerate(metrics_s8):
        x = start_x + i * (card_w + card_gap)
        add_card(slide8, x, top_y8, card_w, card_h8, COLOR_CARD, color)
        tb = slide8.shapes.add_textbox(x + Inches(0.1), top_y8 + Inches(0.15), card_w - Inches(0.2), card_h8 - Inches(0.3))
        tf = tb.text_frame
        tf.word_wrap = True
        p_val = tf.paragraphs[0]
        p_val.alignment = PP_ALIGN.CENTER
        r_v = p_val.add_run()
        r_v.text = val
        r_v.font.bold = True
        r_v.font.size = Pt(20)
        r_v.font.color.rgb = color

        p_lbl = tf.add_paragraph()
        p_lbl.space_before = Pt(4)
        p_lbl.alignment = PP_ALIGN.CENTER
        r_l = p_lbl.add_run()
        r_l.text = label
        r_l.font.size = Pt(10.5)
        r_l.font.color.rgb = COLOR_TEXT_MUTED

    c8_box = slide8.shapes.add_textbox(Inches(0.8), Inches(6.2), Inches(11.733), Inches(0.5))
    tfc8 = c8_box.text_frame
    pc8 = tfc8.paragraphs[0]
    pc8.alignment = PP_ALIGN.CENTER
    rc8 = pc8.add_run()
    rc8.text = "138% Net Dollar Retention driven organically as customer apps process more AI requests."
    rc8.font.size = Pt(11)
    rc8.font.color.rgb = COLOR_TEXT_MUTED

    slide8.notes_slide.notes_text_frame.text = (
        "[6:30 - 7:30] Our unit economics benefit directly from our open-source funnel: zero paid customer "
        "acquisition cost, 2.1-month payback, and 138% net retention. Our financial model scales us from our "
        "2026 private beta to $22M ARR and breakeven in Year 3, reaching $90M ARR and $22M in free cash flow by Year 5."
    )

    output_path = "/Users/bozoegg/Desktop/GALXAI/docs/investors/GALXAI_Pitch_Deck.pptx"
    prs.save(output_path)
    print(f"Successfully generated Google Slides / PPTX pitch deck at: {output_path}")

if __name__ == "__main__":
    create_deck()
