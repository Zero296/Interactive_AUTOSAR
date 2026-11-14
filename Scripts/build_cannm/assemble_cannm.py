import os
import base64

build_dir = os.path.dirname(os.path.abspath(__file__))
output_path = r"D:\__Personal\AntiGravity\Simulation\03_Services\AUTOSAR_CanNM.html"
asset_img_path = r"D:\__Personal\AntiGravity\Simulation\assets\figure_7_1_cannm_algorithm.jpg"

print("Reading modules...")
with open(os.path.join(build_dir, "part1_head_and_styles.html"), "r", encoding="utf-8") as f:
    p1 = f.read()

with open(os.path.join(build_dir, "part2_body_structure.html"), "r", encoding="utf-8") as f:
    p2 = f.read()

with open(os.path.join(build_dir, "part3_constants_and_cfg.js"), "r", encoding="utf-8") as f:
    p3 = f.read()

with open(os.path.join(build_dir, "part4_engine_and_scenarios.js"), "r", encoding="utf-8") as f:
    p4 = f.read()

with open(os.path.join(build_dir, "part5_ui_and_exports.js"), "r", encoding="utf-8") as f:
    p5 = f.read()

with open(os.path.join(build_dir, "part6_handbook.js"), "r", encoding="utf-8") as f:
    p6 = f.read()

with open(os.path.join(build_dir, "part7_multi_ecu.js"), "r", encoding="utf-8") as f:
    p7 = f.read()

# Encode image to Base64 for 100% standalone offline embedding
if os.path.exists(asset_img_path):
    print("Embedding Figure 7-1 Base64 image...")
    with open(asset_img_path, "rb") as img_f:
        img_b64 = base64.b64encode(img_f.read()).decode("utf-8")
        img_data_uri = f"data:image/jpeg;base64,{img_b64}"
        p6 = p6.replace('src="assets/figure_7_1_cannm_algorithm.jpg"', f'src="{img_data_uri}"')
        print(f"Base64 image embedded: {len(img_b64)} chars.")

# Assemble final HTML file
print("Assembling HTML...")
final_html = f"""{p1}
{p2}

<script>
{p3}

{p4}

{p5}

{p6}

{p7}
</script>
</body>
</html>
"""

with open(output_path, "w", encoding="utf-8") as f:
    f.write(final_html)

file_size = os.path.getsize(output_path)
print(f"SUCCESS: Generated {output_path}")
print(f"File size: {file_size:,} bytes")
