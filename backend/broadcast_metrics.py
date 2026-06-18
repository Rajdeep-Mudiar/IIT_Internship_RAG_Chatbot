from collections import Counter
import re

def keyword_frequency(text):
    # Strip punctuation and tokenize
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    # Exclude common stop words
    stopwords = {
        "the", "and", "our", "you", "that", "this", "with", "from", "for", "have",
        "are", "was", "were", "been", "has", "had", "not", "but", "only", "about",
        "under", "their", "these", "there", "which", "more", "most", "some", "any",
        "into", "than", "then", "them", "they", "will", "would", "should", "could"
    }
    filtered = [w for w in words if w not in stopwords]
    if not filtered:
        return []
    return [w for w, _ in Counter(filtered).most_common(10)]

def extract_named_entities(text):
    # Match consecutive capitalized words as simple entities (e.g., Charles Bennett, India)
    entities = re.findall(r'\b[A-Z][a-zA-Z]+\b', text)
    stopwords = {"The", "And", "But", "For", "With", "This", "That", "Alice", "Bob"}
    filtered = [e for e in entities if e not in stopwords]
    return list(set(filtered))[:10]

def detect_sentiment(text):
    pos = {"good", "great", "excellent", "positive", "secure", "performance", "efficient", "better", "success", "solve"}
    neg = {"bad", "poor", "error", "unreliable", "noise", "fail", "eavesdropping", "corrupted", "damage", "attack"}
    words = text.lower().split()
    pos_count = sum(1 for w in words if any(p in w for p in pos))
    neg_count = sum(1 for w in words if any(n in w for n in neg))
    if pos_count > neg_count:
        return "Positive"
    elif neg_count > pos_count:
        return "Negative"
    return "Neutral"

def detect_emotion(text):
    emotions = {
        "Joy": {"great", "excellent", "success", "happy", "excited", "good"},
        "Anger": {"corrupted", "damage", "poor", "bad", "attack"},
        "Fear": {"eavesdropping", "unreliable", "threat", "danger", "noise"},
        "Surprise": {"unusual", "unexpected", "novel", "discovery"}
    }
    counts = {emo: 0 for emo in emotions}
    words = text.lower().split()
    for emo, keywords in emotions.items():
        counts[emo] = sum(1 for w in words if any(k in w for k in keywords))
    max_emo = max(counts, key=counts.get)
    if counts[max_emo] == 0:
        return "Neutral"
    return max_emo

def detect_topic(text):
    topics = {
        "Quantum Cryptography": {"quantum", "qkd", "bb84", "entanglement", "photon", "eavesdropper"},
        "Computer Networks": {"network", "packet", "protocol", "transmission", "router", "internet"},
        "Artificial Intelligence": {"llm", "neural", "learning", "embedding", "model", "parameter"},
        "Finance & Economy": {"economy", "market", "trade", "finance", "price", "bank"}
    }
    counts = {topic: 0 for topic in topics}
    words = text.lower().split()
    for topic, keywords in topics.items():
        counts[topic] = sum(1 for w in words if any(k in w for k in keywords))
    max_topic = max(counts, key=counts.get)
    if counts[max_topic] == 0:
        return "General Technology"
    return max_topic

def detect_toxicity(text):
    toxic_words = {"hate", "abuse", "kill", "idiot", "stupid", "garbage", "trash"}
    words = text.lower().split()
    count = sum(1 for w in words if any(t in w for t in toxic_words))
    if count > 2:
        return "High"
    elif count > 0:
        return "Medium"
    return "Low"

def compute_readability(text):
    words = text.split()
    sentences = re.split(r'[.!?]+', text)
    sentences = [s for s in sentences if s.strip()]
    if not words or not sentences:
        return "Standard"
    
    avg_sentence_len = len(words) / len(sentences)
    # Simple syllabic count heuristic: length of words > 7 chars
    long_words = sum(1 for w in words if len(w) > 7)
    pct_long_words = long_words / len(words)
    
    if avg_sentence_len > 20 or pct_long_words > 0.3:
        return "Difficult / Academic"
    elif avg_sentence_len < 10:
        return "Simple / Readable"
    return "Standard"

def generate_summary(text):
    sentences = re.split(r'(?<=[.!?])\s+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    if len(sentences) <= 2:
        return text
    return " ".join(sentences[:2])

def analyze_broadcast_text(text):
    words = text.split()
    total_words = len(words)
    
    # Heuristic: Speaking speed is 130 words per minute
    # Reading time is total_words / 180 wpm
    reading_minutes = max(1, round(total_words / 180))
    reading_time = f"{reading_minutes} min"
    
    # speaking speed: wpm
    speaking_speed = "130 wpm" if total_words > 0 else "0 wpm"
    
    return {
        "total_words": total_words,
        "speaking_speed": speaking_speed,
        "named_entities": extract_named_entities(text),
        "keywords": keyword_frequency(text),
        "topic": detect_topic(text),
        "sentiment": detect_sentiment(text),
        "summary": generate_summary(text),
        "toxicity": detect_toxicity(text),
        "emotion": detect_emotion(text),
        "readability": compute_readability(text),
        "reading_time": reading_time
    }
