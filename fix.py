with open('ai-service/main.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if line.startswith('        answer += "Gemini is temporarily unavailable. I switched to the local evidence-based fallback.'):
        lines[i] = '        answer += "Gemini is temporarily unavailable. I switched to the local evidence-based fallback.\\n\\n"\n'
        lines[i+1] = ''
        lines[i+2] = ''
    elif line.startswith('            prompt = f"Synthesize a final answer based ONLY on this retrieved evidence. Format strictly as:'):
        lines[i] = '            prompt = f"Synthesize a final answer based ONLY on this retrieved evidence. Format strictly as:\\nOBSERVATION\\n<facts>\\nINFERENCE\\n<deductions>\\nWHAT CANNOT BE ESTABLISHED\\n<unknowns>\\nEVIDENCE\\n<list sources>\\nQuery: {query}\\nEvidence: {final_evidence}"\n'
        for j in range(1, 10):
            if '<list sources>' in lines[i+j]:
                lines[i+j] = ''
                break
            lines[i+j] = ''
            
with open('ai-service/main.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)
