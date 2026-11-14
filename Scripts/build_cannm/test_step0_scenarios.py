import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\__Personal\AntiGravity\Simulation\AUTOSAR_CanNM.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Check that Step 0 exists for S1..S14
for s in range(1, 15):
    pattern = rf'{s}:\s*\{{\s*title:\s*"([^"]+)",\s*steps:\s*\[\s*\{{\s*api:\s*"Bước 0:'
    m = re.search(pattern, html)
    if m:
        print(f"Scenario {s} has Step 0: {m.group(1)}")
    else:
        print(f"ERROR: Scenario {s} missing Step 0!")
        sys.exit(1)

print("All 14 scenarios successfully verified with Step 0 Preconditions!")
