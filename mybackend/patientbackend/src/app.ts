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
const chaincodeName = envOrDefault('CHAINCODE_NAME', 'patientcc');
const mspId = envOrDefault('MSP_ID', 'Org1MSP');

// Path to crypto materials.
const cryptoPath = envOrDefault('CRYPTO_PATH', path.resolve(__dirname, '..', '..', '..', 'organizations', 'peerOrganizations', 'org1.example.com'));

// Path to user private key directory.
const keyDirectoryPath = envOrDefault('KEY_DIRECTORY_PATH', path.resolve(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'keystore'));

// Path to user certificate directory.
const certDirectoryPath = envOrDefault('CERT_DIRECTORY_PATH', path.resolve(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'signcerts'));

// Path to peer tls certificate.
const tlsCertPath = envOrDefault('TLS_CERT_PATH', path.resolve(cryptoPath, 'peers', 'peer0.org1.example.com', 'tls', 'ca.crt'));

// Gateway peer endpoint.
const peerEndpoint = envOrDefault('PEER_ENDPOINT', 'localhost:7051');

// Gateway peer SSL host name override.
const peerHostAlias = envOrDefault('PEER_HOST_ALIAS', 'peer0.org1.example.com');

const utf8Decoder = new TextDecoder();
// const assetId = `asset${String(Date.now())}`;

// Express server setup
const app = express();
const port = 3000;
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
        // Default timeouts for different gRPC calls
        evaluateOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        endorseOptions: () => {
            return { deadline: Date.now() + 15000 }; // 15 seconds
        },
        submitOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        commitStatusOptions: () => {
            return { deadline: Date.now() + 60000 }; // 1 minute
        },
    });
}

// async function main(): Promise<void> {
//     displayInputParameters();

//     // The gRPC client connection should be shared by all Gateway connections to this endpoint.
//     const client = await newGrpcConnection();

//     const gateway = connect({
//         client,
//         identity: await newIdentity(),
//         signer: await newSigner(),
//         hash: hash.sha256,
//         // Default timeouts for different gRPC calls
//         evaluateOptions: () => {
//             return { deadline: Date.now() + 5000 }; // 5 seconds
//         },
//         endorseOptions: () => {
//             return { deadline: Date.now() + 15000 }; // 15 seconds
//         },
//         submitOptions: () => {
//             return { deadline: Date.now() + 5000 }; // 5 seconds
//         },
//         commitStatusOptions: () => {
//             return { deadline: Date.now() + 60000 }; // 1 minute
//         },
//     });

//     try {
//         // Get a network instance representing the channel where the smart contract is deployed.
//         const network = gateway.getNetwork(channelName);

//         // Get the smart contract from the network.
//         const contract = network.getContract(chaincodeName);

//         // Initialize a set of asset data on the ledger using the chaincode 'InitLedger' function.
//         await initLedger(contract);

//         // Return all the current assets on the ledger.
//         await getAllPatients(contract);

//         // Get the asset details by assetID.
//         // await readPatient(contract);

//         // Update an asset which does not exist.
//         // await updateNonExistentAsset(contract)
//     } finally {
//         gateway.close();
//         client.close();
//     }
// }

// main().catch((error: unknown) => {
//     console.error('******** FAILED to run the application:', error);
//     process.exitCode = 1;
// });

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
    const file = files[0];
    if (!file) {
        throw new Error(`No files in directory: ${dirPath}`);
    }
    return path.join(dirPath, file);
}

async function newSigner(): Promise<Signer> {
    const keyPath = await getFirstDirFileName(keyDirectoryPath);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

/**
 * This type of transaction would typically only be run once by an application the first time it was started after its
 * initial deployment. A new version of the chaincode deployed later would likely not need to run an "init" function.
 */
async function initLedger(contract: Contract): Promise<void> {
    console.log('\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger');

    await contract.submitTransaction('InitLedger');

    console.log('*** Transaction committed successfully');
}

async function updatePatient(contract: Contract, patientDetails: any): Promise<void> {
    await contract.submitTransaction(
        'UpdatePatient',
        patientDetails.patientID,
        patientDetails.name,
        patientDetails.age.toString(),
        patientDetails.gender,
        patientDetails.bloodType,
        patientDetails.height.toString(),
        patientDetails.weight.toString(),
        patientDetails.address,
        patientDetails.dob,
        patientDetails.aadharNumber,
        patientDetails.insuranceNumber,
        patientDetails.phoneNumber,
        patientDetails.emailID,
        patientDetails.smokerStatus,
    );
}

async function deletePatient(contract: Contract, patientID: string): Promise<void> {
    await contract.submitTransaction('DeletePatient', patientID);
}

async function patientExists(contract: Contract, patientID: string): Promise<boolean> {
    const resultBytes = await contract.evaluateTransaction('PatientExists', patientID);
    const result = utf8Decoder.decode(resultBytes);
    return result === 'true';
}

/**
 * Evaluate a transaction to query ledger state.
 */
async function getAllPatients(contract: Contract): Promise<void> {
    console.log('\n--> Evaluate Transaction: GetAllPatients, function returns all the current patients on the ledger');

    const resultBytes = await contract.evaluateTransaction('GetAllPatients');

    const resultJson = utf8Decoder.decode(resultBytes);
    const result: unknown = JSON.parse(resultJson);
    console.log('*** Result:', result);
}

// Create a new patient
async function createPatient(contract: Contract, patientDetails: any): Promise<void> {
    await contract.submitTransaction(
        'CreatePatient',
        patientDetails.patientID,
        patientDetails.name,
        patientDetails.age.toString(),
        patientDetails.gender,
        patientDetails.bloodType,
        patientDetails.height.toString(),
        patientDetails.weight.toString(),
        patientDetails.address,
        patientDetails.dob,
        patientDetails.aadharNumber,
        patientDetails.insuranceNumber,
        patientDetails.phoneNumber,
        patientDetails.emailID,
        patientDetails.smokerStatus,
    );
}

// Read a patient by ID
async function readPatient(contract: Contract, patientID: string): Promise<any> {
    const resultBytes = await contract.evaluateTransaction('ReadPatient', patientID);
    return JSON.parse(utf8Decoder.decode(resultBytes));
}



/**
 * envOrDefault() will return the value of an environment variable, or a default value if the variable is undefined.
 */
function envOrDefault(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
}

/**
 * displayInputParameters() will print the global scope parameters used by the main driver routine.
 */
function displayInputParameters(): void {
    console.log(`channelName:       ${channelName}`);
    console.log(`chaincodeName:     ${chaincodeName}`);
    console.log(`mspId:             ${mspId}`);
    console.log(`cryptoPath:        ${cryptoPath}`);
    console.log(`keyDirectoryPath:  ${keyDirectoryPath}`);
    console.log(`certDirectoryPath: ${certDirectoryPath}`);
    console.log(`tlsCertPath:       ${tlsCertPath}`);
    console.log(`peerEndpoint:      ${peerEndpoint}`);
    console.log(`peerHostAlias:     ${peerHostAlias}`);
}


/*********************************************************************************/
// Express route to create a new patient
app.post('/patients', async (req: Request, res: Response) => {
    const patientDetails = req.body;

    try {
        const gateway = await getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);

        await createPatient(contract, patientDetails);
        res.status(201).send('Patient record created successfully');
    } catch (error) {
        res.status(500).send(`Error creating patient record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});


// Express route to get a patient by ID
app.get('/patients/:id', async (req: Request, res: Response) => {
    const patientID = req.params.id;

    try {
        const gateway = await getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);

        const patient = await readPatient(contract, patientID);
        res.status(200).json(patient);
    } catch (error) {
        res.status(500).send(`Error retrieving patient record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});


// Express route to update a patient
app.put('/patients/:id', async (req: Request, res: Response) => {
    const patientID = req.params.id;
    const patientDetails = req.body;

    try {
        const gateway = await getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);

        await updatePatient(contract, { patientID, ...patientDetails });
        res.status(200).send('Patient record updated successfully');
    } catch (error) {
        res.status(500).send(`Error updating patient record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});

// Express route to delete a patient
app.delete('/patients/:id', async (req: Request, res: Response) => {
    const patientID = req.params.id;

    try {
        const gateway = await getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);

        await deletePatient(contract, patientID);
        res.status(200).send('Patient record deleted successfully');
    } catch (error) {
        res.status(500).send(`Error deleting patient record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});

// Express route to get all patients
app.get('/patients', async (req: Request, res: Response) => {
    try {
        const gateway = await getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);

        const patients = await getAllPatients(contract);
        res.status(200).json(patients);
    } catch (error) {
        res.status(500).send(`Error retrieving patient records: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});

app.listen(port, () => {
    console.log(`Patient Backend is running on port ${port}`);
});