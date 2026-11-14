import sys
import re

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\__Personal\AntiGravity\Simulation\AUTOSAR_CanNM.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's inspect nextScenarioStep, prevScenarioStep, updateScenarioStepUI
p_next = re.search(r'function nextScenarioStep\(\)\s*\{(.*?)\n\}', html, re.DOTALL)
p_prev = re.search(r'function prevScenarioStep\(\)\s*\{(.*?)\n\}', html, re.DOTALL)
p_ui = re.search(r'function updateScenarioStepUI\(\)\s*\{(.*?)\n\}', html, re.DOTALL)

print("=== nextScenarioStep ===")
print(p_next.group(0))
print("\n=== prevScenarioStep ===")
print(p_prev.group(0))
print("\n=== updateScenarioStepUI ===")
print(p_ui.group(0))
