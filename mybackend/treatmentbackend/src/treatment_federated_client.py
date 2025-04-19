import numpy as np
import pandas as pd
import pickle
import requests
import json
import os
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
import threading
import time

# Model server URL
MODEL_SERVER_URL = "http://localhost:5000"
LOCAL_MODEL_PATH = "local_linear_model.pkl"
PREPROCESSING_PIPELINE_PATH = "../../global_model/preprocessing_pipeline.pkl"

class FederatedClient:
    def __init__(self):
        self.model = None
        self.model_version = 0
        self.preprocessor = None
        self.lock = threading.Lock()
        self.initialize()
    
    def initialize(self):
        # Load the preprocessing pipeline
        try:
            with open(PREPROCESSING_PIPELINE_PATH, "rb") as f:
                self.preprocessor = pickle.load(f)
        except FileNotFoundError:
            print("Preprocessing pipeline not found. Please train the model first.")
            self.preprocessor = None
        
        # Try to load the local model or fetch from server
        try:
            with open(LOCAL_MODEL_PATH, "rb") as f:
                self.model = pickle.load(f)
                print("Loaded local model")
        except FileNotFoundError:
            print("Local model not found, fetching from server...")
            self.fetch_model()
    
    def fetch_model(self):
        """Fetch the latest model weights from the server"""
        try:
            response = requests.get(f"{MODEL_SERVER_URL}/model/weights")
            if response.status_code == 200:
                weights = response.json()
                
                # If model not initialized yet, create new model
                if self.model is None:
                    self.model = LinearRegression()
                
                # Apply the weights to the model
                if 'coef' in weights and 'intercept' in weights:
                    self.model.coef_ = np.array(weights['coef'])
                    self.model.intercept_ = float(weights['intercept'])
                    self.model_version = weights['version']
                    
                    # Save the model locally
                    with open(LOCAL_MODEL_PATH, "wb") as f:
                        pickle.dump(self.model, f)
                    
                    print(f"Updated local model to version {self.model_version}")
                    return True
                else:
                    print("Server model not trained yet")
                    # Initialize untrained model
                    self.model = LinearRegression()
                    return False
                
            else:
                print(f"Failed to fetch model: {response.status_code}, {response.text}")
                return False
                
        except Exception as e:
            print(f"Error fetching model: {str(e)}")
            return False
    
    def load_df(self, patient_dict, treatment_dict):
        """
        {
            "name": "John Doe",
            "age": 30,
            "gender": "Male",
            "bloodType": "O+",
            "height": 180,
            "weight": 75,
            "address": "123 Main St",
            "dob": "1990-01-01",
            "aadharNumber": "123456789012",
            "insuranceNumber": "INS123456",
            "phoneNumber": "1234567890",
            "emailID": "john.doe@example.com",
            "smokerStatus": "1"
        },
        {
            "medicalCondition": "Fever",
            "hospitalName": "City Hospital",
            "roomNumber": "101",
            "admissionType": "Emergency",
            "medication": "Paracetamol",
            "patientID": "PATIENT1",
            "admissionDate": "2023-10-01",
            "releaseDate": "2023-10-05",
            "billingAmount": 500.5,
            "doctorName": "Dr. Smith"
        }
        """

        target_dict = {
            "Age": patient_dict["age"],
            "Gender": patient_dict["gender"],
            "Blood Type": patient_dict["bloodType"],
            "Medical Condition": treatment_dict["medicalCondition"],
            "Admission Type": treatment_dict["admissionType"],
            "Medication": treatment_dict["medication"],
            "Date of Admission": treatment_dict["admissionDate"],
            "Discharge Date": treatment_dict["releaseDate"],
            "Billing Amount": treatment_dict["billingAmount"],
        }
        # Convert to DataFrame
        df = pd.DataFrame([target_dict])
    
    def preprocess_patient_data(self, X):
        """Convert patient data into feature matrix suitable for model"""
        if self.preprocessor is None:
            raise ValueError("Preprocessor not loaded. Cannot preprocess data.")
            
        # Apply the same preprocessing as during training
        X_transformed = self.preprocessor.transform(X)
        feature_names = self.preprocessor.get_feature_names_out()
        processed_df = pd.DataFrame(X_transformed, columns=feature_names)
        
        # Calculate days admitted if dates are present
        if "remainder__Date of Admission" in processed_df.columns and "remainder__Discharge Date" in processed_df.columns:
            processed_df["Days Admitted"] = (
                pd.to_datetime(processed_df["remainder__Discharge Date"]) - 
                pd.to_datetime(processed_df["remainder__Date of Admission"])
            ).dt.days
            processed_df.drop(["remainder__Date of Admission", "remainder__Discharge Date"], axis=1, inplace=True)
        
        return processed_df
    
    def update_model(self, patient_data, treatment_data):
        """Update the model with new patient data"""
        with self.lock:
            try:
                # Make sure we have the latest model
                self.fetch_model()

                # Convert to dataframe
                df = self.load_df(patient_data, treatment_data)
                X = df.drop("Billing Amount", axis=1)
                # Prepare data
                X = self.preprocess_patient_data(X)
                y = np.array(df["Billing Amount"])
                
                # Create local copy of the model to train
                local_model = LinearRegression()
                
                # If we have coefficients from global model, initialize with them
                if hasattr(self.model, 'coef_'):
                    local_model.coef_ = self.model.coef_.copy()
                    local_model.intercept_ = self.model.intercept_
                
                # Train on the new data
                local_model.fit(X, y)
                
                # Send the updated weights to the server
                self._send_model_update(local_model)
                
                # Update local model
                self.model = local_model
                with open(LOCAL_MODEL_PATH, "wb") as f:
                    pickle.dump(self.model, f)
                
                return True
            
            except Exception as e:
                print(f"Error updating model: {str(e)}")
                return False
    
    def _send_model_update(self, model):
        """Send the updated model weights to the server"""
        try:
            weights = {
                'coef': model.coef_.tolist() if hasattr(model.coef_, 'tolist') else model.coef_,
                'intercept': float(model.intercept_),
                'version': self.model_version
            }
            
            response = requests.post(
                f"{MODEL_SERVER_URL}/model/update",
                json=weights,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                self.model_version = result.get('version', self.model_version + 1)
                print(f"Model update sent successfully, new version: {self.model_version}")
                return True
            else:
                print(f"Failed to send model update: {response.status_code}, {response.text}")
                
                # If model is outdated, fetch the latest
                if response.status_code == 409:
                    self.fetch_model()
                
                return False
                
        except Exception as e:
            print(f"Error sending model update: {str(e)}")
            return False
    
    def predict_billing(self, patient_data, treatment_data):
        """Use the model to predict billing amount for a patient"""
        with self.lock:
            if self.model is None or not hasattr(self.model, 'coef_'):
                if not self.fetch_model() or not hasattr(self.model, 'coef_'):
                    return {"error": "Model not trained yet"}
            
            try:
                df = self.load_df(patient_data, treatment_data)
                X = df.drop("Billing Amount", axis=1)

                # Prepare data
                X = self.preprocess_patient_data(X)
                prediction = self.model.predict(X)
                
                return {
                    "predicted_billing_amount": float(prediction[0]),
                    "model_version": self.model_version
                }
            
            except Exception as e:
                print(f"Error making prediction: {str(e)}")
                return {"error": str(e)}

# Create a singleton instance
federated_client = FederatedClient()

# Background task to periodically sync with central model
def sync_with_server():
    while True:
        try:
            federated_client.fetch_model()
        except Exception as e:
            print(f"Error syncing with server: {str(e)}")
        time.sleep(300)  # Sync every 5 minutes

# Start background sync in a separate thread
sync_thread = threading.Thread(target=sync_with_server, daemon=True)
sync_thread.start()