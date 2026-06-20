import pandas as pd
import os
from database import save_evaluation_records

def save_csv(results):
    df = pd.DataFrame(results)
    # Reorder columns to match standard schema:
    # model,answer,latency,words,length,grounded,retrieval,embed_model,score
    cols = ["model", "answer", "latency", "words", "length", "grounded", "retrieval", "embed_model", "score"]
    # Filter to only existing keys in case of schema drift
    existing_cols = [c for c in cols if c in df.columns]
    df = df[existing_cols]

    csv_path = "analytics.csv"
    # If file exists, we append. If not, we write a new file with headers.
    file_exists = os.path.exists(csv_path)
    df.to_csv(
        csv_path,
        mode="a" if file_exists else "w",
        header=not file_exists,
        index=False
    )

    # Save to MongoDB as well
    try:
        save_evaluation_records(results)
    except Exception as e:
        print(f"Failed to save evaluation records to MongoDB: {e}")
