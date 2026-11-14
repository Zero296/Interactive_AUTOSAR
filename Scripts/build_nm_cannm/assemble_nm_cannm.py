# -*- coding: utf-8 -*-
"""Assembler for AUTOSAR_Nm_CanNm.html — generates part6_handbook.js and stitches parts 1..6 into Simulation/AUTOSAR_Nm_CanNm.html."""

import runpy
from pathlib import Path

ROOT = Path(__file__).parent
OUT_FILE = ROOT.parent / "Simulation" / "AUTOSAR_Nm_CanNm.html"

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
    runpy.run_path(str(ROOT / "generate_part6_nm_cannm.py"), run_name="__main__")
    chunks = []
    for name in PARTS:
        p = ROOT / name
        if not p.exists():
            raise FileNotFoundError(f"Missing part: {p}")
        chunks.append(p.read_text(encoding="utf-8"))
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text("\n".join(chunks), encoding="utf-8")
    print(f"Assembled {OUT_FILE} ({OUT_FILE.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
