import re

with open(r'D:\__Personal\AntiGravity\Simulation\AUTOSAR_CanNM.html', 'r', encoding='utf-8') as f:
    html = f.read()

scripts = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)[0]

get_ids = set(re.findall(r'document\.getElementById\([\'"]([^\'"]+)[\'"]\)', scripts))
dom_ids = set(re.findall(r'id=[\'"]([^\'"]+)[\'"]', html))

missing_ids = get_ids - dom_ids
print(f"Total getElementById: {len(get_ids)}")
print(f"Total DOM IDs: {len(dom_ids)}")
print(f"Missing IDs in DOM: {missing_ids}")

if len(missing_ids) > 0:
    print("FAILED: Missing IDs found!")
else:
    print("SUCCESS: All DOM IDs matched 100%!")
