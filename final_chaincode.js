'use strict';

const { Contract } = require('fabric-contract-api');

class ClaimManagementSystemContract extends Contract {

    async createPatientDetails(ctx, patientID, details) {
        details.patientID = patientID;

        const patientDetailsJSON = JSON.stringify(details);

        const collection = "Org1Org2PrivateCollection";
        await ctx.stub.putPrivateData(collection, patientID, Buffer.from(patientDetailsJSON));

        // Store the patient ID in a collection accessible to Org1, Org2, and Org3
        const idCollection = "Org1Org2Org3IDCollection";
        const patientIDData = { patient_id: patientID };
        const patientIDJSON = JSON.stringify(patientIDData);

        await ctx.stub.putPrivateData(idCollection, patientID, Buffer.from(patientIDJSON));
    }

    async createTreatmentDetails(ctx, treatmentID, details) {
        details.treatmentID = treatmentID;

        const treatmentDetailsJSON = JSON.stringify(details);

        const collection = "Org1Org2PrivateCollection";
        await ctx.stub.putPrivateData(collection, treatmentID, Buffer.from(treatmentDetailsJSON));

        // Store the treatment ID in a collection accessible to Org1, Org2, and Org3
        const idCollection = "Org1Org2Org3IDCollection";
        const treatmentIDData = { treatment_id: treatmentID };
        const treatmentIDJSON = JSON.stringify(treatmentIDData);

        await ctx.stub.putPrivateData(idCollection, treatmentID, Buffer.from(treatmentIDJSON));
    }

    async createInsuranceDetails(ctx, insuranceID, details) {
        const insuranceDetailsJSON = JSON.stringify(details);

        const collection = "Org2PrivateCollection";
        await ctx.stub.putPrivateData(collection, insuranceID, Buffer.from(insuranceDetailsJSON));
    }

    async createInsuranceClaimDetails(ctx, claimID, details) {
        details.claimID = claimID;

        const claimDetailsJSON = JSON.stringify(details);

        const collection = "Org1Org2Org3PrivateCollection";
        await ctx.stub.putPrivateData(collection, claimID, Buffer.from(claimDetailsJSON));
    }

    async fetchPatientDetails(ctx, patientID) {
        const collection = "Org1Org2PrivateCollection";
        const patientDetailsJSON = await ctx.stub.getPrivateData(collection, patientID);

        if (!patientDetailsJSON || patientDetailsJSON.length === 0) {
            throw new Error(`Patient details with ID ${patientID} not found`);
        }

        return patientDetailsJSON.toString();
    }

    async fetchTreatmentDetails(ctx, treatmentID) {
        const collection = "Org1Org2PrivateCollection";
        const treatmentDetailsJSON = await ctx.stub.getPrivateData(collection, treatmentID);

        if (!treatmentDetailsJSON || treatmentDetailsJSON.length === 0) {
            throw new Error(`Treatment details with ID ${treatmentID} not found`);
        }

        return treatmentDetailsJSON.toString();
    }

    async isPatientIDPresent(ctx, patientID) {
        const collection = "Org1Org2Org3IDCollection";
        const patientIDJSON = await ctx.stub.getPrivateData(collection, patientID);

        if (!patientIDJSON || patientIDJSON.length === 0) {
            return "no";
        }

        return "yes";
    }

    async isTreatmentIDPresent(ctx, treatmentID) {
        const collection = "Org1Org2Org3IDCollection";
        const treatmentIDJSON = await ctx.stub.getPrivateData(collection, treatmentID);

        if (!treatmentIDJSON || treatmentIDJSON.length === 0) {
            return "no";
        }

        return "yes";
    }
}

module.exports = ClaimManagementSystemContract;
