import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\__Personal\AntiGravity\build_cannm\part6_handbook.js', 'r', encoding='utf-8') as f:
    text = f.read()

subtopics = re.findall(r'title:\s*"([1-6]\.[1-9][^"]*)"', text)
print(f"Total subtopics found: {len(subtopics)}")
for st in subtopics:
    print(" -", st)

# Check how many tables
tables = len(re.findall(r'<table', text))
print(f"Total <table> elements in handbook: {tables}")

# Check for bullet points <ul>, <li>, &bull;, \u2022
uls = len(re.findall(r'<ul', text))
lis = len(re.findall(r'<li', text))
bullets = text.count('\u2022')
print(f"UL tags: {uls}, LI tags: {lis}, Unicode bullets: {bullets}")
