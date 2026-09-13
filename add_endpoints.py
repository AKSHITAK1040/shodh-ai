with open('ai-service/main.py', 'r', encoding='utf-8') as f:
    text = f.read()

endpoints = """
from pydantic import BaseModel
class IndexPayload(BaseModel):
    id: str
    content: str
    type: str

@app.post("/index/record")
def index_record(payload: IndexPayload):
    # 1. Add to Chroma
    vector_collection.add(
        documents=[payload.content],
        metadatas=[{"id": payload.id, "type": payload.type}],
        ids=[payload.id]
    )
    # 2. Add to Kuzu
    try:
        conn.execute(f"MERGE (n:{payload.type} {{id: $id}}) SET n.content = $content", {"id": payload.id, "content": payload.content})
    except Exception as e:
        print("Kuzu incremental index error:", e)
    return {"status": "indexed"}
"""

with open('ai-service/main.py', 'a', encoding='utf-8') as f:
    f.write("\n" + endpoints)
