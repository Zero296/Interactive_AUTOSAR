#!/usr/bin/env python3
"""
Assemble AUTOSAR EcuM Simulator standalone single-file HTML from build_ecum parts.
"""

import os
import subprocess
import sys

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
    base_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(base_dir)
    out_dir = os.path.join(root_dir, "Simulation")
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "AUTOSAR_EcuM.html")

    print("1. Generating part6_handbook.js ...")
    subprocess.run([sys.executable, os.path.join(base_dir, "generate_part6_ecum.py")], check=True)

    print("2. Concatenating 7 parts into Simulation/AUTOSAR_EcuM.html ...")
    chunks = []
    for name in PARTS:
        p = os.path.join(base_dir, name)
        with open(p, "r", encoding="utf-8") as f:
            txt = f.read()
        chunks.append(txt)
        print(f"   + {name}: {len(txt)} chars")

    final_html = "\n".join(chunks)
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(final_html)
    print(f"DONE -> {out_file} ({len(final_html)} chars, {final_html.count(chr(10)) + 1} lines)")


if __name__ == "__main__":
    main()
