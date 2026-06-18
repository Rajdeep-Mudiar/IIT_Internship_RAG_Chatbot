import pandas as pd

def save_results(results):

    df=pd.DataFrame(results)

    df.to_csv(

        "analytics.csv",

        mode="a",

        header=False,

        index=False

    )

    