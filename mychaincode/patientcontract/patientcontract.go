package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// Patient represents the structure of a patient record
type Patient struct {
	Name           string `json:"name"`
	Age            int    `json:"age"`
	Gender         string `json:"gender"`
	BloodType      string `json:"bloodType"`
	Height         int    `json:"height"`
	Weight         int    `json:"weight"`
	Address        string `json:"address"`
	DOB            string `json:"dob"`
	AadharNumber   string `json:"aadharNumber"`
	InsuranceNumber string `json:"insuranceNumber"`
	PhoneNumber    string `json:"phoneNumber"`
	EmailID        string `json:"emailID"`
	SmokerStatus   string   `json:"smokerStatus"`
}

// PatientContract provides functions for managing patients
type PatientContract struct {
	contractapi.Contract
}

// InitLedger initializes the ledger with some sample data (optional)
func (s *PatientContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	patients := []Patient{
		{
			Name:           "John Doe",
			Age:            30,
			Gender:         "Male",
			BloodType:      "O+",
			Height:         180,
			Weight:         75,
			Address:        "123 Main St",
			DOB:            "1990-01-01",
			AadharNumber:   "123456789012",
			InsuranceNumber: "INS123456",
			PhoneNumber:    "1234567890",
			EmailID:        "john.doe@example.com",
			SmokerStatus:	"1",
		},
		{
			Name:           "Jane Doe",
			Age:            25,
			Gender:         "Female",
			BloodType:      "A+",
			Height:         165,
			Weight:         60,
			Address:        "456 Elm St",
			DOB:            "1995-05-05",
			AadharNumber:   "987654321098",
			InsuranceNumber: "INS654321",
			PhoneNumber:    "0987654321",
			EmailID:        "jane.doe@example.com",
			SmokerStatus:	"0",
		},
	}

	for i, patient := range patients {
		patientID := fmt.Sprintf("PATIENT%d", i+1)
		patientJSON, err := json.Marshal(patient)
		if err != nil {
			return err
		}
		err = ctx.GetStub().PutState(patientID, patientJSON)
		if err != nil {
			return fmt.Errorf("failed to put to world state: %v", err)
		}
	}

	return nil
}

// CreatePatient adds a new patient to the ledger
func (s *PatientContract) CreatePatient(
	ctx contractapi.TransactionContextInterface,
	patientID string,
	name string,
	age int,
	gender string,
	bloodType string,
	height int,
	weight int,
	address string,
	dob string,
	aadharNumber string,
	insuranceNumber string,
	phoneNumber string,
	emailID string,
	smokerStatus string,
) error {
	exists, err := s.PatientExists(ctx, patientID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("patient with ID %s already exists", patientID)
	}

	patient := Patient{
		Name:           name,
		Age:            age,
		Gender:         gender,
		BloodType:      bloodType,
		Height:         height,
		Weight:         weight,
		Address:        address,
		DOB:            dob,
		AadharNumber:   aadharNumber,
		InsuranceNumber: insuranceNumber,
		PhoneNumber:    phoneNumber,
		EmailID:        emailID,
		SmokerStatus: 	smokerStatus,
	}

	patientJSON, err := json.Marshal(patient)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(patientID, patientJSON)
}

// ReadPatient retrieves a patient from the ledger using patientID
func (s *PatientContract) ReadPatient(ctx contractapi.TransactionContextInterface, patientID string) (*Patient, error) {
	patientJSON, err := ctx.GetStub().GetState(patientID)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if patientJSON == nil {
		return nil, fmt.Errorf("patient with ID %s does not exist", patientID)
	}

	var patient Patient
	err = json.Unmarshal(patientJSON, &patient)
	if err != nil {
		return nil, err
	}

	return &patient, nil
}

// UpdatePatient updates an existing patient in the ledger
func (s *PatientContract) UpdatePatient(
	ctx contractapi.TransactionContextInterface,
	patientID string,
	name string,
	age int,
	gender string,
	bloodType string,
	height int,
	weight int,
	address string,
	dob string,
	aadharNumber string,
	insuranceNumber string,
	phoneNumber string,
	emailID string,
	smokerStatus string,
) error {
	exists, err := s.PatientExists(ctx, patientID)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("patient with ID %s does not exist", patientID)
	}

	patient := Patient{
		Name:           name,
		Age:            age,
		Gender:         gender,
		BloodType:      bloodType,
		Height:         height,
		Weight:         weight,
		Address:        address,
		DOB:            dob,
		AadharNumber:   aadharNumber,
		InsuranceNumber: insuranceNumber,
		PhoneNumber:    phoneNumber,
		EmailID:        emailID,
		SmokerStatus: 	smokerStatus,
	}

	patientJSON, err := json.Marshal(patient)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(patientID, patientJSON)
}

// DeletePatient deletes a patient from the ledger
func (s *PatientContract) DeletePatient(ctx contractapi.TransactionContextInterface, patientID string) error {
	exists, err := s.PatientExists(ctx, patientID)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("patient with ID %s does not exist", patientID)
	}

	return ctx.GetStub().DelState(patientID)
}

// PatientExists checks if a patient exists in the ledger
func (s *PatientContract) PatientExists(ctx contractapi.TransactionContextInterface, patientID string) (bool, error) {
	patientJSON, err := ctx.GetStub().GetState(patientID)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return patientJSON != nil, nil
}

// GetAllPatients returns all patients in the ledger
func (s *PatientContract) GetAllPatients(ctx contractapi.TransactionContextInterface) ([]*Patient, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var patients []*Patient
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var patient Patient
		err = json.Unmarshal(queryResponse.Value, &patient)
		if err != nil {
			return nil, err
		}
		patients = append(patients, &patient)
	}

	return patients, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(new(PatientContract))
	if err != nil {
		fmt.Printf("Error creating patient chaincode: %v\n", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting patient chaincode: %v\n", err)
	}
}