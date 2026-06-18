def calculate_score(item):
    # If the model request failed (signaled by latency >= 99.99), score is 0.0
    if item.get("latency", 0) >= 99.99:
        return 0.0

    retrieval = item.get("retrieval", 0)
    grounded = item.get("grounded", 0)
    latency = item.get("latency", 0)
    words = item.get("words", 0)

    score = (
        retrieval * 40
        + grounded * 30
        + (10 / (latency + 1)) * 20
        + min(words / 100, 1) * 10
    )
    return round(score, 2)

def rank_models(results):
    for item in results:
        item["score"] = calculate_score(item)
    return sorted(
        results,
        key=lambda x: x["score"],
        reverse=True
    )