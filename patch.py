import re
with open('ai-service/main.py', 'r', encoding='utf-8') as f:
    main_content = f.read()

with open('ai-service/new_ask.py', 'r', encoding='utf-8') as f:
    new_ask = f.read()

new_content = re.sub(r'@app\.post\("/ask"\).*', new_ask, main_content, flags=re.DOTALL)

with open('ai-service/main.py', 'w', encoding='utf-8') as f:
    f.write(new_content)
