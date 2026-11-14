import re
import sys

with open(r'D:\__Personal\AntiGravity\Simulation\AUTOSAR_CanNM.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Verify that simState.currentStep is NOT reset in resetSimulation
assert 'simState.currentStep = 0;' not in html[html.find('function resetSimulation()'):html.find('function resetSimulation()') + 600]
print("PASS: resetSimulation no longer resets simState.currentStep!")

# Verify restoreScenarioSnapshot and captureScenarioSnapshot exist
assert 'captureScenarioSnapshot' in html
assert 'restoreScenarioSnapshot' in html
print("PASS: Snapshot mechanism present in HTML!")

# Verify prevScenarioStep sets targetStep
assert 'const targetStep = simState.currentStep - 1;' in html
assert 'simState.currentStep = targetStep;' in html
print("PASS: prevScenarioStep precisely steps back to targetStep!")
