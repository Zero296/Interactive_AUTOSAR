# -*- coding: utf-8 -*-
"""Assembles the modular AUTOSAR Det Simulator parts into a standalone HTML file."""

import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))
OUT_PATH = os.path.join(REPO_ROOT, "Simulation", "03_Services", "AUTOSAR_Det.html")

sys.path.insert(0, BASE_DIR)
import generate_part6_det  # noqa: E402

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
    generate_part6_det.main()
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    chunks = []
    for fname in PARTS:
        fpath = os.path.join(BASE_DIR, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            chunks.append(f.read().rstrip("\r\n") + "\n")
    content = "".join(chunks)
    with open(OUT_PATH, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)
    print(f"Assembled {OUT_PATH} ({len(content):,} bytes, {content.count(chr(10)):,} lines)")


if __name__ == "__main__":
    main()
