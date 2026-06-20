from reportlab.platypus import SimpleDocTemplate
from reportlab.platypus import Table
import pandas as pd
import os

def create_pdf():
    csv_path = "analytics.csv"
    if not os.path.exists(csv_path):
        # Create empty CSV so read_csv doesn't fail
        df = pd.DataFrame(columns=["model", "answer", "latency", "words", "length", "grounded", "retrieval", "embed_model", "score"])
        df.to_csv(csv_path, index=False)
    
    # Read the CSV file
    try:
        df = pd.read_csv(csv_path)
        # Check if the columns match the expected schema; if not, reload with headers
        expected_cols = ["model", "answer", "latency", "words", "length", "grounded", "retrieval", "embed_model", "score"]
        if list(df.columns) != expected_cols:
            df = pd.read_csv(csv_path, names=expected_cols)
    except Exception:
        df = pd.DataFrame(columns=["model", "answer", "latency", "words", "length", "grounded", "retrieval", "embed_model", "score"])

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
