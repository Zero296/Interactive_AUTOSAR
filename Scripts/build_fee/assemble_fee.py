# -*- coding: utf-8 -*-
"""Assembles AUTOSAR_Fee.html from modular build_fee parts."""

import os
import subprocess
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
OUT_HTML = os.path.join(ROOT_DIR, "Simulation", "04_ECU_Abstraction", "AUTOSAR_Fee.html")

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
    gen_script = os.path.join(SCRIPT_DIR, "generate_part6_fee.py")
    subprocess.run([sys.executable, gen_script], check=True)

    chunks = []
    for fname in PARTS:
        fpath = os.path.join(SCRIPT_DIR, fname)
        if not os.path.exists(fpath):
            raise FileNotFoundError(f"Missing part file: {fpath}")
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()
        chunks.append(content.rstrip("\n") + "\n")

    os.makedirs(os.path.dirname(OUT_HTML), exist_ok=True)
    final_html = "\n".join(chunks)
    with open(OUT_HTML, "w", encoding="utf-8") as f:
        f.write(final_html)

    size_kb = os.path.getsize(OUT_HTML) / 1024.0
    print(f"Assembled {OUT_HTML} ({len(final_html)} chars, {size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
