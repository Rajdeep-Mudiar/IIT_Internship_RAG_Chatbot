from reportlab.platypus import SimpleDocTemplate
from reportlab.platypus import Table
import pandas as pd
import os
from database import get_evaluation_records

def create_pdf():
    expected_cols = ["model", "answer", "latency", "words", "length", "grounded", "retrieval", "embed_model", "score"]
    
    # Try loading from MongoDB first
    records = get_evaluation_records()
    if records is not None and len(records) > 0:
        df = pd.DataFrame(records)
        df = df.reindex(columns=expected_cols).fillna("")
    else:
        # Fallback to CSV file
        csv_path = "analytics.csv"
        if not os.path.exists(csv_path):
            df = pd.DataFrame(columns=expected_cols)
            df.to_csv(csv_path, index=False)
        
        try:
            df = pd.read_csv(csv_path)
            if list(df.columns) != expected_cols:
                df = pd.read_csv(csv_path, names=expected_cols)
        except Exception:
            df = pd.DataFrame(columns=expected_cols)

    # Truncate answer strings and embedding model basenames so they fit on the page
    if "answer" in df.columns:
        df["answer"] = df["answer"].astype(str).apply(lambda x: x[:30] + "..." if len(x) > 30 else x)
    if "embed_model" in df.columns:
        df["embed_model"] = df["embed_model"].astype(str).apply(lambda x: x.split("/")[-1] if "/" in x else x)

    doc = SimpleDocTemplate(
        "analytics.pdf"
    )

    data = [list(df.columns)]
    data.extend(df.values.tolist())

    table = Table(data)
    doc.build([table])
