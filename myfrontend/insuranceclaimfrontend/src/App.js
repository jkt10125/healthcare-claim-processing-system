import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function InsuranceClaimApp() {
  const [claims, setClaims] = useState([]);
  const [formData, setFormData] = useState({
    // claimID: '',
    treatmentID: '',
    patientID: '',
    aadharNumber: '',
    insuranceNumber: '',
    status: 'Pending'
  });
  const [generatedClaimId, setGeneratedClaimId] = useState('');
  const [message, setMessage] = useState('');
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      const response = await axios.get('http://localhost:3002/claims');
      setClaims(response.data);
    } catch (error) {
      showMessage(`Error fetching claims: ${error.message}`);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        // Generate claim ID with timestamp
        const claimID = `CLAIM${Date.now()}`;
        
        await axios.post('http://localhost:3002/claims', {
            ...formData,
            claimID,  // Add generated claim ID to payload
            status: 'Pending'
        });

        showMessage(`Claim submitted successfully! Your Claim ID: ${claimID}`);
        resetForm();
        fetchClaims();
    } catch (error) {
        showMessage(`Error: ${error.response?.data || error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      claimID: '',
      treatmentID: '',
      patientID: '',
      aadharNumber: '',
      insuranceNumber: '',
      status: 'Pending'
    });
  };

  const showMessage = (msg) => {
    setMessage(msg);
    setShowPopup(true);
    // setTimeout(() => setShowPopup(false), 3000);
  };

  return (
    <div className="app-container">
      <h1 className="app-title">Insurance Claim Submission</h1>
      
      <form onSubmit={handleSubmit} className="claim-form">
        <div className="form-row">
          <div className="form-group">
            <label>Status:</label>
            <input
              type="text"
              value="Pending"
              readOnly
              className="status-disabled"
            />
            <small className="status-note">
              All new claims are submitted as Pending
            </small>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Treatment ID:</label>
            <input
              type="text"
              name="treatmentID"
              value={formData.treatmentID}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Patient ID:</label>
            <input
              type="text"
              name="patientID"
              value={formData.patientID}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Aadhar Number:</label>
            <input
              type="text"
              name="aadharNumber"
              value={formData.aadharNumber}
              onChange={handleInputChange}
              required
              pattern="\d{12}"
              title="12-digit Aadhar number"
            />
          </div>
          <div className="form-group">
            <label>Insurance Number:</label>
            <input
              type="text"
              name="insuranceNumber"
              value={formData.insuranceNumber}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-button">
            Submit Claim
          </button>
        </div>
      </form>

      <div className="claims-list">
        <h2>Submitted Claims</h2>
        <table>
          <thead>
            <tr>
              <th>Claim ID</th>
              <th>Status</th>
              <th>Patient ID</th>
              <th>Treatment ID</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => (
              <tr key={claim.claimID}>
                <td>{claim.claimID}</td>
                <td className={`status-${claim.status.toLowerCase()}`}>
                  {claim.status}
                </td>
                <td>{claim.patientID}</td>
                <td>{claim.treatmentID}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPopup && (
        <div className="popup-overlay">
          <div className="popup">
            <p>{message}</p>
            {generatedClaimId && (
              <div className="claim-id-display">
                <strong>Your Claim ID:</strong>
                <div className="claim-id-number">{generatedClaimId}</div>
                <small>Save this ID for future reference</small>
              </div>
            )}
            <button 
              className="ok-button"
              onClick={() => {
                setShowPopup(false);
                setGeneratedClaimId(''); // Clear generated ID if needed
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default InsuranceClaimApp;