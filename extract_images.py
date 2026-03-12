import re
import base64
import os

def process_file(filepath, folder):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Regex to find data URIs
    pattern = r'data:image/([a-zA-Z]+);base64,([a-zA-Z0-9+/=]+)'
    matches = list(re.finditer(pattern, content))
    
    offset = 0
    new_content = ""
    last_end = 0
    
    for i, match in enumerate(matches):
        ext = match.group(1)
        if ext == 'jpeg':
            ext = 'jpg'
        b64_data = match.group(2)
        
        # Save image
        img_filename = f'extracted_{os.path.basename(filepath)}_{i}.{ext}'
        img_path = os.path.join(folder, img_filename)
        with open(img_path, 'wb') as img_f:
            img_f.write(base64.b64decode(b64_data))
        
        # Replace in content
        new_content += content[last_end:match.start()]
        if filepath == 'index.html':
            replacement = f'assets/{img_filename}'
        else:
            replacement = f'{img_filename}'
            
        new_content += replacement
        last_end = match.end()
        print(f"Extracted {img_filename}")
        
    new_content += content[last_end:]
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

process_file('assets/style.css', 'assets')
process_file('index.html', 'assets')

