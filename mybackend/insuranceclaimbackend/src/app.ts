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
const chaincodeName = envOrDefault('CHAINCODE_NAME', 'insuranceclaimcc');
const mspId = envOrDefault('MSP_ID', 'Org2MSP');
const cryptoPath = envOrDefault('CRYPTO_PATH', path.resolve(__dirname, '..', '..', '..', 'organizations', 'peerOrganizations', 'org2.example.com'));
const keyDirectoryPath = envOrDefault('KEY_DIRECTORY_PATH', path.resolve(cryptoPath, 'users', 'User1@org2.example.com', 'msp', 'keystore'));
const certDirectoryPath = envOrDefault('CERT_DIRECTORY_PATH', path.resolve(cryptoPath, 'users', 'User1@org2.example.com', 'msp', 'signcerts'));
const tlsCertPath = envOrDefault('TLS_CERT_PATH', path.resolve(cryptoPath, 'peers', 'peer0.org2.example.com', 'tls', 'ca.crt'));
const peerEndpoint = envOrDefault('PEER_ENDPOINT', 'localhost:9051');
const peerHostAlias = envOrDefault('PEER_HOST_ALIAS', 'peer0.org2.example.com');

const utf8Decoder = new TextDecoder();
const app = express();
const port = 3002; // Different port from other backends
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

// Insurance Claim Functions
async function createClaim(contract: Contract, claimDetails: any): Promise<void> {
    await contract.submitTransaction(
        'CreateClaim',
        claimDetails.claimID,
        claimDetails.treatmentID,
        claimDetails.patientID,
        claimDetails.aadharNumber,
        claimDetails.insuranceNumber,
        claimDetails.status
    );
}

async function readClaim(contract: Contract, claimID: string): Promise<any> {
    const resultBytes = await contract.evaluateTransaction('ReadClaim', claimID);
    return JSON.parse(utf8Decoder.decode(resultBytes));
}

async function updateClaim(contract: Contract, claimDetails: any): Promise<void> {
    await contract.submitTransaction(
        'UpdateClaim',
        claimDetails.claimID,
        claimDetails.treatmentID,
        claimDetails.patientID,
        claimDetails.aadharNumber,
        claimDetails.insuranceNumber,
        claimDetails.status
    );
}

async function deleteClaim(contract: Contract, claimID: string): Promise<void> {
    await contract.submitTransaction('DeleteClaim', claimID);
}

async function getAllClaims(contract: Contract): Promise<any> {
    const resultBytes = await contract.evaluateTransaction('GetAllClaims');
    return JSON.parse(utf8Decoder.decode(resultBytes));
}

// Express Routes
app.post('/claims', async (req: Request, res: Response) => {
    try {
        const gateway = await getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        
        await createClaim(contract, req.body);
        res.status(201).send('Insurance claim created successfully');
    } catch (error) {
        res.status(500).send(`Error creating claim: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});

app.get('/claims/:id', async (req: Request, res: Response) => {
    try {
        const gateway = await getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        
        const claim = await readClaim(contract, req.params.id);
        res.status(200).json(claim);
    } catch (error) {
        res.status(500).send(`Error fetching claim: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});

app.put('/claims/:id', async (req: Request, res: Response) => {
    try {
        const gateway = await getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        
        await updateClaim(contract, { claimID: req.params.id, ...req.body });
        res.status(200).send('Claim updated successfully');
    } catch (error) {
        res.status(500).send(`Error updating claim: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});

app.delete('/claims/:id', async (req: Request, res: Response) => {
    try {
        const gateway = await getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        
        await deleteClaim(contract, req.params.id);
        res.status(200).send('Claim deleted successfully');
    } catch (error) {
        res.status(500).send(`Error deleting claim: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});

app.get('/claims', async (req: Request, res: Response) => {
    try {
        const gateway = await getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        
        const claims = await getAllClaims(contract);
        res.status(200).json(claims);
    } catch (error) {
        res.status(500).send(`Error fetching claims: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});

function envOrDefault(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
}

app.listen(port, () => {
    console.log(`Insurance Claim backend running on port ${port}`);
});