package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// Insurance represents the structure of an insurance record
type Insurance struct {
	Name            string  `json:"name"`
	AadharNumber    string  `json:"aadharNumber"`
	StartDate       string  `json:"startDate"`
	EndDate         string  `json:"endDate"`
	Age             int     `json:"age"`
	InsuranceNumber string  `json:"insuranceNumber"` // Unique key (also used as the ledger key)
	ClaimLimit      float64 `json:"claimLimit"`
	AlreadyClaimed  float64 `json:"alreadyClaimed"`
}

// InsuranceContract provides functions for managing insurance records
type InsuranceContract struct {
	contractapi.Contract
}

// InitLedger initializes the ledger with sample insurance data (optional)
func (s *InsuranceContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	insurances := []Insurance{
		{
			Name:            "John Doe",
			AadharNumber:    "123456789012",
			StartDate:       "2023-01-01",
			EndDate:         "2024-01-01",
			Age:             35,
			InsuranceNumber: "INS123456",
			ClaimLimit:      100000.00,
			AlreadyClaimed:  25000.00,
		},
		{
			Name:            "Jane Smith",
			AadharNumber:    "987654321098",
			StartDate:       "2023-02-15",
			EndDate:         "2024-02-15",
			Age:             28,
			InsuranceNumber: "INS654321",
			ClaimLimit:      150000.00,
			AlreadyClaimed:  50000.00,
		},
	}

	for _, insurance := range insurances {
		insuranceJSON, err := json.Marshal(insurance)
		if err != nil {
			return err
		}
		err = ctx.GetStub().PutState(insurance.InsuranceNumber, insuranceJSON)
		if err != nil {
			return fmt.Errorf("failed to put insurance record: %v", err)
		}
	}

	return nil
}

// CreateInsurance adds a new insurance record to the ledger
func (s *InsuranceContract) CreateInsurance(
	ctx contractapi.TransactionContextInterface,
	insuranceNumber string,
	name string,
	aadharNumber string,
	startDate string,
	endDate string,
	age int,
	claimLimit float64,
	alreadyClaimed float64,
) error {
	exists, err := s.InsuranceExists(ctx, insuranceNumber)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("insurance with number %s already exists", insuranceNumber)
	}

	insurance := Insurance{
		Name:            name,
		AadharNumber:    aadharNumber,
		StartDate:       startDate,
		EndDate:         endDate,
		Age:             age,
		InsuranceNumber: insuranceNumber,
		ClaimLimit:      claimLimit,
		AlreadyClaimed:  alreadyClaimed,
	}

	insuranceJSON, err := json.Marshal(insurance)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(insuranceNumber, insuranceJSON)
}

// ReadInsurance retrieves an insurance record by insuranceNumber
func (s *InsuranceContract) ReadInsurance(ctx contractapi.TransactionContextInterface, insuranceNumber string) (*Insurance, error) {
	insuranceJSON, err := ctx.GetStub().GetState(insuranceNumber)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if insuranceJSON == nil {
		return nil, fmt.Errorf("insurance with number %s does not exist", insuranceNumber)
	}

	var insurance Insurance
	err = json.Unmarshal(insuranceJSON, &insurance)
	if err != nil {
		return nil, err
	}

	return &insurance, nil
}

// UpdateInsurance updates an existing insurance record
func (s *InsuranceContract) UpdateInsurance(
	ctx contractapi.TransactionContextInterface,
	insuranceNumber string,
	name string,
	aadharNumber string,
	startDate string,
	endDate string,
	age int,
	claimLimit float64,
	alreadyClaimed float64,
) error {
	exists, err := s.InsuranceExists(ctx, insuranceNumber)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("insurance with number %s does not exist", insuranceNumber)
	}

	insurance := Insurance{
		Name:            name,
		AadharNumber:    aadharNumber,
		StartDate:       startDate,
		EndDate:         endDate,
		Age:             age,
		InsuranceNumber: insuranceNumber,
		ClaimLimit:      claimLimit,
		AlreadyClaimed:  alreadyClaimed,
	}

	insuranceJSON, err := json.Marshal(insurance)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(insuranceNumber, insuranceJSON)
}

// DeleteInsurance deletes an insurance record
func (s *InsuranceContract) DeleteInsurance(ctx contractapi.TransactionContextInterface, insuranceNumber string) error {
	exists, err := s.InsuranceExists(ctx, insuranceNumber)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("insurance with number %s does not exist", insuranceNumber)
	}

	return ctx.GetStub().DelState(insuranceNumber)
}

// InsuranceExists checks if an insurance record exists
func (s *InsuranceContract) InsuranceExists(ctx contractapi.TransactionContextInterface, insuranceNumber string) (bool, error) {
	insuranceJSON, err := ctx.GetStub().GetState(insuranceNumber)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}
	return insuranceJSON != nil, nil
}

// GetAllInsurances returns all insurance records
func (s *InsuranceContract) GetAllInsurances(ctx contractapi.TransactionContextInterface) ([]*Insurance, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var insurances []*Insurance
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var insurance Insurance
		err = json.Unmarshal(queryResponse.Value, &insurance)
		if err != nil {
			return nil, err
		}
		insurances = append(insurances, &insurance)
	}

	return insurances, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(new(InsuranceContract))
	if err != nil {
		fmt.Printf("Error creating insurance chaincode: %v\n", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting insurance chaincode: %v\n", err)
	}
}