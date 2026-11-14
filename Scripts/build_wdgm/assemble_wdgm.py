from pathlib import Path
import subprocess
import sys

BUILD_DIR = Path(__file__).resolve().parent
OUT_FILE = BUILD_DIR.parent / "Simulation" / "AUTOSAR_WdgM.html"

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
    gen_script = BUILD_DIR / "generate_part6_wdgm.py"
    print(f"Generating handbook via {gen_script.name}...")
    subprocess.run([sys.executable, str(gen_script)], check=True)

    chunks = []
    for p in PARTS:
        fp = BUILD_DIR / p
        if not fp.exists():
            raise FileNotFoundError(f"Missing build part: {fp}")
        chunks.append(fp.read_text(encoding="utf-8"))

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    html = "\n".join(chunks)
    OUT_FILE.write_text(html, encoding="utf-8")
    size_kb = len(html.encode("utf-8")) / 1024
    print(f"Assembled {OUT_FILE} successfully ({size_kb:.1f} KB, {len(html.splitlines())} lines).")

if __name__ == "__main__":
    main()
