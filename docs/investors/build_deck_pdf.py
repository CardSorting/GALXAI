"""Build text-first PDF exports of the GALX ACI investor deck.

This dependency-free fallback keeps the checked-in PDF outputs aligned with
the canonical slide specification when ReportLab or a presentation renderer is
not installed. The visual HTML and PowerPoint remain the richer presentation
surfaces.
"""

from pathlib import Path
from textwrap import wrap

from build_deck_pptx import SLIDES


PAGE_WIDTH = 960
PAGE_HEIGHT = 540
BG = (0.027, 0.031, 0.051)
CARD = (0.071, 0.086, 0.157)
LINE = (0.188, 0.2, 0.29)
CYAN = (0.0, 0.941, 1.0)
PURPLE = (0.545, 0.361, 0.965)
TEXT = (0.973, 0.98, 0.988)
MUTED = (0.612, 0.639, 0.686)


def ascii_text(value: str) -> str:
    replacements = {
        "→": "->",
        "–": "-",
        "—": "-",
        "‑": "-",
        "’": "'",
        "“": '"',
        "”": '"',
        "·": "-",
        "•": "*",
        "…": "...",
    }
    for source, target in replacements.items():
        value = value.replace(source, target)
    return value.encode("ascii", "replace").decode("ascii")


def pdf_escape(value: str) -> str:
    return ascii_text(value).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def color(value: tuple[float, float, float]) -> str:
    return " ".join(f"{component:.3f}" for component in value)


def text(x: float, y: float, size: float, value: str, fill: tuple[float, float, float], bold: bool = False) -> str:
    # Helvetica-Bold is a built-in PDF font and keeps the fallback portable.
    font = "/F2" if bold else "/F1"
    return f"BT {font} {size:.1f} Tf {color(fill)} rg {x:.1f} {y:.1f} Td ({pdf_escape(value)}) Tj ET\n"


def wrapped_text(x: float, y: float, size: float, value: str, fill: tuple[float, float, float], width: int, leading: float, bold: bool = False) -> str:
    lines = wrap(ascii_text(value), width=width, break_long_words=False, break_on_hyphens=False)
    return "".join(text(x, y - index * leading, size, line, fill, bold) for index, line in enumerate(lines))


def rect(x: float, y: float, width: float, height: float, fill: tuple[float, float, float], stroke: tuple[float, float, float] | None = None) -> str:
    commands = [f"q {color(fill)} rg {x:.1f} {y:.1f} {width:.1f} {height:.1f} re f"]
    if stroke:
        commands.append(f"{color(stroke)} RG 0.8 w {x:.1f} {y:.1f} {width:.1f} {height:.1f} re S")
    commands.append("Q")
    return " ".join(commands) + "\n"


def page_stream(number: int, title: str, subtitle: str, cards: list[tuple[str, str]]) -> bytes:
    stream = rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, BG)
    stream += text(42, 505, 12, "GALX", CYAN, True)
    stream += text(82, 505, 10, "- Augmented Creative Intelligence", MUTED)
    stream += text(835, 505, 10, f"{number:02d} / 10", MUTED, True)

    title_lines = wrap(ascii_text(title), width=54, break_long_words=False, break_on_hyphens=False)
    for index, line in enumerate(title_lines[:2]):
        stream += text(42, 451 - index * 32, 27, line, TEXT, True)
    subtitle_y = 390 - max(0, len(title_lines) - 1) * 32
    stream += wrapped_text(42, subtitle_y, 13, subtitle, CYAN, 86, 17)

    count = len(cards)
    gap = 18
    card_width = (876 - gap * (count - 1)) / count
    card_y = 165
    card_height = 150
    for index, (card_title, card_body) in enumerate(cards):
        card_x = 42 + index * (card_width + gap)
        stream += rect(card_x, card_y, card_width, card_height, CARD, PURPLE if index == 0 else LINE)
        stream += text(card_x + 16, card_y + card_height - 28, 13, card_title, TEXT, True)
        stream += wrapped_text(card_x + 16, card_y + card_height - 56, 11, card_body, MUTED, 37 if count < 3 else 24, 16)

    stream += text(42, 42, 9, "Commercial draft - claims and evidence are separated in the executive memo.", MUTED)
    return stream.encode("latin-1")


def build_pdf(output: Path) -> None:
    objects: list[bytes | None] = [None]
    pages_object = len(objects)
    objects.append(None)
    regular_font = len(objects)
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    bold_font = len(objects)
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
    page_refs: list[int] = []

    for number, (title, subtitle, cards) in enumerate(SLIDES, start=1):
        stream = page_stream(number, title, subtitle, cards)
        stream_object = len(objects)
        objects.append(f"<< /Length {len(stream)} >>\nstream\n".encode("ascii") + stream + b"\nendstream")
        page_object = len(objects)
        objects.append(
            (
                f"<< /Type /Page /Parent {pages_object} 0 R /MediaBox [0 0 {PAGE_WIDTH} {PAGE_HEIGHT}] "
                f"/Resources << /Font << /F1 {regular_font} 0 R /F2 {bold_font} 0 R >> >> "
                f"/Contents {stream_object} 0 R >>"
            ).encode("ascii")
        )
        page_refs.append(page_object)

    kids = " ".join(f"{reference} 0 R" for reference in page_refs)
    objects[pages_object] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_refs)} >>".encode("ascii")
    catalog_object = len(objects)
    objects.append(f"<< /Type /Catalog /Pages {pages_object} 0 R >>".encode("ascii"))

    output.parent.mkdir(parents=True, exist_ok=True)
    data = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for object_number, payload in enumerate(objects[1:], start=1):
        assert payload is not None
        offsets.append(len(data))
        data.extend(f"{object_number} 0 obj\n".encode("ascii"))
        data.extend(payload)
        data.extend(b"\nendobj\n")

    xref_offset = len(data)
    data.extend(f"xref\n0 {len(objects)}\n".encode("ascii"))
    data.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        data.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    data.extend(
        (
            f"trailer\n<< /Size {len(objects)} /Root {catalog_object} 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF\n"
        ).encode("ascii")
    )
    output.write_bytes(data)


def main() -> None:
    output_dir = Path(__file__).resolve().parent / "slides"
    for filename in ("GALX_Pitch_Deck.pdf", "GALX_Pitch_Deck_Web.pdf"):
        output = output_dir / filename
        build_pdf(output)
        print(f"Saved PDF to {output}")


if __name__ == "__main__":
    main()
