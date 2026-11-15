"""Assemble Scripts/build_soad parts into Simulation/03_Services/AUTOSAR_SoAd.html."""
import os
import subprocess
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
OUT_DIR = os.path.join(REPO_ROOT, "Simulation", "03_Services")
OUT_HTML = os.path.join(OUT_DIR, "AUTOSAR_SoAd.html")

HTML_PARTS = [
    "part1_head_and_styles.html",
    "part2_body_structure.html",
]

JS_PARTS = [
    "part3_constants_and_cfg.js",
    "part4_engine.js",
    "part4_scenarios.js",
    "part5_ui_and_exports.js",
    "part6_handbook.js",
]


def main():
    gen_script = os.path.join(SCRIPT_DIR, "generate_part6_soad.py")
    subprocess.run([sys.executable, gen_script], check=True)

    chunks = []
    for fname in HTML_PARTS:
        p = os.path.join(SCRIPT_DIR, fname)
        with open(p, "r", encoding="utf-8") as f:
            chunks.append(f.read())

    chunks.append("\n  <script>\n")

    for fname in JS_PARTS:
        p = os.path.join(SCRIPT_DIR, fname)
        with open(p, "r", encoding="utf-8") as f:
            chunks.append(f.read())
            chunks.append("\n")

    chunks.append("  </script>\n</body>\n</html>\n")

    os.makedirs(OUT_DIR, exist_ok=True)
    final_html = "".join(chunks)
    with open(OUT_HTML, "w", encoding="utf-8") as f:
        f.write(final_html)

    line_count = final_html.count("\n") + 1
    size_kb = os.path.getsize(OUT_HTML) / 1024.0
    print(f"Assembled {OUT_HTML}")
    print(f"Size: {size_kb:.1f} KB | Lines: {line_count}")


if __name__ == "__main__":
    main()
