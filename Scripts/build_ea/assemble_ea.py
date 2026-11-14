# -*- coding: utf-8 -*-
"""Assembles AUTOSAR_Ea.html from modular parts inside Scripts/build_ea/."""

import os
import subprocess
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GEN_SCRIPT = os.path.join(BASE_DIR, "generate_part6_ea.py")
OUT_FILE = os.path.abspath(
    os.path.join(BASE_DIR, "..", "..", "Simulation", "04_ECU_Abstraction", "AUTOSAR_Ea.html")
)

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
    # Regenerate part6_handbook.js first
    res = subprocess.run([sys.executable, GEN_SCRIPT], check=True)
    if res.returncode != 0:
        sys.exit(res.returncode)

    chunks = []
    for fname in PARTS:
        fpath = os.path.join(BASE_DIR, fname)
        if not os.path.isfile(fpath):
            raise FileNotFoundError(f"Missing part file: {fpath}")
        with open(fpath, "r", encoding="utf-8") as f:
            txt = f.read()
        chunks.append(txt.rstrip("\n") + "\n")

    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    combined = "".join(chunks)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write(combined)

    print(f"Assembled {OUT_FILE} ({len(combined):,} chars, {len(PARTS)} parts).")


if __name__ == "__main__":
    main()
