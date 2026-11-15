# -*- coding: utf-8 -*-
"""Assembles parts 1..6 into Simulation/03_Services/AUTOSAR_DoIP.html."""
import os
import subprocess
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
OUT_DIR = os.path.join(REPO_ROOT, "Simulation", "03_Services")
OUT_HTML = os.path.join(OUT_DIR, "AUTOSAR_DoIP.html")

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
    gen_script = os.path.join(SCRIPT_DIR, "generate_part6_doip.py")
    subprocess.run([sys.executable, gen_script], check=True)

    os.makedirs(OUT_DIR, exist_ok=True)
    chunks = []
    for name in PARTS:
        p = os.path.join(SCRIPT_DIR, name)
        with open(p, "r", encoding="utf-8") as f:
            chunks.append(f.read())

    # Safety check: no premature closing script tags in JS parts 3..6
    for name, txt in zip(PARTS[2:], chunks[2:]):
        if "</script>" in txt.lower():
            raise ValueError(f"Unsafe literal script close tag found in {name}")

    full_html = "\n".join(chunks) + "\n</script>\n</body>\n</html>\n"
    with open(OUT_HTML, "w", encoding="utf-8") as f:
        f.write(full_html)

    lines = full_html.count("\n")
    size = os.path.getsize(OUT_HTML)
    print(f"Assembled {OUT_HTML} ({lines} lines, {size} bytes)")


if __name__ == "__main__":
    main()
