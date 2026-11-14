import sys
import re

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\__Personal\AntiGravity\build_cannm\part4_engine_and_scenarios.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Look for all occurrences of action: () => { ... }
# Let's extract per scenario
scenarios = re.findall(r'(\d+):\s*\{[^{]*title:\s*"([^"]+)",\s*steps:\s*\[(.*?)\]\s*,\s*whatIf:', text, re.DOTALL)
print(f"Total scenarios found: {len(scenarios)}")
for s_id, s_title, s_steps in scenarios:
    steps = re.findall(r'api:\s*"([^"]+)".*?action:\s*\(\)\s*=>\s*\{(.*?)\}\s*\}', s_steps, re.DOTALL)
    print(f"\nScenario {s_id}: {s_title} ({len(steps)} steps)")
    for idx, (api, act) in enumerate(steps):
        clean_act = " ".join(act.strip().split())
        print(f"  Step {idx} [{api}]: {clean_act[:90]}")
