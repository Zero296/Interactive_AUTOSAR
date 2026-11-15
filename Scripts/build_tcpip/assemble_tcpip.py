#!/usr/bin/env python3
"""Assembles AUTOSAR_TcpIp.html from modular parts in Scripts/build_tcpip/."""

import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT_DIR = os.path.join(ROOT, "Simulation", "03_Services")
OUT_FILE = os.path.join(OUT_DIR, "AUTOSAR_TcpIp.html")

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
    gen_script = os.path.join(HERE, "generate_part6_tcpip.py")
    subprocess.run([sys.executable, gen_script], check=True)

    os.makedirs(OUT_DIR, exist_ok=True)
    chunks = []
    for p in PARTS:
        fp = os.path.join(HERE, p)
        if not os.path.exists(fp):
            raise FileNotFoundError(f"Missing part file: {fp}")
        with open(fp, "r", encoding="utf-8") as f:
            txt = f.read()
        chunks.append(txt)
        print(f"  + {p}: {len(txt)} bytes")

    final_html = "\n".join(chunks) + "\n</script>\n</body>\n</html>\n"
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write(final_html)

    print(f"\n[assemble_tcpip] Built {OUT_FILE} ({len(final_html)} bytes, {final_html.count(chr(10))} lines)")


if __name__ == "__main__":
    main()
