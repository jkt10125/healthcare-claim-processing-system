package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// Treatment represents the structure of a treatment record
type Treatment struct {
	MedicalCondition string  `json:"medicalCondition"`
	HospitalName     string  `json:"hospitalName"`
	RoomNumber       string  `json:"roomNumber"`
	AdmissionType    string  `json:"admissionType"`
	Medication       string  `json:"medication"`
	PatientID        string  `json:"patientID"`
	AdmissionDate    string  `json:"admissionDate"`
	ReleaseDate      string  `json:"releaseDate"`
	BillingAmount    float64 `json:"billingAmount"`
	DoctorName       string  `json:"doctorName"`
}

// TreatmentContract provides functions for managing treatment records
type TreatmentContract struct {
	contractapi.Contract
}

// InitLedger initializes the ledger with some sample data (optional)
func (s *TreatmentContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	treatments := []Treatment{
		{
			MedicalCondition: "Fever",
			HospitalName:     "City Hospital",
			RoomNumber:       "101",
			AdmissionType:    "Emergency",
			Medication:       "Paracetamol",
			PatientID:        "PATIENT1",
			AdmissionDate:    "2023-10-01",
			ReleaseDate:      "2023-10-05",
			BillingAmount:    500.50,
			DoctorName:       "Dr. Smith",
		},
		{
			MedicalCondition: "Fracture",
			HospitalName:     "General Hospital",
			RoomNumber:       "202",
			AdmissionType:    "Inpatient",
			Medication:       "Painkillers",
			PatientID:        "PATIENT2",
			AdmissionDate:    "2023-09-15",
			ReleaseDate:      "2023-09-25",
			BillingAmount:    1200.75,
			DoctorName:       "Dr. Johnson",
		},
	}

	for i, treatment := range treatments {
		treatmentID := fmt.Sprintf("TREATMENT%d", i+1)
		treatmentJSON, err := json.Marshal(treatment)
		if err != nil {
			return err
		}
		err = ctx.GetStub().PutState(treatmentID, treatmentJSON)
		if err != nil {
			return fmt.Errorf("failed to put to world state: %v", err)
		}
	}

	return nil
}

// CreateTreatment adds a new treatment record to the ledger
func (s *TreatmentContract) CreateTreatment(
	ctx contractapi.TransactionContextInterface,
	treatmentID string,
	medicalCondition string,
	hospitalName string,
	roomNumber string,
	admissionType string,
	medication string,
	patientID string,
	admissionDate string,
	releaseDate string,
	billingAmount float64,
	doctorName string,
) error {
	exists, err := s.TreatmentExists(ctx, treatmentID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("treatment with ID %s already exists", treatmentID)
	}

	treatment := Treatment{
		MedicalCondition: medicalCondition,
		HospitalName:     hospitalName,
		RoomNumber:       roomNumber,
		AdmissionType:    admissionType,
		Medication:       medication,
		PatientID:        patientID,
		AdmissionDate:    admissionDate,
		ReleaseDate:      releaseDate,
		BillingAmount:    billingAmount,
		DoctorName:       doctorName,
	}

	treatmentJSON, err := json.Marshal(treatment)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(treatmentID, treatmentJSON)
}

// ReadTreatment retrieves a treatment record from the ledger using treatmentID
func (s *TreatmentContract) ReadTreatment(ctx contractapi.TransactionContextInterface, treatmentID string) (*Treatment, error) {
	treatmentJSON, err := ctx.GetStub().GetState(treatmentID)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if treatmentJSON == nil {
		return nil, fmt.Errorf("treatment with ID %s does not exist", treatmentID)
	}

	var treatment Treatment
	err = json.Unmarshal(treatmentJSON, &treatment)
	if err != nil {
		return nil, err
	}

	return &treatment, nil
}

// UpdateTreatment updates an existing treatment record in the ledger
func (s *TreatmentContract) UpdateTreatment(
	ctx contractapi.TransactionContextInterface,
	treatmentID string,
	medicalCondition string,
	hospitalName string,
	roomNumber string,
	admissionType string,
	medication string,
	patientID string,
	admissionDate string,
	releaseDate string,
	billingAmount float64,
	doctorName string,
) error {
	exists, err := s.TreatmentExists(ctx, treatmentID)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("treatment with ID %s does not exist", treatmentID)
	}

	treatment := Treatment{
		MedicalCondition: medicalCondition,
		HospitalName:     hospitalName,
		RoomNumber:       roomNumber,
		AdmissionType:    admissionType,
		Medication:       medication,
		PatientID:        patientID,
		AdmissionDate:    admissionDate,
		ReleaseDate:      releaseDate,
		BillingAmount:    billingAmount,
		DoctorName:       doctorName,
	}

	treatmentJSON, err := json.Marshal(treatment)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(treatmentID, treatmentJSON)
}

// DeleteTreatment deletes a treatment record from the ledger
func (s *TreatmentContract) DeleteTreatment(ctx contractapi.TransactionContextInterface, treatmentID string) error {
	exists, err := s.TreatmentExists(ctx, treatmentID)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("treatment with ID %s does not exist", treatmentID)
	}

	return ctx.GetStub().DelState(treatmentID)
}

// TreatmentExists checks if a treatment record exists in the ledger
func (s *TreatmentContract) TreatmentExists(ctx contractapi.TransactionContextInterface, treatmentID string) (bool, error) {
	treatmentJSON, err := ctx.GetStub().GetState(treatmentID)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return treatmentJSON != nil, nil
}

// GetAllTreatments returns all treatment records in the ledger
func (s *TreatmentContract) GetAllTreatments(ctx contractapi.TransactionContextInterface) ([]*Treatment, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var treatments []*Treatment
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var treatment Treatment
		err = json.Unmarshal(queryResponse.Value, &treatment)
		if err != nil {
			return nil, err
		}
		treatments = append(treatments, &treatment)
	}

	return treatments, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(new(TreatmentContract))
	if err != nil {
		fmt.Printf("Error creating treatment chaincode: %v\n", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting treatment chaincode: %v\n", err)
	}
}