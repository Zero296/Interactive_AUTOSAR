# -*- coding: utf-8 -*-
import sys
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\__Personal\AntiGravity\Simulation\AUTOSAR_CanNM.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Verify that traceLogs.length was removed from restoreScenarioSnapshot and captureScenarioSnapshot
import re
bare_matches = re.findall(r'(?<!\.)traceLogs\.length', html)
assert len(bare_matches) == 0, f"ERROR: Bare traceLogs.length still present: {bare_matches}"
print("PASS: No undeclared bare traceLogs.length reference!")

# Verify simState.traceLogs is correctly used
assert 'simState.traceLogs' in html, "PASS: simState.traceLogs is used!"
print("PASS: simState.traceLogs used correctly!")

# Verify stepCtr.className is updated in updateScenarioStepUI
assert 'stepCtr.className = "badge ok"' in html, "PASS: Badge updates class on step!"
print("PASS: Badge class ok updated!")

print("All stepper checks passed!")
