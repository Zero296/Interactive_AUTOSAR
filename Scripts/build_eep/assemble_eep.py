# -*- coding: utf-8 -*-
"""Assembles Simulation/05_MCAL/AUTOSAR_Eep.html from modular parts in Scripts/build_eep/."""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT_PATH = os.path.join(REPO_ROOT, "Simulation", "05_MCAL", "AUTOSAR_Eep.html")

if HERE not in sys.path:
    sys.path.insert(0, HERE)

import generate_part6_eep


def read_part(filename):
    path = os.path.join(HERE, filename)
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def main():
    generate_part6_eep.main()

    part1 = read_part("part1_head_and_styles.html")
    part2 = read_part("part2_body_structure.html")
    part3 = read_part("part3_constants_and_cfg.js")
    part4a = read_part("part4_engine.js")
    part4b = read_part("part4_scenarios.js")
    part5 = read_part("part5_ui_and_exports.js")
    part6 = read_part("part6_handbook.js")

    # Sanity guard: part2 ends with <script>
    if not part2.rstrip().endswith("<script>"):
        raise RuntimeError("part2_body_structure.html must end cleanly with <script>")

    assembled = (
        part1.rstrip()
        + "\n"
        + part2.rstrip()
        + "\n"
        + part3.rstrip()
        + "\n\n"
        + part4a.rstrip()
        + "\n\n"
        + part4b.rstrip()
        + "\n\n"
        + part5.rstrip()
        + "\n\n"
        + part6.rstrip()
        + "\n</script>\n</body>\n</html>\n"
    )

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write(assembled)

    size_kb = os.path.getsize(OUT_PATH) / 1024.0
    print(f"Successfully assembled {OUT_PATH} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
