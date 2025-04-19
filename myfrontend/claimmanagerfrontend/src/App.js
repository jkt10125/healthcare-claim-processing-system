import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [claims, setClaims] = useState([]);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [treatmentDetails, setTreatmentDetails] = useState(null);
  const [predictedAmount, setPredictedAmount] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      const response = await axios.get('http://localhost:3002/claims');
      setClaims(response.data);
    } catch (error) {
      alert('Error fetching claims: ' + error.message);
    }
  };

  const updateClaimStatus = async (claimID, newStatus) => {
    try {
      await axios.put(`http://localhost:3002/claims/${claimID}`, {
        ...selectedClaim,
        status: newStatus
      });
      fetchClaims();
      setSelectedClaim(null);
    } catch (error) {
      alert('Error updating claim: ' + error.message);
    }
  };

  const fetchPatientDetails = async (patientID) => {
    try {
      const response = await axios.get(`http://localhost:3001/patients/${patientID}`);
      setPatientDetails(response.data);
    } catch (error) {
      alert('Error fetching patient details: ' + error.message);
    }
  };

  const fetchTreatmentDetails = async (treatmentID) => {
    try {
      const response = await axios.get(`http://localhost:3001/treatments/${treatmentID}`);
      setTreatmentDetails(response.data);
    } catch (error) {
      alert('Error fetching treatment details: ' + error.message);
    }
  };

  const predictBillingAmount = async () => {
    if (!patientDetails || !treatmentDetails) {
      alert('Please fetch both patient and treatment details first');
      return;
    }

    setIsPredicting(true);
    
    // Prepare data for ML model
    const mlRequestData = {
      patient: {
        name: patientDetails.name,
        age: patientDetails.age,
        gender: patientDetails.gender,
        bloodType: patientDetails.bloodType,
        height: patientDetails.height,
        weight: patientDetails.weight,
        address: patientDetails.address,
        dob: patientDetails.dob,
        aadharNumber: patientDetails.aadharNumber,
        insuranceNumber: patientDetails.insuranceNumber,
        phoneNumber: patientDetails.phoneNumber,
        emailID: patientDetails.emailID,
        smokerStatus: patientDetails.smokerStatus
      },
      treatment: {
        medicalCondition: treatmentDetails.medicalCondition,
        hospitalName: treatmentDetails.hospitalName,
        roomNumber: treatmentDetails.roomNumber,
        admissionType: treatmentDetails.admissionType,
        medication: treatmentDetails.medication,
        patientID: treatmentDetails.patientID,
        admissionDate: treatmentDetails.admissionDate,
        releaseDate: treatmentDetails.releaseDate,
        billingAmount: treatmentDetails.billingAmount,
        doctorName: treatmentDetails.doctorName
      }
    };

    console.log('Data sent to ML model:', mlRequestData);
    
    // Actual API call to ML model (commented out for now)
    try {
      const response = await axios.post('http://localhost:5000/predict', mlRequestData);
      setPredictedAmount(response.data.predictedAmount);
    } catch (error) {
      alert('Error predicting billing amount: ' + error.message);
    }

    // Mock prediction to test the UI
    // const mockPrediction = Math.floor(Math.random() * 600) + 400;
    // setPredictedAmount(mockPrediction);
    setPredictedAmount(response.data.predicted_billing_amount);
    
    setIsPredicting(false);
  };

  const closeModal = () => {
    setSelectedClaim(null);
    setPatientDetails(null);
    setTreatmentDetails(null);
    setPredictedAmount(null);
  };

  return (
    <div className="app">
      <h1>Insurance Claim Manager</h1>
      
      <div className="claims-list">
        <h2>Submitted Claims ({claims.length})</h2>
        <div className="claims-container">
          {claims.length === 0 ? (
            <p>No claims found</p>
          ) : (
            claims.map((claim) => (
              <div key={claim.claimID} className="claim-card">
                <div className="claim-info">
                  <h3>{claim.patientID}</h3>
                  <p>Claim ID: {claim.claimID}</p>
                  <p>Status: 
                    <span className={`status ${claim.status.toLowerCase()}`}>
                      {claim.status}
                    </span>
                  </p>
                </div>
                <div className="claim-actions">
                  <button onClick={() => setSelectedClaim(claim)}>
                    View Details
                  </button>
                  {claim.status === 'PENDING' && (
                    <>
                      <button className="approve" onClick={() => updateClaimStatus(claim.claimID, 'APPROVED')}>
                        Approve
                      </button>
                      <button className="reject" onClick={() => updateClaimStatus(claim.claimID, 'REJECTED')}>
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedClaim && (
        <div className="modal">
          <div className="modal-content">
            <h2>Claim Details</h2>
            
            <div className="detail-item">
              <label>Claim ID:</label>
              <p>{selectedClaim.claimID}</p>
            </div>

            <div className="detail-item">
              <label>Treatment ID:</label>
              <div className="id-with-action">
                <p>{selectedClaim.treatmentID}</p>
                <button 
                  onClick={() => fetchTreatmentDetails(selectedClaim.treatmentID)}
                  className="fetch-button"
                >
                  Fetch Treatment
                </button>
              </div>
              {treatmentDetails && (
                <div className="nested-details">
                  <div className="detail-group">
                    <h4>Admission Details</h4>
                    <p><strong>Hospital:</strong> {treatmentDetails.hospitalName}</p>
                    <p><strong>Room Number:</strong> {treatmentDetails.roomNumber}</p>
                    <p><strong>Admission Type:</strong> {treatmentDetails.admissionType}</p>
                    <p><strong>Admission Date:</strong> {new Date(treatmentDetails.admissionDate).toLocaleDateString()}</p>
                    <p><strong>Release Date:</strong> {new Date(treatmentDetails.releaseDate).toLocaleDateString()}</p>
                  </div>

                  <div className="detail-group">
                    <h4>Medical Details</h4>
                    <p><strong>Condition:</strong> {treatmentDetails.medicalCondition}</p>
                    <p><strong>Medication:</strong> {treatmentDetails.medication}</p>
                    <p><strong>Attending Doctor:</strong> {treatmentDetails.doctorName}</p>
                  </div>

                  <div className="detail-group">
                    <h4>Billing Information</h4>
                    <p><strong>Total Amount:</strong> ₹{treatmentDetails.billingAmount.toFixed(2)}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="detail-item">
              <label>Patient ID:</label>
              <div className="id-with-action">
                <p>{selectedClaim.patientID}</p>
                <button 
                  onClick={() => fetchPatientDetails(selectedClaim.patientID)}
                  className="fetch-button"
                >
                  Fetch Patient
                </button>
              </div>
              {patientDetails && (
                <div className="nested-details">
                  <div className="detail-group">
                    <h4>Personal Information</h4>
                    <p><strong>Name:</strong> {patientDetails.name}</p>
                    <p><strong>Age:</strong> {patientDetails.age}</p>
                    <p><strong>Gender:</strong> {patientDetails.gender}</p>
                    <p><strong>Date of Birth:</strong> {new Date(patientDetails.dob).toLocaleDateString()}</p>
                  </div>

                  <div className="detail-group">
                    <h4>Medical Profile</h4>
                    <p><strong>Blood Type:</strong> {patientDetails.bloodType}</p>
                    <p><strong>Height:</strong> {patientDetails.height} cm</p>
                    <p><strong>Weight:</strong> {patientDetails.weight} kg</p>
                    <p><strong>Smoker Status:</strong> {patientDetails.smokerStatus}</p>
                  </div>

                  <div className="detail-group">
                    <h4>Contact Information</h4>
                    <p><strong>Phone:</strong> {patientDetails.phoneNumber}</p>
                    <p><strong>Email:</strong> {patientDetails.emailID}</p>
                    <p><strong>Address:</strong> {patientDetails.address}</p>
                  </div>

                  <div className="detail-group">
                    <h4>Official Documents</h4>
                    <p><strong>Aadhar Number:</strong> {patientDetails.aadharNumber}</p>
                    <p><strong>Insurance Number:</strong> {patientDetails.insuranceNumber}</p>
                  </div>
                </div>
              )}
            </div>

            {patientDetails && treatmentDetails && (
              <div className="prediction-section">
                <button 
                  onClick={predictBillingAmount}
                  disabled={isPredicting}
                  className="predict-button"
                >
                  {isPredicting ? 'Predicting...' : 'Predict Billing Amount'}
                </button>
                
                {predictedAmount && (
                  <div className="prediction-result">
                    <h4>Predicted Billing Amount:</h4>
                    <p>₹{predictedAmount.toFixed(2)}</p>
                  </div>
                )}
              </div>
            )}

            <div className="detail-item">
              <label>Aadhar Number:</label>
              <p>{selectedClaim.aadharNumber}</p>
            </div>

            <div className="detail-item">
              <label>Insurance Number:</label>
              <p>{selectedClaim.insuranceNumber}</p>
            </div>

            <div className="detail-item">
              <label>Status:</label>
              <p className={`status ${selectedClaim.status.toLowerCase()}`}>
                {selectedClaim.status}
              </p>
            </div>

            <button onClick={closeModal}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;