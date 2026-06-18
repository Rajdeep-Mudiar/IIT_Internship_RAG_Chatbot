from collections import Counter

def analyze_text(text):

    words=text.lower().split()

    total=len(words)

    unique=len(set(words))

    common=Counter(words).most_common(10)

    return{

        "total_words":total,

        "unique_words":unique,

        "top_keywords":common

    }