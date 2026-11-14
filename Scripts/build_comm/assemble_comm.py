from pathlib import Path
import subprocess
import sys

BUILD_DIR = Path(__file__).resolve().parent
OUT_FILE = BUILD_DIR.parent / "Simulation" / "AUTOSAR_ComM.html"

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
    gen_script = BUILD_DIR / "generate_part6_comm.py"
    subprocess.run([sys.executable, str(gen_script)], check=True)

    chunks = []
    for name in PARTS:
        p = BUILD_DIR / name
        if not p.exists():
            raise FileNotFoundError(f"Missing part: {p}")
        chunks.append(p.read_text(encoding="utf-8"))

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text("\n".join(chunks), encoding="utf-8")
    size_kb = OUT_FILE.stat().st_size / 1024
    print(f"Assembled {OUT_FILE} successfully ({size_kb:.1f} KB)")

if __name__ == "__main__":
    main()
