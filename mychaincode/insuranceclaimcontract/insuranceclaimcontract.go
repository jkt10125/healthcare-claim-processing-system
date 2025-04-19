package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// InsuranceClaim represents the structure of an insurance claim record
type InsuranceClaim struct {
	ClaimID         string `json:"claimID"`
	TreatmentID     string `json:"treatmentID"`
	PatientID       string `json:"patientID"`
	AadharNumber    string `json:"aadharNumber"`
	InsuranceNumber string `json:"insuranceNumber"`
	Status          string `json:"status"` // e.g., Pending, Approved, Rejected
}

// InsuranceClaimContract provides functions for managing insurance claims
type InsuranceClaimContract struct {
	contractapi.Contract
}

// InitLedger initializes the ledger with some sample data (optional)
func (s *InsuranceClaimContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	claims := []InsuranceClaim{
		{
			ClaimID:         "CLAIM1",
			TreatmentID:     "TREATMENT1",
			PatientID:       "PATIENT1",
			AadharNumber:    "123456789012",
			InsuranceNumber: "INS123456",
			Status:          "Pending",
		},
		{
			ClaimID:         "CLAIM2",
			TreatmentID:     "TREATMENT2",
			PatientID:       "PATIENT2",
			AadharNumber:    "987654321098",
			InsuranceNumber: "INS654321",
			Status:          "Approved",
		},
	}

	for _, claim := range claims {
		claimJSON, err := json.Marshal(claim)
		if err != nil {
			return err
		}
		err = ctx.GetStub().PutState(claim.ClaimID, claimJSON)
		if err != nil {
			return fmt.Errorf("failed to put claim record: %v", err)
		}
	}

	return nil
}

// CreateClaim adds a new insurance claim to the ledger
func (s *InsuranceClaimContract) CreateClaim(
	ctx contractapi.TransactionContextInterface,
	claimID string,
	treatmentID string,
	patientID string,
	aadharNumber string,
	insuranceNumber string,
	status string,
) error {
	exists, err := s.ClaimExists(ctx, claimID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("claim with ID %s already exists", claimID)
	}

	claim := InsuranceClaim{
		ClaimID:         claimID,
		TreatmentID:     treatmentID,
		PatientID:       patientID,
		AadharNumber:    aadharNumber,
		InsuranceNumber: insuranceNumber,
		Status:          status,
	}

	claimJSON, err := json.Marshal(claim)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(claimID, claimJSON)
}

// ReadClaim retrieves an insurance claim by claimID
func (s *InsuranceClaimContract) ReadClaim(ctx contractapi.TransactionContextInterface, claimID string) (*InsuranceClaim, error) {
	claimJSON, err := ctx.GetStub().GetState(claimID)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if claimJSON == nil {
		return nil, fmt.Errorf("claim with ID %s does not exist", claimID)
	}

	var claim InsuranceClaim
	err = json.Unmarshal(claimJSON, &claim)
	if err != nil {
		return nil, err
	}

	return &claim, nil
}

// UpdateClaim updates an existing insurance claim
func (s *InsuranceClaimContract) UpdateClaim(
	ctx contractapi.TransactionContextInterface,
	claimID string,
	treatmentID string,
	patientID string,
	aadharNumber string,
	insuranceNumber string,
	status string,
) error {
	exists, err := s.ClaimExists(ctx, claimID)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("claim with ID %s does not exist", claimID)
	}

	claim := InsuranceClaim{
		ClaimID:         claimID,
		TreatmentID:     treatmentID,
		PatientID:       patientID,
		AadharNumber:    aadharNumber,
		InsuranceNumber: insuranceNumber,
		Status:          status,
	}

	claimJSON, err := json.Marshal(claim)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(claimID, claimJSON)
}

// DeleteClaim deletes an insurance claim
func (s *InsuranceClaimContract) DeleteClaim(ctx contractapi.TransactionContextInterface, claimID string) error {
	exists, err := s.ClaimExists(ctx, claimID)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("claim with ID %s does not exist", claimID)
	}

	return ctx.GetStub().DelState(claimID)
}

// ClaimExists checks if an insurance claim exists
func (s *InsuranceClaimContract) ClaimExists(ctx contractapi.TransactionContextInterface, claimID string) (bool, error) {
	claimJSON, err := ctx.GetStub().GetState(claimID)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}
	return claimJSON != nil, nil
}

// GetAllClaims returns all insurance claims
func (s *InsuranceClaimContract) GetAllClaims(ctx contractapi.TransactionContextInterface) ([]*InsuranceClaim, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var claims []*InsuranceClaim
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var claim InsuranceClaim
		err = json.Unmarshal(queryResponse.Value, &claim)
		if err != nil {
			return nil, err
		}
		claims = append(claims, &claim)
	}

	return claims, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(new(InsuranceClaimContract))
	if err != nil {
		fmt.Printf("Error creating insurance claim chaincode: %v\n", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting insurance claim chaincode: %v\n", err)
	}
}