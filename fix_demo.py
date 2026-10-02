import re
file_path = r'c:\Users\rohit\OneDrive\Desktop\Kishan\src\context\DataContext.tsx'
with open(file_path, 'r') as f:
    content = f.read()
content = content.replace(\
import.meta.env.VITE_ENABLE_DEMO_MODE
!==
false
\, \import.meta.env.VITE_ENABLE_DEMO_MODE
===
true
\)
with open(file_path, 'w') as f:
    f.write(content)

