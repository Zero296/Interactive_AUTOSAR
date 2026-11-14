# -*- coding: utf-8 -*-
"""Assembles all MCAL simulator parts into Simulation/05_MCAL/AUTOSAR_MCAL.html."""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT_HTML = os.path.join(REPO_ROOT, "Simulation", "05_MCAL", "AUTOSAR_MCAL.html")

if HERE not in sys.path:
    sys.path.insert(0, HERE)

import generate_part6_mcal

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
    generate_part6_mcal.main()
    chunks = []
    for fname in PARTS:
        fpath = os.path.join(HERE, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            txt = f.read()
        chunks.append(txt.rstrip("\r\n"))
        print(f" + {fname}: {len(txt.splitlines())} lines, {len(txt)} chars")

    os.makedirs(os.path.dirname(OUT_HTML), exist_ok=True)
    full_html = "\n".join(chunks) + "\n"
    with open(OUT_HTML, "w", encoding="utf-8", newline="\n") as out:
        out.write(full_html)
    print(f"Assembled -> {OUT_HTML} ({len(full_html.splitlines())} lines, {len(full_html):,} bytes)")


if __name__ == "__main__":
    main()
