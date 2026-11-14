r"""Assembler script producing standalone D:\__Personal\AntiGravity\Simulation\AUTOSAR_FiM.html."""

import os
import subprocess
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)
OUT = os.path.join(ROOT, "Simulation", "AUTOSAR_FiM.html")

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
    gen_script = os.path.join(BASE, "generate_part6_fim.py")
    subprocess.check_call([sys.executable, gen_script])

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    chunks = []
    for p in PARTS:
        path = os.path.join(BASE, p)
        with open(path, "r", encoding="utf-8") as f:
            txt = f.read()
        chunks.append(txt.rstrip() + "\n")

    full_html = "\n".join(chunks)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(full_html)
    print(f"Assembled {OUT} ({len(full_html):,} chars, {len(full_html.splitlines()):,} lines)")


if __name__ == "__main__":
    main()
