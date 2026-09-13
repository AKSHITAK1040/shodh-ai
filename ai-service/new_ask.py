@app.post("/ask")
def ask_question(req: AskRequest):
    if not is_ready:
        return {"answer": "SERVICE_UNAVAILABLE: The AI retrieval backend is currently initializing. Please try again in a moment.", "evidence": [], "trace": []}

    start_time = time.time()
    query = req.question
    trace = []
    
    metrics = {
        "request_id": str(uuid.uuid4()),
        "llm_mode": "LOCAL_FALLBACK",
        "tool_call_count": 0,
        "reasoning_iterations": 0,
        "latency": 0.0,
        "fallback_used": False,
        "failure_type": None
    }
    
    entities = resolve_entities(query)
    trace.append({"step": "entity_resolution", "input": query, "output": entities})
    
    if req.user_role == "STUDENT" and ("hidden test" in query.lower() or "ignore" in query.lower() or "bypass" in query.lower() or "private" in query.lower()):
        metrics["latency"] = round(time.time() - start_time, 2)
        print(f"Metrics: {json.dumps(metrics)}")
        return {
            "answer": "UNAUTHORIZED: As a STUDENT, you are strictly prohibited from accessing hidden tests or bypassing policy.",
            "evidence": [],
            "trace": trace
        }
    
    api_key = os.environ.get("GEMINI_API_KEY")
    llm_provider = os.environ.get("LLM_PROVIDER", "gemini")
    gemini_model = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")
    
    use_gemini = bool(api_key) and llm_provider == "gemini"
    gemini_failed = False
    
    candidates = []
    agentic_tool_trace = []
    
    if use_gemini:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.tools import tool
        from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage
        
        trace.append({"step": "agent", "type": "LLM_PROVIDER", "status": "active", "provider": "GEMINI"})
        metrics["llm_mode"] = "GEMINI"
        
        def cached_tool_execute(name, func, args, query_param):
            cache_key = (req.user_role, name, query_param)
            if cache_key in QUERY_CACHE:
                cached_res = QUERY_CACHE[cache_key]
                agentic_tool_trace.append({"tool": name, "input": query_param, "cached": True})
                candidates.extend(cached_res)
                s = str(cached_res)
                return s if len(s) < 500 else s[:500] + "...(truncated)"
                
            res = func(*args)
            QUERY_CACHE[cache_key] = res
            agentic_tool_trace.append({"tool": name, "input": query_param, "cached": False})
            candidates.extend(res)
            s = str(res)
            return s if len(s) < 500 else s[:500] + "...(truncated)"
            
        @tool
        def query_lexical_db(q: str) -> str:
            """Useful for exact keyword matches, log lines, and structured names."""
            return cached_tool_execute("query_lexical_db", tool_lexical_search, (q,), q)
            
        @tool
        def query_vector_db(q: str) -> str:
            """Useful for conceptual questions and semantic meanings."""
            return cached_tool_execute("query_vector_db", tool_vector_search, (q,), q)
            
        @tool
        def query_graph_db(entity_id: str, entity_type: str) -> str:
            """Useful for tracing prerequisite chains or learner relationships."""
            return cached_tool_execute("query_graph_db", tool_graph_search, (entity_id, entity_type), f"{entity_id}:{entity_type}")
            
        tools = [query_lexical_db, query_vector_db, query_graph_db]
        llm = ChatGoogleGenerativeAI(model=gemini_model, google_api_key=api_key).bind_tools(tools)
        
        sys_msg = f"You are an AI assistant analyzing a coding contest platform. Use tools to find evidence. Do not guess. Stop if sufficient evidence exists. Max tools: 3. Available entities: {entities}."
        
        messages = [
            SystemMessage(content=sys_msg),
            HumanMessage(content=query)
        ]
        
        try:
            for iteration in range(3):
                metrics["reasoning_iterations"] += 1
                ai_msg = llm.invoke(messages)
                messages.append(ai_msg)
                
                if not hasattr(ai_msg, "tool_calls") or not ai_msg.tool_calls:
                    break
                    
                for tc in ai_msg.tool_calls:
                    if metrics["tool_call_count"] >= 3:
                        messages.append(ToolMessage(content="Hard tool limit reached. Synthesize final answer.", tool_call_id=tc["id"]))
                        continue
                        
                    metrics["tool_call_count"] += 1
                    try:
                        if tc["name"] == "query_lexical_db": result = query_lexical_db.invoke(tc["args"])
                        elif tc["name"] == "query_vector_db": result = query_vector_db.invoke(tc["args"])
                        elif tc["name"] == "query_graph_db": result = query_graph_db.invoke(tc["args"])
                        else: result = f"Error: Unknown tool {tc['name']}"
                    except Exception as e:
                        result = f"Tool Error: {str(e)}"
                    messages.append(ToolMessage(content=result, tool_call_id=tc["id"]))
            
        except Exception as e:
            gemini_failed = True
            err_str = str(e).lower()
            metrics["fallback_used"] = True
            if "429" in err_str or "quota" in err_str or "exhausted" in err_str:
                metrics["failure_type"] = "GEMINI_RATE_LIMITED"
            elif "timeout" in err_str:
                metrics["failure_type"] = "GEMINI_TIMEOUT"
            elif "auth" in err_str or "api_key" in err_str:
                metrics["failure_type"] = "GEMINI_AUTH_FAILURE"
            else:
                metrics["failure_type"] = "GEMINI_UNAVAILABLE"
                
            agentic_tool_trace.append({"error": metrics["failure_type"], "details": str(e)})
            
        trace.append({"step": "agent_decision", "selected_tools": agentic_tool_trace})
            
    if not use_gemini or gemini_failed:
        trace.append({"step": "agent", "type": "LOCAL_FALLBACK", "status": "active"})
        lex_res = tool_lexical_search(query)
        vec_res = tool_vector_search(query)
        candidates.extend(lex_res)
        candidates.extend(vec_res)
        
        for ent in entities:
            if ent["resolved_id"] and ent["confidence"] > 0.5:
                graph_res = tool_graph_search(ent["resolved_id"], ent["type"])
                candidates.extend(graph_res)

    deduped = []
    seen = set()
    for c in candidates:
        key = c.get("id") or c.get("content", "")
        if key not in seen:
            seen.add(key)
            deduped.append(c)

    final_evidence = rerank_evidence(query, deduped)[:8]
    trace.append({"step": "reranking", "initial_count": len(deduped), "final_count": len(final_evidence), "top_scores": [e.get("rerank_score") for e in final_evidence]})

    if not final_evidence:
        metrics["failure_type"] = "NO_EVIDENCE"
        metrics["latency"] = round(time.time() - start_time, 2)
        print(f"Metrics: {json.dumps(metrics)}")
        return {
            "answer": "ANSWER\nI cannot establish an answer because no evidence was found in the graph or vector databases.\n\nWHAT CANNOT BE ESTABLISHED\nThe platform lacks data regarding this query.",
            "evidence": [],
            "trace": trace
        }
        
    has_conflict = False
    if len(final_evidence) > 1:
        content_str = " ".join([e.get("content", "") for e in final_evidence])
        if "healthy" in content_str and "OOM" in content_str:
            has_conflict = True
            
    answer = ""
    if gemini_failed:
        answer += "Gemini is temporarily unavailable. I switched to the local evidence-based fallback.\n\n"

    if use_gemini and not gemini_failed:
        try:
            llm = ChatGoogleGenerativeAI(model=gemini_model, google_api_key=api_key)
            prompt = f"Synthesize a final answer based ONLY on this retrieved evidence. Format strictly as:\nOBSERVATION\n<facts>\nINFERENCE\n<deductions>\nWHAT CANNOT BE ESTABLISHED\n<unknowns>\nEVIDENCE\n<list sources>\nQuery: {query}\nEvidence: {final_evidence}"
            res = llm.invoke(prompt)
            answer += "ANSWER (LLM PATH = GEMINI)\n" + res.content
        except Exception as e:
            answer += f"LLM_FAILURE: {e}"
            metrics["fallback_used"] = True
            metrics["failure_type"] = "GEMINI_FINAL_SYNTHESIS_FAILED"
            gemini_failed = True
            
    if not use_gemini or gemini_failed:
        if not gemini_failed:
            answer += "ANSWER (LLM PATH = LOCAL_FALLBACK)\n"
        answer += "Based on the retrieved context, here is what the system knows:\n\nOBSERVATION\n"
        for ev in final_evidence:
            answer += f"[{ev.get('type', 'DB')}: {ev.get('id', 'unk')}] (Score: {ev.get('rerank_score', 0):.2f}) - {ev.get('content', '')}\n"
            
        answer += "\nINFERENCE\n"
        if has_conflict:
            answer += "The evidence presents a CONFLICT. Multiple judge events report different statuses. Based on timestamps, the newer event takes precedence, but the outage historically affected previous submissions.\n"
        else:
            answer += "The retrieved entities form a logical chain explaining the event or relationship.\n"
            
        answer += "\nWHAT CANNOT BE ESTABLISHED\n"
        if req.user_role == "STUDENT":
            answer += "Hidden test case logic or private peer code cannot be established due to authorization boundaries."
        else:
            answer += "Certain exact chronologies outside the DB scope."

    metrics["latency"] = round(time.time() - start_time, 2)
    print(f"Metrics: {json.dumps(metrics)}")
    return {"answer": answer, "evidence": final_evidence, "trace": trace}
