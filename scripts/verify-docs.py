#!/usr/bin/env python3
"""Check documentation scope, navigation, and local links without network or inference."""

from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
SCOPES = {
    "current-guide", "domain-reference", "decision-record",
    "operational-record", "research-reference", "commercial-draft",
}


def prose(text):
    # Examples and fenced templates are not navigation.
    return re.sub(r"(?ms)^\s*(`{3,}|~{3,})[^\n]*\n.*?^\s*\1\s*$", "", text)


def links(text):
    text = prose(text)
    for match in re.finditer(r"\[[^\]\n]*\]\((<[^>]+>|[^\s)]+)(?:\s+\"[^\"]*\")?\)", text):
        yield match.group(1).strip("<>")


def anchors(text):
    result = set()
    counts = {}
    for line in prose(text).splitlines():
        match = re.match(r"^#{1,6}\s+(.+?)\s*#*\s*$", line)
        if not match:
            continue
        label = re.sub(r"\[([^]]+)\]\([^)]+\)", r"\1", match.group(1))
        slug = re.sub(r"[^\w\- ]", "", label.lower()).replace(" ", "-")
        count = counts.get(slug, 0)
        counts[slug] = count + 1
        result.add(slug if not count else f"{slug}-{count}")
    result.update(re.findall(r'(?:id|name)=[\"\']([^\"\']+)[\"\']', text))
    return result


def main():
    errors = []
    files = sorted(DOCS.rglob("*.md"))
    incident_files = sorted(path for path in (ROOT / "post-mortem").rglob("*.md")
                            if "/evidence/raw/" not in path.as_posix())
    catalog = DOCS / "CATALOG.md"
    indexed = {(catalog.parent / unquote(urlsplit(link).path)).resolve()
               for link in links(catalog.read_text()) if not urlsplit(link).scheme}
    for path in files:
        text = path.read_text()
        markers = re.findall(r"<!-- docs-scope: ([\w-]+) -->", text)
        if len(markers) != 1 or markers[0] not in SCOPES:
            errors.append(f"{path.relative_to(ROOT)}: requires one valid scope marker")
        if path.resolve() not in indexed:
            errors.append(f"{path.relative_to(ROOT)}: missing from complete catalog")
    for path in incident_files:
        markers = re.findall(r"<!-- docs-scope: ([\w-]+) -->", path.read_text())
        if len(markers) != 1 or markers[0] not in SCOPES:
            errors.append(f"{path.relative_to(ROOT)}: requires one valid scope marker")

    decisions = sorted((DOCS / "adr").glob("[0-9]*.md"))
    ids = [int(path.name.split("-", 1)[0]) for path in decisions]
    if ids != list(range(1, max(ids, default=0) + 1)):
        errors.append("ADR IDs must be unique and contiguous")
    adr_index = (DOCS / "adr/README.md").read_text()
    for path in decisions:
        if f"]({path.name})" not in adr_index:
            errors.append(f"{path.name}: missing from ADR catalog")

    # Root entry points are part of the navigation contract too.
    roots = [ROOT / name for name in ("README.md", "context.md", "HANDOVER.md", "PRODUCT.md", "MAINTAINERS.md", "CONTRIBUTING.md")]
    for path in files + roots + incident_files:
        text = path.read_text()
        if "<!-- docs-scope: current-guide -->" in text:
            if re.search(r"(?m)^\s*(?:echo|printenv)\s+.*(?:SECRET|TOKEN|PASSWORD|PRIVATE_KEY)", text):
                errors.append(f"{path.relative_to(ROOT)}: current guide contains a secret-printing command")
            if re.search(r"(?m)^\s*(?:npx\s+tsx|node\s+[^\n]*)\s+scripts/populate-vault-secrets", text):
                errors.append(f"{path.relative_to(ROOT)}: current guide uses vault population as an executable recipe")
            if re.search(r"process\.env\.NEXT_PUBLIC_\w*(?:KEY|TOKEN|SECRET)", text):
                errors.append(f"{path.relative_to(ROOT)}: current guide exposes a credential in a browser environment variable")
            if re.search(r"ADR 0122.{0,50}(?:current|baseline)", prose(text)):
                errors.append(f"{path.relative_to(ROOT)}: obsolete shared-relay decision presented as current authority")
        for link in links(text):
            parsed = urlsplit(link)
            if parsed.scheme or parsed.netloc or link.startswith("/"):
                continue
            target = (path.parent / unquote(parsed.path)).resolve() if parsed.path else path
            if not target.exists():
                errors.append(f"{path.relative_to(ROOT)}: missing target {link}")
            # Check anchors in current guides; retained historical heading conventions vary.
            elif parsed.fragment and target.suffix == ".md":
                target_text = target.read_text()
                if "<!-- docs-scope: current-guide -->" in target_text and unquote(parsed.fragment) not in anchors(target_text):
                    errors.append(f"{path.relative_to(ROOT)}: missing current-guide anchor {link}")

    if errors:
        print("\n".join(errors))
        print(f"Documentation validation failed: {len(errors)} issue(s).", file=sys.stderr)
        return 1
    print(f"Documentation validation passed: {len(files)} guides, {len(incident_files)} incident documents, {len(decisions)} ADRs; scope, coverage, local targets, and current-guide anchors.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
