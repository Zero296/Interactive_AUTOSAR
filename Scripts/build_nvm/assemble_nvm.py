# -*- coding: utf-8 -*-
"""Assemble NvM Simulator parts into Simulation/03_Services/AUTOSAR_NvM.html."""
import os
import subprocess
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "Simulation", "03_Services"))
OUT_FILE = os.path.join(OUT_DIR, "AUTOSAR_NvM.html")

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
    gen_script = os.path.join(BASE_DIR, "generate_part6_nvm.py")
    subprocess.run([sys.executable, gen_script], check=True)

    os.makedirs(OUT_DIR, exist_ok=True)
    chunks = []
    for name in PARTS:
        p = os.path.join(BASE_DIR, name)
        if not os.path.exists(p):
            raise FileNotFoundError(f"Missing part: {p}")
        with open(p, "r", encoding="utf-8") as f:
            chunks.append(f.read())

    content = "\n".join(chunks)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"Assembled {OUT_FILE} ({len(content):,} chars, {content.count(chr(10)) + 1} lines)")


if __name__ == "__main__":
    main()
