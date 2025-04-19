/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as grpc from '@grpc/grpc-js';
import { connect, Contract, hash, Identity, Signer, signers } from '@hyperledger/fabric-gateway';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { TextDecoder } from 'util';
import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

const channelName = envOrDefault('CHANNEL_NAME', 'mychannel');
const chaincodeName = envOrDefault('CHAINCODE_NAME', 'insurancecc');
const mspId = envOrDefault('MSP_ID', 'Org3MSP');
const cryptoPath = envOrDefault('CRYPTO_PATH', path.resolve(__dirname, '..', '..', '..', 'organizations', 'peerOrganizations', 'org3.example.com'));
const keyDirectoryPath = envOrDefault('KEY_DIRECTORY_PATH', path.resolve(cryptoPath, 'users', 'User1@org3.example.com', 'msp', 'keystore'));
const certDirectoryPath = envOrDefault('CERT_DIRECTORY_PATH', path.resolve(cryptoPath, 'users', 'User1@org3.example.com', 'msp', 'signcerts'));
const tlsCertPath = envOrDefault('TLS_CERT_PATH', path.resolve(cryptoPath, 'peers', 'peer0.org3.example.com', 'tls', 'ca.crt'));
const peerEndpoint = envOrDefault('PEER_ENDPOINT', 'localhost:11051');
const peerHostAlias = envOrDefault('PEER_HOST_ALIAS', 'peer0.org3.example.com');

const utf8Decoder = new TextDecoder();
const app = express();
const port = 3003;
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

async function getGatewayClient() {
    const client = await newGrpcConnection();
    return connect({
        client,
        identity: await newIdentity(),
        signer: await newSigner(),
        hash: hash.sha256,
        evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
        endorseOptions: () => ({ deadline: Date.now() + 15000 }),
        submitOptions: () => ({ deadline: Date.now() + 5000 }),
        commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
    });
}

async function newGrpcConnection(): Promise<grpc.Client> {
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': peerHostAlias,
    });
}

async function newIdentity(): Promise<Identity> {
    const certPath = await getFirstDirFileName(certDirectoryPath);
    const credentials = await fs.readFile(certPath);
    return { mspId, credentials };
}

async function getFirstDirFileName(dirPath: string): Promise<string> {
    const files = await fs.readdir(dirPath);
    return path.join(dirPath, files[0]);
}

async function newSigner(): Promise<Signer> {
    const keyPath = await getFirstDirFileName(keyDirectoryPath);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

// Insurance Contract Functions
async function createInsurance(contract: Contract, insuranceDetails: any): Promise<void> {
    await contract.submitTransaction(
        'CreateInsurance',
        insuranceDetails.insuranceNumber,
        insuranceDetails.name,
        insuranceDetails.aadharNumber,
        insuranceDetails.startDate,
        insuranceDetails.endDate,
        insuranceDetails.age.toString(),
        insuranceDetails.claimLimit.toString(),
        insuranceDetails.alreadyClaimed.toString()
    );
}

async function readInsurance(contract: Contract, insuranceNumber: string): Promise<any> {
    const resultBytes = await contract.evaluateTransaction('ReadInsurance', insuranceNumber);
    return JSON.parse(utf8Decoder.decode(resultBytes));
}

async function updateInsurance(contract: Contract, insuranceDetails: any): Promise<void> {
    await contract.submitTransaction(
        'UpdateInsurance',
        insuranceDetails.insuranceNumber,
        insuranceDetails.name,
        insuranceDetails.aadharNumber,
        insuranceDetails.startDate,
        insuranceDetails.endDate,
        insuranceDetails.age.toString(),
        insuranceDetails.claimLimit.toString(),
        insuranceDetails.alreadyClaimed.toString()
    );
}

async function deleteInsurance(contract: Contract, insuranceNumber: string): Promise<void> {
    await contract.submitTransaction('DeleteInsurance', insuranceNumber);
}

async function getAllInsurances(contract: Contract): Promise<any> {
    const resultBytes = await contract.evaluateTransaction('GetAllInsurances');
    return JSON.parse(utf8Decoder.decode(resultBytes));
}

// Express Routes
app.post('/insurances', async (req: Request, res: Response) => {
    try {
        const gateway = await getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        
        await createInsurance(contract, req.body);
        res.status(201).send('Insurance record created successfully');
    } catch (error) {
        res.status(500).send(`Error creating insurance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});

app.get('/insurances/:id', async (req: Request, res: Response) => {
    try {
        const gateway = await getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        
        const insurance = await readInsurance(contract, req.params.id);
        res.status(200).json(insurance);
    } catch (error) {
        res.status(500).send(`Error fetching insurance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});

app.put('/insurances/:id', async (req: Request, res: Response) => {
    try {
        const gateway = await getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        
        await updateInsurance(contract, { insuranceNumber: req.params.id, ...req.body });
        res.status(200).send('Insurance updated successfully');
    } catch (error) {
        res.status(500).send(`Error updating insurance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});

// Update the claim status of an insurance
app.put('/claims/:id', async (req: Request, res: Response) => {
    try {
        const gateway = await getGatewayClient();
        const network = gateway.getNetwork(channelName);

        // Switch to insurance claim chaincode
        const insuranceClaimContract = network.getContract('insuranceclaimcc');

        const claim = await insuranceClaimContract.evaluateTransaction('ReadClaim', req.params.id);
        const claimData = JSON.parse(utf8Decoder.decode(claim));

        // Update the claim status
        claimData.status = req.body.status;
        await insuranceClaimContract.submitTransaction(
            'UpdateClaim',
            claimData.claimId,
            claimData.treatmentId,
            claimData.patientId,
            claimData.aadharNumber,
            claimData.insuranceNumber,
            claimData.status,
        );
        
        res.status(200).send('Claim Status updated successfully');
    } catch (error) {
        res.status(500).send(`Error updating claim status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});

app.delete('/insurances/:id', async (req: Request, res: Response) => {
    try {
        const gateway = await getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        
        await deleteInsurance(contract, req.params.id);
        res.status(200).send('Insurance deleted successfully');
    } catch (error) {
        res.status(500).send(`Error deleting insurance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});

app.get('/insurances', async (req: Request, res: Response) => {
    try {
        const gateway = await getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        
        const insurances = await getAllInsurances(contract);
        res.status(200).json(insurances);
    } catch (error) {
        res.status(500).send(`Error fetching insurances: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});

function envOrDefault(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
}

app.listen(port, () => {
    console.log(`Insurance backend running on port ${port}`);
});