import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract CSS
style_match = re.search(r'<style>(.*?)</style>', content, re.DOTALL)
if style_match:
    css_content = style_match.group(1).strip()
    with open('assets/style.css', 'w', encoding='utf-8') as f:
        f.write(css_content + '\n')
    content = content[:style_match.start()] + '<link rel="stylesheet" href="assets/style.css">' + content[style_match.end():]

# Extract JS
script_match = re.search(r'<script>(.*?)</script>', content, re.DOTALL)
if script_match:
    js_content = script_match.group(1).strip()
    with open('assets/script.js', 'w', encoding='utf-8') as f:
        f.write(js_content + '\n')
    content = content[:script_match.start()] + '<script src="assets/script.js"></script>' + content[script_match.end():]

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Extraction completed.")
