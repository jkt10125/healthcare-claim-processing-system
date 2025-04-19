import os
import pickle
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from flask import Flask, request, jsonify
import json
from flask_cors import CORS
import threading
import time

app = Flask(__name__)
CORS(app)

# Global model
global_model = None
model_version = 0
model_lock = threading.Lock()
update_count = 0

# Initialize the model
def initialize_model():
    global global_model, model_version
    try:
        # Try to load an existing model
        with open("linear_model.pkl", "rb") as f:
            global_model = pickle.load(f)
        print("Loaded existing global model")
    except FileNotFoundError:
        # If no model exists, create a new one
        global_model = LinearRegression()
        print("Created new global model")
    
    model_version = 0
    save_model()

def save_model():
    global global_model, model_version
    with open("linear_model.pkl", "wb") as f:
        pickle.dump(global_model, f)
    # Also save the model weights separately as a JSON serializable format
    if hasattr(global_model, 'coef_') and hasattr(global_model, 'intercept_'):
        weights = {
            'coef': global_model.coef_.tolist() if hasattr(global_model.coef_, 'tolist') else global_model.coef_,
            'intercept': float(global_model.intercept_) if hasattr(global_model, 'intercept_') else 0.0,
            'version': model_version
        }
        with open("model_weights.json", "w") as f:
            json.dump(weights, f)
    print(f"Saved global model (version {model_version})")

@app.route('/model/weights', methods=['GET'])
def get_model_weights():
    global global_model, model_version
    with model_lock:
        if global_model is None:
            return jsonify({"error": "Model not initialized"}), 500
        
        if hasattr(global_model, 'coef_') and hasattr(global_model, 'intercept_'):
            return jsonify({
                'coef': global_model.coef_.tolist() if hasattr(global_model.coef_, 'tolist') else global_model.coef_,
                'intercept': float(global_model.intercept_) if hasattr(global_model, 'intercept_') else 0.0,
                'version': model_version
            })
        else:
            return jsonify({
                'error': 'Model not trained yet',
                'version': model_version
            }), 400

@app.route('/model/update', methods=['POST'])
def update_model():
    global global_model, model_version, update_count
    
    with model_lock:
        data = request.json
        client_version = data.get('version', 0)
        
        # If client has outdated model, reject update
        if client_version < model_version:
            return jsonify({
                'success': False,
                'message': 'Client model is outdated. Please fetch the latest model.',
                'current_version': model_version
            }), 409  # Conflict
        
        try:
            new_coef = np.array(data['coef'])
            new_intercept = float(data['intercept'])
            
            # Initialize global model if it's not trained yet
            if not hasattr(global_model, 'coef_'):
                global_model.coef_ = new_coef
                global_model.intercept_ = new_intercept
            else:
                # Simple averaging strategy for federated learning
                # In a real-world scenario, you might use weighted averaging or more sophisticated methods
                update_count += 1
                # FedAvg algorithm: weighted average of the models
                global_model.coef_ = (global_model.coef_ * update_count + new_coef) / (update_count + 1)
                global_model.intercept_ = (global_model.intercept_ * update_count + new_intercept) / (update_count + 1)
            
            # Increment model version
            model_version += 1
            save_model()
            
            return jsonify({
                'success': True,
                'message': 'Model updated successfully',
                'version': model_version
            })
        
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error updating model: {str(e)}'
            }), 400

if __name__ == '__main__':
    initialize_model()
    app.run(host='0.0.0.0', port=5000)