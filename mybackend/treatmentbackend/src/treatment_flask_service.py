from flask import Flask, request, jsonify
from treatment_federated_client import federated_client
import traceback

app = Flask(__name__)

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        patient_data = data.get('patient_data', {})
        treatment_data = data.get('treatment_data', {})
        
        result = federated_client.predict_billing(patient_data, treatment_data)
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/update-model', methods=['POST'])
def update_model():
    try:
        data = request.json
        patient_data = data.get('patient_data', {})
        treatment_data = data.get('treatment_data', {})
        
        success = federated_client.update_model(patient_data, treatment_data)
        return jsonify({"success": success})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)