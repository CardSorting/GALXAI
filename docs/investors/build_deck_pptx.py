"""Build the GALX ACI investor deck without external Python dependencies.

The copy mirrors 02_PITCH_DECK_SLIDE_BY_SLIDE.md. This small OOXML writer keeps
the presentation artifact regenerable in environments without python-pptx.
"""

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
from xml.sax.saxutils import escape


SLIDE_WIDTH = 12191695
SLIDE_HEIGHT = 6858000

BG = "07080D"
SURFACE = "0D101C"
CARD = "121628"
LINE = "30334A"
CYAN = "00F0FF"
PURPLE = "8B5CF6"
TEXT = "F8FAFC"
MUTED = "9CA3AF"

NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main"
NS_P = "http://schemas.openxmlformats.org/presentationml/2006/main"
NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


def xml_text(value: str) -> str:
    return escape(value)


def paragraph(text: str, size: int, color: str, bold: bool = False, align: str | None = None) -> str:
    alignment = f'<a:pPr algn="{align}"/>' if align else ""
    bold_attr = ' b="1"' if bold else ""
    return (
        f"<a:p>{alignment}"
        f'<a:r><a:rPr lang="en-US" sz="{size}"{bold_attr}>'
        f'<a:solidFill><a:srgbClr val="{color}"/></a:solidFill>'
        '<a:latin typeface="Arial"/></a:rPr>'
        f"<a:t>{xml_text(text)}</a:t></a:r>"
        '<a:endParaRPr lang="en-US"/></a:p>'
    )


def text_body(paragraphs: list[str], margin: int = 0, anchor: str = "t") -> str:
    return (
        f'<p:txBody><a:bodyPr wrap="square" lIns="{margin}" tIns="{margin}" '
        f'rIns="{margin}" bIns="{margin}" anchor="{anchor}"><a:spAutoFit/></a:bodyPr>'
        f"<a:lstStyle/>{''.join(paragraphs)}</p:txBody>"
    )


def shape(
    shape_id: int,
    name: str,
    x: int,
    y: int,
    width: int,
    height: int,
    body: str,
    fill: str | None = None,
    line: str | None = None,
    rounded: bool = False,
) -> str:
    geometry = "roundRect" if rounded else "rect"
    fill_xml = f'<a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>' if fill else "<a:noFill/>"
    line_xml = f'<a:ln w="12700"><a:solidFill><a:srgbClr val="{line}"/></a:solidFill></a:ln>' if line else "<a:ln><a:noFill/></a:ln>"
    return (
        "<p:sp>"
        f'<p:nvSpPr><p:cNvPr id="{shape_id}" name="{name}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>'
        f'<p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{width}" cy="{height}"/></a:xfrm>'
        f'<a:prstGeom prst="{geometry}"><a:avLst/></a:prstGeom>{fill_xml}{line_xml}</p:spPr>'
        f"{body}</p:sp>"
    )


def slide_xml(number: int, title: str, subtitle: str, cards: list[tuple[str, str]]) -> str:
    shapes: list[str] = []
    shapes.append(
        shape(
            2,
            "Header",
            731520,
            365760,
            8686800,
            365760,
            text_body(
                [paragraph("GALX", 1400, CYAN, True), paragraph("  •  Augmented Creative Intelligence", 1100, MUTED)],
                anchor="ctr",
            ),
        )
    )
    shapes.append(
        shape(
            3,
            "Slide number",
            9601200,
            365760,
            1828800,
            365760,
            text_body([paragraph(f"Slide {number:02d} / 10", 1100, MUTED, True, "r")]),
        )
    )
    shapes.append(
        shape(
            4,
            "Title",
            731520,
            1005840,
            10728655,
            1188720,
            text_body([paragraph(title, 2400, TEXT, True), paragraph(subtitle, 1300, CYAN)], margin=0),
        )
    )

    gap = 274320
    card_width = (10728655 - gap * (len(cards) - 1)) // len(cards)
    card_y = 2560320
    card_height = 3291840
    for index, (card_title, card_body) in enumerate(cards):
        card_x = 731520 + index * (card_width + gap)
        shapes.append(
            shape(
                10 + index * 2,
                f"Card {index + 1}",
                card_x,
                card_y,
                card_width,
                card_height,
                text_body(
                    [paragraph(card_title, 1500, TEXT, True), paragraph(card_body, 1150, MUTED)],
                    margin=228600,
                ),
                fill=CARD,
                line=PURPLE if index == 0 else LINE,
                rounded=True,
            )
        )

    shape_tree = (
        '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
        '<p:grpSpPr/>'
        + "".join(shapes)
        + "</p:spTree>"
    )
    return (
        f'<p:sld xmlns:a="{NS_A}" xmlns:p="{NS_P}" xmlns:r="{NS_R}">'
        f'<p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="{BG}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>'
        f"{shape_tree}</p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>"
    )


def presentation_xml(slide_count: int) -> str:
    slide_ids = "".join(
        f'<p:sldId id="{256 + index}" r:id="rId{index + 1}"/>'
        for index in range(slide_count)
    )
    return (
        f'<p:presentation xmlns:a="{NS_A}" xmlns:p="{NS_P}" xmlns:r="{NS_R}">'
        '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rIdMaster"/></p:sldMasterIdLst>'
        f"<p:sldIdLst>{slide_ids}</p:sldIdLst>"
        f'<p:sldSz cx="{SLIDE_WIDTH}" cy="{SLIDE_HEIGHT}" type="screen16x9"/>'
        '<p:notesSz cx="6858000" cy="9144000"/>'
        '<p:defaultTextStyle><a:defPPr/><a:lvl1pPr marL="0" algn="l"><a:defRPr lang="en-US"/></a:lvl1pPr></p:defaultTextStyle>'
        '</p:presentation>'
    )


def root_relationships() -> str:
    return (
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>'
        '</Relationships>'
    )


def presentation_relationships(slide_count: int) -> str:
    relationships = [
        '<Relationship Id="rIdMaster" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>'
    ]
    relationships.extend(
        f'<Relationship Id="rId{index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{index + 1}.xml"/>'
        for index in range(slide_count)
    )
    return '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + "".join(relationships) + "</Relationships>"


def slide_relationships() -> str:
    return (
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>'
        '</Relationships>'
    )


def master_relationships() -> str:
    return (
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>'
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>'
        '</Relationships>'
    )


def master_xml() -> str:
    return (
        f'<p:sldMaster xmlns:a="{NS_A}" xmlns:p="{NS_P}" xmlns:r="{NS_R}">'
        '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>'
        '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>'
        '<p:sldLayoutIdLst><p:sldLayoutId id="1" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles/>'
        '</p:sldMaster>'
    )


def layout_xml() -> str:
    return (
        f'<p:sldLayout xmlns:a="{NS_A}" xmlns:p="{NS_P}" xmlns:r="{NS_R}" type="blank" preserve="1">'
        '<p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>'
        '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>'
        '</p:sldLayout>'
    )


def theme_xml() -> str:
    return (
        f'<a:theme xmlns:a="{NS_A}" name="GALX ACI">'
        '<a:themeElements><a:clrScheme name="GALX ACI"><a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>'
        '<a:dk2><a:srgbClr val="07080D"/></a:dk2><a:lt2><a:srgbClr val="F8FAFC"/></a:lt2>'
        '<a:accent1><a:srgbClr val="00F0FF"/></a:accent1><a:accent2><a:srgbClr val="8B5CF6"/></a:accent2>'
        '<a:accent3><a:srgbClr val="10B981"/></a:accent3><a:accent4><a:srgbClr val="F59E0B"/></a:accent4>'
        '<a:accent5><a:srgbClr val="F43F5E"/></a:accent5><a:accent6><a:srgbClr val="6366F1"/></a:accent6>'
        '<a:hlink><a:srgbClr val="00F0FF"/></a:hlink><a:folHlink><a:srgbClr val="8B5CF6"/></a:folHlink></a:clrScheme>'
        '<a:fontScheme name="GALX"><a:majorFont><a:latin typeface="Arial"/></a:majorFont><a:minorFont><a:latin typeface="Arial"/></a:minorFont></a:fontScheme>'
        '<a:fmtScheme name="GALX"><a:fillStyleLst/><a:lnStyleLst/><a:effectStyleLst/><a:bgFillStyleLst/></a:fmtScheme>'
        '</a:themeElements></a:theme>'
    )


def content_types(slide_count: int) -> str:
    overrides = [
        '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>',
        '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>',
        '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>',
        '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>',
    ]
    overrides.extend(
        f'<Override PartName="/ppt/slides/slide{index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>'
        for index in range(slide_count)
    )
    return (
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        + "".join(overrides)
        + '</Types>'
    )


SLIDES = [
    (
        "More capable machines will create demand for more capable people",
        "GALX is building around what people become able to accomplish through agents.",
        [("The forecast", "Agent capability may shift the bottleneck from execution to direction."), ("The first proof", "One person creates something meaningful that was previously beyond practical reach.")],
    ),
    (
        "The bottleneck is between human intention and agent execution",
        "Creative work often develops through interaction rather than a single complete instruction.",
        [("The relationship", "Express → delegate → inspect → redirect → preserve → continue."), ("The risk", "More output can leave the person with more interpretation and correction.")],
    ),
    (
        "Augmented Creative Intelligence changes the unit of analysis",
        "The system is the person, their agents, their tools, and the work they create together.",
        [("ACI asks", "What can the person now initiate, influence, complete, and return to?"), ("ACI is not", "A claim that GALX invented human augmentation or a new model category.")],
    ),
    (
        "The first individual experiment is obtainable now",
        "Enough capability exists to test the creative experience directly, without building an institution first.",
        [("Then", "DreamBees pursued creative range when the capability layer was harder to access."), ("Now", "Agentic capability makes the person-level experiment practical to run and measure.")],
    ),
    (
        "The founder has studied both sides of the relationship",
        "Human-centered systems, creative work, agent construction, and operational judgment meet in one problem.",
        [("Continuity", "DreamBees → LUMI → GALX: recurring pursuit of individual creative capability."), ("Evidence", "The May 2026 JoyZoning report distinguished generated changes from accepted work.")],
    ),
    (
        "One creator. One visual idea. One meaningful result.",
        "Image creation and community discovery are the focused commercial entry point.",
        [("The loop", "Bring an idea → direct and revise → keep or share → return."), ("The customer", "An independent creator with recurring visual ideas, not a one-time generator.")],
    ),
    (
        "Permission becomes action; the product earns the next visit",
        "HEAV3NS MANDATE activates. LUMI remains a software-creation instrument.",
        [("HEAV3NS MANDATE", "The call to begin—not a product tier or a promise to be productive."), ("LUMI", "A maintained expression of the thesis, not a second general-purpose coding-agent race.")],
    ),
    (
        "Turn individual capability into repeatable paid value",
        "The economic unit is a retained, paying creator—not an externally supplied token.",
        [("The sequence", "Meaningful result → recurring projects → retained creator → preferred environment."), ("The scale condition", "Customer value must grow faster than founder intervention.")],
    ),
    (
        "The thesis must survive comparison, behavior, and economics",
        "Capability, product, and business are separate proofs.",
        [("Capability", "Meaningful completion, direction, revision, and recoverability."), ("Product", "Independent return and preference over relevant alternatives."), ("Business", "Payment, sustainable cost to serve, and repeatable distribution.")],
    ),
    (
        "Make the first proof small enough to perform",
        "Capital accelerates product quality, bounded cohorts, measurement, and dependable delivery.",
        [("Next milestones", "Meaningful capability → paid return → repeatable delivery."), ("The close", "One person demonstrates possibility; repeated use and payment demonstrate the business.")],
    ),
]


def create_deck() -> None:
    output = Path(__file__).resolve().parent / "GALXAI_Pitch_Deck.pptx"
    with ZipFile(output, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types(len(SLIDES)))
        archive.writestr("_rels/.rels", root_relationships())
        archive.writestr("ppt/presentation.xml", presentation_xml(len(SLIDES)))
        archive.writestr("ppt/_rels/presentation.xml.rels", presentation_relationships(len(SLIDES)))
        archive.writestr("ppt/slideMasters/slideMaster1.xml", master_xml())
        archive.writestr("ppt/slideMasters/_rels/slideMaster1.xml.rels", master_relationships())
        archive.writestr("ppt/slideLayouts/slideLayout1.xml", layout_xml())
        archive.writestr("ppt/slideLayouts/_rels/slideLayout1.xml.rels", master_relationships().replace("../slideLayouts/slideLayout1.xml", "../slideMasters/slideMaster1.xml").replace("<Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme\" Target=\"../theme/theme1.xml\"/>", ""))
        archive.writestr("ppt/theme/theme1.xml", theme_xml())
        for index, (title, subtitle, cards) in enumerate(SLIDES, start=1):
            archive.writestr(f"ppt/slides/slide{index}.xml", slide_xml(index, title, subtitle, cards))
            archive.writestr(f"ppt/slides/_rels/slide{index}.xml.rels", slide_relationships())
    print(f"Saved pitch deck to {output}")


if __name__ == "__main__":
    create_deck()
