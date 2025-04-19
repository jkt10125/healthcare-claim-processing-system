from sklearn.linear_model import LinearRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.base import BaseEstimator, TransformerMixin
import pandas as pd
import pickle

def preprocess(df: pd.DataFrame):
    # drop rows with missing values
    df.dropna(inplace=True)

    # drop duplicate rows
    df.drop_duplicates(inplace=True)

    # convert categorical columns to one-hot encoded form
    categorical_columns = [
        "Gender",
        "Blood Type",
        "Medical Condition",
        "Admission Type",
        "Medication",
    ]
    ct = ColumnTransformer([('encode_cats', OneHotEncoder(), categorical_columns),],
                       remainder='passthrough')

    df_transformed = ct.fit_transform(df)
    feature_names = ct.get_feature_names_out()
    df = pd.DataFrame(df_transformed, columns=feature_names)

    with open("preprocessing_pipeline.pkl", "wb") as f:
        pickle.dump(ct, f)

    return df


def main():
    df = pd.read_csv("data/healthcare_dataset.csv")
    # choose columns to drop
    df.drop(["Name", "Doctor", "Insurance Provider", "Hospital", "Room Number", "Test Results"], inplace=True, axis=1)

    df = preprocess(df)

    df["Days Admitted"] = (pd.to_datetime(df["remainder__Discharge Date"]) - pd.to_datetime(df["remainder__Date of Admission"])).dt.days
    df.drop(["remainder__Date of Admission", "remainder__Discharge Date"], axis=1, inplace=True)

    # Train using Linear Regression
    X = df.drop("remainder__Billing Amount", axis=1)
    y = df["remainder__Billing Amount"]

    model = LinearRegression()
     

    # Save the model
    with open("linear_model.pkl", "wb") as f:
        pickle.dump(model, f)

if __name__ == "__main__":
    main()