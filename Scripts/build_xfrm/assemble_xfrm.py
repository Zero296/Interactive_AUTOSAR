"""Assembles AUTOSAR_Xfrm.html from modular build parts."""

import subprocess
import sys
from pathlib import Path

BUILD_DIR = Path(__file__).resolve().parent
REPO_ROOT = BUILD_DIR.parent.parent
OUT_HTML = REPO_ROOT / "Simulation" / "03_Services" / "AUTOSAR_Xfrm.html"

PARTS = [
    "part1_head_and_styles.html",
    "part2_body_structure.html",
    "part3_constants_and_cfg.js",
    "part4_engine.js",
    "part4_scenarios.js",
    "part5_ui_and_exports.js",
    "part6_handbook.js",
]


def main():
    subprocess.run([sys.executable, str(BUILD_DIR / "generate_part6_xfrm.py")], check=True)

    chunks = []
    for name in PARTS:
        p = BUILD_DIR / name
        if not p.exists():
            raise FileNotFoundError(f"Missing build part: {p}")
        chunks.append(p.read_text(encoding="utf-8"))

    final_html = "\n".join(chunks) + "\n</script>\n</body>\n</html>\n"
    OUT_HTML.parent.mkdir(parents=True, exist_ok=True)
    OUT_HTML.write_text(final_html, encoding="utf-8")
    print(f"Assembled {OUT_HTML} ({len(final_html):,} bytes, {len(final_html.splitlines()):,} lines)")


if __name__ == "__main__":
    main()
