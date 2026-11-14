# -*- coding: utf-8 -*-
"""Assembles parts 1..6 into Simulation/04_ECU_Abstraction/AUTOSAR_MemIf.html."""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parent.parent
OUT_HTML = REPO_ROOT / "Simulation" / "04_ECU_Abstraction" / "AUTOSAR_MemIf.html"

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
    gen_script = ROOT / "generate_part6_memif.py"
    subprocess.run([sys.executable, str(gen_script)], check=True)

    chunks = []
    for name in PARTS:
        p = ROOT / name
        if not p.exists():
            raise FileNotFoundError(f"Missing build part: {p}")
        text = p.read_text(encoding="utf-8")
        chunks.append(text.rstrip() + "\n")

    chunks.append("\n</script>\n</body>\n</html>\n")
    OUT_HTML.parent.mkdir(parents=True, exist_ok=True)
    final_html = "\n".join(chunks)
    OUT_HTML.write_text(final_html, encoding="utf-8")
    print(f"Assembled {OUT_HTML} ({len(final_html):,} bytes, {len(final_html.splitlines()):,} lines).")


if __name__ == "__main__":
    main()
