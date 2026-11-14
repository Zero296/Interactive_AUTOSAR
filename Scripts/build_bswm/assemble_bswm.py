# -*- coding: utf-8 -*-
"""Assemble all 7 BswM parts into standalone offline d:\\__Personal\\AntiGravity\\Simulation\\AUTOSAR_BswM.html."""

import os
import subprocess
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "Simulation"))
OUT_FILE = os.path.join(OUT_DIR, "AUTOSAR_BswM.html")

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
    gen_script = os.path.join(BASE_DIR, "generate_part6_bswm.py")
    subprocess.run([sys.executable, gen_script], check=True)

    os.makedirs(OUT_DIR, exist_ok=True)
    chunks = []
    for name in PARTS:
        path = os.path.join(BASE_DIR, name)
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        chunks.append(content)
        print(f"Loaded {name:30s}: {len(content):7d} chars")

    assembled = "\n".join(chunks)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write(assembled)

    size_kb = os.path.getsize(OUT_FILE) / 1024.0
    print(f"Assembled -> {OUT_FILE} ({size_kb:.1f} KB, {len(assembled.splitlines())} lines)")


if __name__ == "__main__":
    main()
