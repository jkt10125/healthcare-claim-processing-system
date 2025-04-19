"use strict";
/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const grpc = __importStar(require("@grpc/grpc-js"));
const fabric_gateway_1 = require("@hyperledger/fabric-gateway");
const crypto = __importStar(require("crypto"));
const fs_1 = require("fs");
const path = __importStar(require("path"));
const util_1 = require("util");
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
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
const utf8Decoder = new util_1.TextDecoder();
// const assetId = `asset${String(Date.now())}`;
// Express server setup
const app = (0, express_1.default)();
const port = 3000;
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
app.use(express_1.default.static(path.join(__dirname, 'public')));
function getGatewayClient() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield newGrpcConnection();
        return (0, fabric_gateway_1.connect)({
            client,
            identity: yield newIdentity(),
            signer: yield newSigner(),
            hash: fabric_gateway_1.hash.sha256,
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
function newGrpcConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        const tlsRootCert = yield fs_1.promises.readFile(tlsCertPath);
        const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
        return new grpc.Client(peerEndpoint, tlsCredentials, {
            'grpc.ssl_target_name_override': peerHostAlias,
        });
    });
}
function newIdentity() {
    return __awaiter(this, void 0, void 0, function* () {
        const certPath = yield getFirstDirFileName(certDirectoryPath);
        const credentials = yield fs_1.promises.readFile(certPath);
        return { mspId, credentials };
    });
}
function getFirstDirFileName(dirPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const files = yield fs_1.promises.readdir(dirPath);
        const file = files[0];
        if (!file) {
            throw new Error(`No files in directory: ${dirPath}`);
        }
        return path.join(dirPath, file);
    });
}
function newSigner() {
    return __awaiter(this, void 0, void 0, function* () {
        const keyPath = yield getFirstDirFileName(keyDirectoryPath);
        const privateKeyPem = yield fs_1.promises.readFile(keyPath);
        const privateKey = crypto.createPrivateKey(privateKeyPem);
        return fabric_gateway_1.signers.newPrivateKeySigner(privateKey);
    });
}
/**
 * This type of transaction would typically only be run once by an application the first time it was started after its
 * initial deployment. A new version of the chaincode deployed later would likely not need to run an "init" function.
 */
function initLedger(contract) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger');
        yield contract.submitTransaction('InitLedger');
        console.log('*** Transaction committed successfully');
    });
}
function updatePatient(contract, patientDetails) {
    return __awaiter(this, void 0, void 0, function* () {
        yield contract.submitTransaction('UpdatePatient', patientDetails.patientID, patientDetails.name, patientDetails.age.toString(), patientDetails.gender, patientDetails.bloodType, patientDetails.height.toString(), patientDetails.weight.toString(), patientDetails.address, patientDetails.dob, patientDetails.aadharNumber, patientDetails.insuranceNumber, patientDetails.phoneNumber, patientDetails.emailID, patientDetails.smokerStatus);
    });
}
function deletePatient(contract, patientID) {
    return __awaiter(this, void 0, void 0, function* () {
        yield contract.submitTransaction('DeletePatient', patientID);
    });
}
function patientExists(contract, patientID) {
    return __awaiter(this, void 0, void 0, function* () {
        const resultBytes = yield contract.evaluateTransaction('PatientExists', patientID);
        const result = utf8Decoder.decode(resultBytes);
        return result === 'true';
    });
}
/**
 * Evaluate a transaction to query ledger state.
 */
function getAllPatients(contract) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('\n--> Evaluate Transaction: GetAllPatients, function returns all the current patients on the ledger');
        const resultBytes = yield contract.evaluateTransaction('GetAllPatients');
        const resultJson = utf8Decoder.decode(resultBytes);
        const result = JSON.parse(resultJson);
        console.log('*** Result:', result);
    });
}
// Create a new patient
function createPatient(contract, patientDetails) {
    return __awaiter(this, void 0, void 0, function* () {
        yield contract.submitTransaction('CreatePatient', patientDetails.patientID, patientDetails.name, patientDetails.age.toString(), patientDetails.gender, patientDetails.bloodType, patientDetails.height.toString(), patientDetails.weight.toString(), patientDetails.address, patientDetails.dob, patientDetails.aadharNumber, patientDetails.insuranceNumber, patientDetails.phoneNumber, patientDetails.emailID, patientDetails.smokerStatus);
    });
}
// Read a patient by ID
function readPatient(contract, patientID) {
    return __awaiter(this, void 0, void 0, function* () {
        const resultBytes = yield contract.evaluateTransaction('ReadPatient', patientID);
        return JSON.parse(utf8Decoder.decode(resultBytes));
    });
}
/**
 * envOrDefault() will return the value of an environment variable, or a default value if the variable is undefined.
 */
function envOrDefault(key, defaultValue) {
    return process.env[key] || defaultValue;
}
/**
 * displayInputParameters() will print the global scope parameters used by the main driver routine.
 */
function displayInputParameters() {
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
app.post('/patients', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const patientDetails = req.body;
    try {
        const gateway = yield getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        yield createPatient(contract, patientDetails);
        res.status(201).send('Patient record created successfully');
    }
    catch (error) {
        res.status(500).send(`Error creating patient record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}));
// Express route to get a patient by ID
app.get('/patients/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const patientID = req.params.id;
    try {
        const gateway = yield getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        const patient = yield readPatient(contract, patientID);
        res.status(200).json(patient);
    }
    catch (error) {
        res.status(500).send(`Error retrieving patient record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}));
// Express route to update a patient
app.put('/patients/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const patientID = req.params.id;
    const patientDetails = req.body;
    try {
        const gateway = yield getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        yield updatePatient(contract, Object.assign({ patientID }, patientDetails));
        res.status(200).send('Patient record updated successfully');
    }
    catch (error) {
        res.status(500).send(`Error updating patient record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}));
// Express route to delete a patient
app.delete('/patients/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const patientID = req.params.id;
    try {
        const gateway = yield getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        yield deletePatient(contract, patientID);
        res.status(200).send('Patient record deleted successfully');
    }
    catch (error) {
        res.status(500).send(`Error deleting patient record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}));
// Express route to get all patients
app.get('/patients', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const gateway = yield getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        const patients = yield getAllPatients(contract);
        res.status(200).json(patients);
    }
    catch (error) {
        res.status(500).send(`Error retrieving patient records: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}));
app.listen(port, () => {
    console.log(`Patient Backend is running on port ${port}`);
});
