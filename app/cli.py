"""
CLI for the risk engine. Pretty-prints findings grouped by severity.

Usage:
  python -m app.cli                    # all findings
  python -m app.cli --severity critical # only critical
  python -m app.cli --category dependency
  python -m app.cli --summary          # counts only
"""
from __future__ import annotations

import argparse
import os
import sys

try:
    from .engine import run_site
    from .rules import Category, Finding, Severity
except ImportError:
    from engine import run_site  # type: ignore
    from rules import Category, Finding, Severity  # type: ignore


# ANSI colors, with graceful fallback if stdout isn't a TTY
def _supports_color() -> bool:
    return sys.stdout.isatty() and os.environ.get("NO_COLOR") is None


class Color:
    if _supports_color():
        RED = "\033[31m"
        YELLOW = "\033[33m"
        CYAN = "\033[36m"
        GREY = "\033[90m"
        BOLD = "\033[1m"
        DIM = "\033[2m"
        RESET = "\033[0m"
    else:
        RED = YELLOW = CYAN = GREY = BOLD = DIM = RESET = ""


SEVERITY_STYLE = {
    Severity.CRITICAL: (Color.RED, "CRITICAL"),
    Severity.WARNING: (Color.YELLOW, "WARNING "),
    Severity.INFO:    (Color.CYAN,   "INFO    "),
}


def _wrap_issue_keys(keys: tuple[str, ...], indent: str = "    ") -> str:
    if not keys:
        return ""
    # Join with commas, wrapped at 80 chars
    out: list[str] = []
    line = indent
    for k in keys:
        piece = k + ", "
        if len(line) + len(piece) > 80:
            out.append(line.rstrip(", "))
            line = indent + piece
        else:
            line += piece
    out.append(line.rstrip(", "))
    return "\n".join(out)


def format_finding(f: Finding) -> str:
    color, label = SEVERITY_STYLE[f.severity]
    lines: list[str] = []
    lines.append(f"{color}{Color.BOLD}[{label}]{Color.RESET} {Color.BOLD}{f.title}{Color.RESET}")
    lines.append(f"  {Color.DIM}{f.category.value}  •  {f.rule_id}{Color.RESET}")
    lines.append(f"  {f.detail}")
    if f.recommendation:
        lines.append(f"  {Color.CYAN}→ {f.recommendation}{Color.RESET}")
    if f.issue_keys:
        shown = f.issue_keys[:12]
        more = len(f.issue_keys) - len(shown)
        keys_str = _wrap_issue_keys(shown)
        lines.append(keys_str)
        if more > 0:
            lines.append(f"    {Color.DIM}...and {more} more{Color.RESET}")
    return "\n".join(lines)


def print_summary(findings: list[Finding], site_name: str) -> None:
    counts: dict[Severity, int] = {s: 0 for s in Severity}
    by_category: dict[Category, int] = {c: 0 for c in Category}
    for f in findings:
        counts[f.severity] += 1
        by_category[f.category] += 1
    print(f"{Color.BOLD}Delivery health — {site_name}{Color.RESET}")
    print(f"{len(findings)} findings total")
    for s in Severity:
        color, label = SEVERITY_STYLE[s]
        print(f"  {color}{label.strip()}{Color.RESET:8} {counts[s]}")
    print()
    for c in Category:
        print(f"  {Color.DIM}{c.value:12}{Color.RESET} {by_category[c]}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--severity", choices=[s.value for s in Severity],
                        help="Filter to one severity level")
    parser.add_argument("--category", choices=[c.value for c in Category],
                        help="Filter to one category")
    parser.add_argument("--summary", action="store_true",
                        help="Show counts only, no detail")
    parser.add_argument("--site-id", type=int, default=None,
                        help="Site id (default: first one)")
    args = parser.parse_args()

    ctx, findings = run_site(site_id=args.site_id)

    if args.severity:
        findings = [f for f in findings if f.severity.value == args.severity]
    if args.category:
        findings = [f for f in findings if f.category.value == args.category]

    print_summary(findings, ctx.site_name)
    if args.summary:
        return 0

    print()
    print("=" * 72)
    print()
    for f in findings:
        print(format_finding(f))
        print()

    # Exit non-zero if anything critical, so CI can fail the build
    return 1 if any(f.severity == Severity.CRITICAL for f in findings) else 0


if __name__ == "__main__":
    sys.exit(main())
