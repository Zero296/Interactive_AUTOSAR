# -*- coding: utf-8 -*-
"""Assemble standalone offline AUTOSAR IoHwAb Simulator & Handbook HTML."""

import os
import subprocess
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
OUT_HTML = os.path.join(REPO_ROOT, "Simulation", "04_ECU_Abstraction", "AUTOSAR_IoHwAb.html")

PARTS = [
    "part1_head_and_styles.html",
    "part2_body_structure.html",
    "part3_constants_and_cfg.js",
    "part4_engine.js",
    "part4_scenarios.js",
    "part5_ui_and_exports.js",
    "part6_handbook.js",
]


def main() -> None:
    gen_script = os.path.join(SCRIPT_DIR, "generate_part6_iohwab.py")
    subprocess.run([sys.executable, gen_script], check=True)

    chunks = []
    for name in PARTS:
        p = os.path.join(SCRIPT_DIR, name)
        with open(p, "r", encoding="utf-8") as f:
            chunks.append(f.read().rstrip("\r\n"))

    os.makedirs(os.path.dirname(OUT_HTML), exist_ok=True)
    full_html = "\n".join(chunks) + "\n"
    with open(OUT_HTML, "w", encoding="utf-8") as f:
        f.write(full_html)

    print(f"Assembled {OUT_HTML} ({len(full_html.encode('utf-8'))} bytes)")


if __name__ == "__main__":
    main()
