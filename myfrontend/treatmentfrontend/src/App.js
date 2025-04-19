import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [treatmentDetails, setTreatmentDetails] = useState({
    medicalCondition: '',
    hospitalName: '',
    roomNumber: '',
    admissionType: '',
    medication: '',
    patientID: '',
    admissionDate: '',
    releaseDate: '',
    billingAmount: '',
    doctorName: ''
  });

  const [message, setMessage] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [patientExists, setPatientExists] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isFormDisabled, setIsFormDisabled] = useState(true);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTreatmentDetails({
      ...treatmentDetails,
      [name]: value
    });
  };

  // Handle patient ID search
  const handlePatientSearch = async () => {
    if (!treatmentDetails.patientID) {
      setMessage('Please enter a Patient ID');
      setShowPopup(true);
      return;
    }

    setIsSearching(true);
    try {
      const response = await axios.get(`http://localhost:3001/patients/${treatmentDetails.patientID}`);
      setPatientExists(true);
      setIsFormDisabled(false);
    } catch (error) {
      setPatientExists(false);
      setIsFormDisabled(true);
      setMessage('Patient not found. Please check the Patient ID');
      setShowPopup(true);
    } finally {
      setIsSearching(false);
    }
  };

  // Reset form when patient ID changes
  useEffect(() => {
    if (treatmentDetails.patientID === '') {
      setPatientExists(false);
      setIsFormDisabled(true);
    }
  }, [treatmentDetails.patientID]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!patientExists) {
      setMessage('Please verify Patient ID first');
      setShowPopup(true);
      return;
    }

    // Generate unique treatment ID
    const treatmentID = `TREATMENT${Date.now()}`;

    try {
      const response = await axios.post('http://localhost:3001/treatments', {
        ...treatmentDetails,
        treatmentID,
        billingAmount: parseFloat(treatmentDetails.billingAmount)
      });

      setMessage(`Success! Treatment Record Created with ID: ${treatmentID}`);
      setShowPopup(true);
      
      // Reset form
      setTreatmentDetails({
        medicalCondition: '',
        hospitalName: '',
        roomNumber: '',
        admissionType: '',
        medication: '',
        patientID: '',
        admissionDate: '',
        releaseDate: '',
        billingAmount: '',
        doctorName: ''
      });
      setPatientExists(false);
      setIsFormDisabled(true);
    } catch (error) {
      setMessage(`Error: ${error.response?.data || error.message}`);
      setShowPopup(true);
    }
  };

  // Close the popup
  const closePopup = () => {
    setShowPopup(false);
    setMessage('');
  };

  return (
    <div className="app-container">
      <h1 className="app-title">Add Treatment Record</h1>
      <form onSubmit={handleSubmit} className="patient-form">
        <div className="form-row">
          <div className="form-group patient-id-group">
            <label>Patient ID:</label>
            <div className="search-container">
              <input
                type="text"
                name="patientID"
                value={treatmentDetails.patientID}
                onChange={handleInputChange}
                required
                className={patientExists ? 'verified' : ''}
              />
              <button
                type="button"
                onClick={handlePatientSearch}
                className="search-button"
                disabled={isSearching}
              >
                {isSearching ? 'Searching...' : 'Search Patient'}
              </button>
              {patientExists !== null && (
                <span className={`status-indicator ${patientExists ? 'success' : 'error'}`}>
                  {patientExists ? '✓' : patientExists === false ? '✗' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Doctor Name:</label>
            <input
              type="text"
              name="doctorName"
              value={treatmentDetails.doctorName}
              onChange={handleInputChange}
              required
              disabled={isFormDisabled}
            />
          </div>
          <div className="form-group">
            <label>Medical Condition:</label>
            <input
              type="text"
              name="medicalCondition"
              value={treatmentDetails.medicalCondition}
              onChange={handleInputChange}
              required
              disabled={isFormDisabled}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Hospital Name:</label>
            <input
              type="text"
              name="hospitalName"
              value={treatmentDetails.hospitalName}
              onChange={handleInputChange}
              required
              disabled={isFormDisabled}
            />
          </div>
          <div className="form-group">
            <label>Admission Date:</label>
            <input
              type="date"
              name="admissionDate"
              value={treatmentDetails.admissionDate}
              onChange={handleInputChange}
              required
              disabled={isFormDisabled}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Release Date:</label>
            <input
              type="date"
              name="releaseDate"
              value={treatmentDetails.releaseDate}
              onChange={handleInputChange}
              required
              disabled={isFormDisabled}
            />
          </div>
          <div className="form-group">
            <label>Admission Type:</label>
            <select
              name="admissionType"
              value={treatmentDetails.admissionType}
              onChange={handleInputChange}
              required
              disabled={isFormDisabled}
            >
              <option value="">Select Type</option>
              <option value="Emergency">Emergency</option>
              <option value="Elective">Elective</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Room Number:</label>
            <input
              type="text"
              name="roomNumber"
              value={treatmentDetails.roomNumber}
              onChange={handleInputChange}
              disabled={isFormDisabled}
            />
          </div>
          <div className="form-group">
            <label>Medication:</label>
            <input
              type="text"
              name="medication"
              value={treatmentDetails.medication}
              onChange={handleInputChange}
              disabled={isFormDisabled}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Billing Amount:</label>
            <input
              type="number"
              name="billingAmount"
              value={treatmentDetails.billingAmount}
              onChange={handleInputChange}
              step="0.01"
              required
              disabled={isFormDisabled}
            />
          </div>
        </div>

        <button 
          type="submit" 
          className="submit-button"
          disabled={!patientExists}
        >
          Add Treatment Record
        </button>
      </form>

      {/* Popup for displaying messages */}
      {showPopup && (
        <div className="popup-overlay">
          <div className="popup">
            <p className={message.startsWith('Error') ? 'error-message' : 'success-message'}>
              {message}
            </p>
            <button onClick={closePopup} className="close-button">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;