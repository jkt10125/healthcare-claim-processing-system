import React, { useState } from 'react';
import axios from 'axios';
import './App.css'; // Import custom CSS

function App() {
  const [patientDetails, setPatientDetails] = useState({
    name: '',
    gender: '',
    bloodType: '',
    height: '',
    weight: '',
    dob: '',
    age: '',
    address: '',
    aadharNumber: '',
    insuranceNumber: '',
    phoneNumber: '',
    emailID: '',
    smokerStatus: '',
  });

  const [message, setMessage] = useState('');
  const [showPopup, setShowPopup] = useState(false); // State to control popup visibility

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPatientDetails({
      ...patientDetails,
      [name]: value,
    });

    // Calculate age if DOB is changed
    if (name === 'dob') {
      const age = calculateAge(value);
      setPatientDetails((prevDetails) => ({
        ...prevDetails,
        age: age.toString(), // Update age in state
      }));
    }
  };

  // Calculate age from DOB
  const calculateAge = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();

    // Adjust age if the birthday hasn't occurred yet this year
    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Generate a unique patient ID
    const patientID = `PATIENT${Date.now()}`;

    // Prepare the payload
    const payload = {
      patientID,
      ...patientDetails,
    };

    try {
      // Send the data to the backend server
      const response = await axios.post('http://localhost:3000/patients', payload);
      setMessage(`Success! Patient ID: ${patientID}`); // Display success message with Patient ID
      setShowPopup(true); // Show the popup
      // Clear the form after successful submission
      setPatientDetails({
        name: '',
        gender: '',
        bloodType: '',
        height: '',
        weight: '',
        dob: '',
        age: '',
        address: '',
        aadharNumber: '',
        insuranceNumber: '',
        phoneNumber: '',
        emailID: '',
        smokerStatus: '',
      });
    } catch (error) {
      setMessage(`Error: ${error.response?.data || error.message}`); // Display error message
      setShowPopup(true); // Show the popup
    }
  };

  // Close the popup
  const closePopup = () => {
    setShowPopup(false);
    setMessage(''); // Clear the message
  };

  return (
    <div className="app-container">
      <h1 className="app-title">Add Patient to Blockchain</h1>
      <form onSubmit={handleSubmit} className="patient-form">
        <div className="form-group">
          <label>Name:</label>
          <input
            type="text"
            name="name"
            value={patientDetails.name}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Gender:</label>
            <select
              name="gender"
              value={patientDetails.gender}
              onChange={handleInputChange}
              required
            >
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Blood Type:</label>
            <input
              type="text"
              name="bloodType"
              value={patientDetails.bloodType}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Smoker Status:</label>
            <select
              name="smokerStatus"
              value={patientDetails.smokerStatus}
              onChange={handleInputChange}
              required
            >
              <option value="">Select</option>
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Date of Birth:</label>
            <input
              type="date"
              name="dob"
              value={patientDetails.dob}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Age:</label>
            <input
              type="number"
              name="age"
              value={patientDetails.age}
              readOnly // Age is calculated automatically
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Height (cm):</label>
            <input
              type="number"
              name="height"
              value={patientDetails.height}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Weight (kg):</label>
            <input
              type="number"
              name="weight"
              value={patientDetails.weight}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Address:</label>
          <input
            type="text"
            name="address"
            value={patientDetails.address}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Aadhar Number:</label>
          <input
            type="text"
            name="aadharNumber"
            value={patientDetails.aadharNumber}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Insurance Number:</label>
          <input
            type="text"
            name="insuranceNumber"
            value={patientDetails.insuranceNumber}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Phone Number:</label>
          <input
            type="text"
            name="phoneNumber"
            value={patientDetails.phoneNumber}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Email ID:</label>
          <input
            type="email"
            name="emailID"
            value={patientDetails.emailID}
            onChange={handleInputChange}
            required
          />
        </div>

        <button type="submit" className="submit-button">Add Patient</button>
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