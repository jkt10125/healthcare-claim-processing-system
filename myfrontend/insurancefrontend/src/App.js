// src/App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [insurances, setInsurances] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    aadharNumber: '',
    startDate: '',
    endDate: '',
    age: '',
    claimLimit: '',
    alreadyClaimed: ''
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchInsurances();
  }, []);

  const generateInsuranceId = () => {
    return 'INS' + Date.now().toString();
  };

  const fetchInsurances = async () => {
    try {
      const response = await axios.get('http://localhost:3003/insurances');
      setInsurances(response.data);
    } catch (error) {
      alert('Error fetching insurances: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      
      if (!editingId) {
        payload.insuranceNumber = generateInsuranceId();
      }

      if (editingId) {
        await axios.put(`http://localhost:3003/insurances/${editingId}`, payload);
      } else {
        await axios.post('http://localhost:3003/insurances', payload);
      }
      
      resetForm();
      fetchInsurances();
    } catch (error) {
      alert('Error saving insurance: ' + error.message);
    }
  };

  const handleEdit = (insurance) => {
    setFormData(insurance);
    setEditingId(insurance.insuranceNumber);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this insurance?')) {
      try {
        await axios.delete(`http://localhost:3003/insurances/${id}`);
        fetchInsurances();
      } catch (error) {
        alert('Error deleting insurance: ' + error.message);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      aadharNumber: '',
      startDate: '',
      endDate: '',
      age: '',
      claimLimit: '',
      alreadyClaimed: ''
    });
    setEditingId(null);
  };

  return (
    <div className="app">
      <h1>Insurance Management</h1>
      
      <form onSubmit={handleSubmit} className="insurance-form">
        <h2>{editingId ? 'Edit Insurance' : 'Create New Insurance'}</h2>

        <div className="form-group">
          <label>Name:</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
        </div>

        <div className="form-group">
          <label>Aadhar Number:</label>
          <input
            type="text"
            value={formData.aadharNumber}
            onChange={(e) => setFormData({...formData, aadharNumber: e.target.value})}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Start Date:</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({...formData, startDate: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>End Date:</label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({...formData, endDate: e.target.value})}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Age:</label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({...formData, age: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>Claim Limit:</label>
            <input
              type="number"
              value={formData.claimLimit}
              onChange={(e) => setFormData({...formData, claimLimit: e.target.value})}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Already Claimed:</label>
          <input
            type="text"
            value={formData.alreadyClaimed}
            onChange={(e) => setFormData({...formData, alreadyClaimed: e.target.value})}
            required
          />
        </div>

        <div className="form-actions">
          <button type="submit">{editingId ? 'Update' : 'Create'}</button>
          {editingId && <button type="button" onClick={resetForm}>Cancel</button>}
        </div>
      </form>

      <div className="insurance-list">
        <h2>Existing Insurances</h2>
        {insurances.length === 0 ? (
          <p>No insurances found</p>
        ) : (
          insurances.map((insurance) => (
            <div key={insurance.insuranceNumber} className="insurance-item">
              <div className="insurance-info">
                <h3>{insurance.name}</h3>
                <p>Insurance ID: {insurance.insuranceNumber}</p>
                <p>Aadhar: {insurance.aadharNumber}</p>
                <p>Dates: {new Date(insurance.startDate).toLocaleDateString()} - {new Date(insurance.endDate).toLocaleDateString()}</p>
              </div>
              <div className="insurance-actions">
                <button onClick={() => handleEdit(insurance)}>Edit</button>
                <button onClick={() => handleDelete(insurance.insuranceNumber)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;