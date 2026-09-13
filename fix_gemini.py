import re

with open('ai-service/main.py', 'r', encoding='utf-8') as f:
    text = f.read()

# Make use_gemini and gemini_failed strictly False where assigned
text = re.sub(r'use_gemini = .*?\n', 'use_gemini = False\n', text)
text = re.sub(r'gemini_failed = False\n', 'gemini_failed = False\n', text)

with open('ai-service/main.py', 'w', encoding='utf-8') as f:
    f.write(text)

with open('README.md', 'r', encoding='utf-8') as f:
    readme = f.read()

readme = readme.replace('Gemini', 'Groq').replace('GEMINI', 'GROQ')
with open('README.md', 'w', encoding='utf-8') as f:
    f.write(readme)
