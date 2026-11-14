import os
import re
import sys

with open(r'D:\__Personal\AntiGravity\Simulation\03_Services\AUTOSAR_CanNM.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Extract JavaScript code inside <script> tags
scripts = re.findall(r'<script>(.*?)</script>', html, re.DOTALL)
print(f"Found {len(scripts)} script block(s).")

for idx, code in enumerate(scripts):
    print(f"Analyzing script block {idx+1} (length: {len(code)} characters)...")
    # Basic bracket balance check
    # Note: brackets inside strings or regex might not match unless tokenized, so let's do a simple tokenizer
    in_single_quote = False
    in_double_quote = False
    in_backtick = False
    in_line_comment = False
    in_block_comment = False
    escape = False

    stack = []
    line_no = 1

    for i, char in enumerate(code):
        if char == '\n':
            line_no += 1
            if in_line_comment:
                in_line_comment = False
            continue

        if escape:
            escape = False
            continue

        if char == '\\':
            if in_single_quote or in_double_quote or in_backtick:
                escape = True
            continue

        if in_line_comment:
            continue

        if in_block_comment:
            if char == '*' and i + 1 < len(code) and code[i+1] == '/':
                # End of block comment handled on next iteration
                pass
            elif char == '/' and i > 0 and code[i-1] == '*':
                in_block_comment = False
            continue

        if in_single_quote:
            if char == "'":
                in_single_quote = False
            continue

        if in_double_quote:
            if char == '"':
                in_double_quote = False
            continue

        if in_backtick:
            if char == '`':
                in_backtick = False
            continue

        # Check comment start
        if char == '/' and i + 1 < len(code):
            if code[i+1] == '/':
                in_line_comment = True
                continue
            elif code[i+1] == '*':
                in_block_comment = True
                continue

        # Check string start
        if char == "'":
            in_single_quote = True
            continue
        if char == '"':
            in_double_quote = True
            continue
        if char == '`':
            in_backtick = True
            continue

        # Bracket matching
        if char in '({[':
            stack.append((char, line_no))
        elif char in ')}]':
            if not stack:
                print(f"Error: unmatched closing {char} at line {line_no}")
                sys.exit(1)
            last, l_no = stack.pop()
            pairs = {')': '(', '}': '{', ']': '['}
            if pairs[char] != last:
                print(f"Error: mismatched {char} at line {line_no}, expected matching {last} from line {l_no}")
                sys.exit(1)

    if stack:
        print(f"Error: unclosed brackets: {stack[:10]}")
        sys.exit(1)
    else:
        print(f"Script block {idx+1} syntax balance verification PASSED! All brackets, quotes, and template literals balanced cleanly.")
