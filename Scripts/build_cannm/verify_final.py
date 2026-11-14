import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\__Personal\AntiGravity\Simulation\03_Services\AUTOSAR_CanNM.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Check hbNav2
assert '<div class="hb-nav2" id="hbNav2">' in html
assert '1.1. Nguyên Lý Quản Lý Mạng Phân Tán' in html
print('hbNav2 pre-populated successfully.')

# Check Figure 7-1 Base64
assert 'data:image/jpeg;base64,' in html
print('Figure 7-1 Base64 embedded successfully.')

# Check 4.1 deep dive
assert 'CANNM_E_NET_START_IND' in html
assert 'Loopback Arrow' in html
assert 'NM_MODE_BUS_SLEEP' in html
print('Topic 4.1 deep dive content verified.')

# Check DOM IDs used in JS
dom_ids = set(re.findall(r'document\.getElementById\("([^"]+)"\)', html))
print(f'Checking {len(dom_ids)} getElementById references...')
missing = []
for did in dom_ids:
    if f'id="{did}"' not in html:
        missing.append(did)

if missing:
    print('WARNING: Missing DOM IDs:', missing)
else:
    print('All DOM IDs matched in HTML!')

print(f'Total HTML lines: {html.count(chr(10))}, Total bytes: {len(html)}')
