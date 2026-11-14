# -*- coding: utf-8 -*-
"""Assemble standalone offline AUTOSAR_CanIf.html from parts 1..6."""

import os
import subprocess
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
OUT_PATH = os.path.join(ROOT_DIR, "Simulation", "04_ECU_Abstraction", "AUTOSAR_CanIf.html")

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
    gen_script = os.path.join(SCRIPT_DIR, "generate_part6_canif.py")
    subprocess.check_call([sys.executable, gen_script])

    chunks = []
    for name in PARTS:
        p = os.path.join(SCRIPT_DIR, name)
        with open(p, "r", encoding="utf-8") as f:
            chunks.append(f.read().rstrip() + "\n")

    chunks.append("</script>\n</body>\n</html>\n")
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    final_html = "\n".join(chunks)
    with open(OUT_PATH, "w", encoding="utf-8", newline="\n") as f:
        f.write(final_html)

    print(f"Wrote {OUT_PATH} ({len(final_html):,} chars, {final_html.count(chr(10)) + 1:,} lines)")


if __name__ == "__main__":
    main()
