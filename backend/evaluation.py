def groundedness(answer, context):

    answer_words = set(answer.lower().split())

    context_words = set(context.lower().split())

    overlap = len(

        answer_words.intersection(context_words)

    )

    total = len(answer_words)

    if total == 0:

        return 0

    return round(

        overlap / total,

        2

    )