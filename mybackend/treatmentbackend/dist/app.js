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
const chaincodeName = envOrDefault('CHAINCODE_NAME', 'treatmentcc'); // Updated chaincode name
const mspId = envOrDefault('MSP_ID', 'Org1MSP');
const cryptoPath = envOrDefault('CRYPTO_PATH', path.resolve(__dirname, '..', '..', '..', 'organizations', 'peerOrganizations', 'org1.example.com'));
const keyDirectoryPath = envOrDefault('KEY_DIRECTORY_PATH', path.resolve(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'keystore'));
const certDirectoryPath = envOrDefault('CERT_DIRECTORY_PATH', path.resolve(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'signcerts'));
const tlsCertPath = envOrDefault('TLS_CERT_PATH', path.resolve(cryptoPath, 'peers', 'peer0.org1.example.com', 'tls', 'ca.crt'));
const peerEndpoint = envOrDefault('PEER_ENDPOINT', 'localhost:7051');
const peerHostAlias = envOrDefault('PEER_HOST_ALIAS', 'peer0.org1.example.com');
const utf8Decoder = new util_1.TextDecoder();
const app = (0, express_1.default)();
const port = 3001; // Different port from patient backend
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
app.use(express_1.default.static(path.join(__dirname, 'public')));
// Same gateway connection setup as original
function getGatewayClient() {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield newGrpcConnection();
        return (0, fabric_gateway_1.connect)({
            client,
            identity: yield newIdentity(),
            signer: yield newSigner(),
            hash: fabric_gateway_1.hash.sha256,
            evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
            endorseOptions: () => ({ deadline: Date.now() + 15000 }),
            submitOptions: () => ({ deadline: Date.now() + 5000 }),
            commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
        });
    });
}
// Existing connection helpers (identical to patient backend)
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
        return path.join(dirPath, files[0]);
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
// Treatment-specific functions
function createTreatment(contract, treatmentDetails) {
    return __awaiter(this, void 0, void 0, function* () {
        yield contract.submitTransaction('CreateTreatment', treatmentDetails.treatmentID, treatmentDetails.medicalCondition, treatmentDetails.hospitalName, treatmentDetails.roomNumber, treatmentDetails.admissionType, treatmentDetails.medication, treatmentDetails.patientID, treatmentDetails.admissionDate, treatmentDetails.releaseDate, treatmentDetails.billingAmount.toString(), treatmentDetails.doctorName);
    });
}
function readTreatment(contract, treatmentID) {
    return __awaiter(this, void 0, void 0, function* () {
        const resultBytes = yield contract.evaluateTransaction('ReadTreatment', treatmentID);
        return JSON.parse(utf8Decoder.decode(resultBytes));
    });
}
function updateTreatment(contract, treatmentDetails) {
    return __awaiter(this, void 0, void 0, function* () {
        yield contract.submitTransaction('UpdateTreatment', treatmentDetails.treatmentID, treatmentDetails.medicalCondition, treatmentDetails.hospitalName, treatmentDetails.roomNumber, treatmentDetails.admissionType, treatmentDetails.medication, treatmentDetails.patientID, treatmentDetails.admissionDate, treatmentDetails.releaseDate, treatmentDetails.billingAmount.toString(), treatmentDetails.doctorName);
    });
}
function deleteTreatment(contract, treatmentID) {
    return __awaiter(this, void 0, void 0, function* () {
        yield contract.submitTransaction('DeleteTreatment', treatmentID);
    });
}
function getAllTreatments(contract) {
    return __awaiter(this, void 0, void 0, function* () {
        const resultBytes = yield contract.evaluateTransaction('GetAllTreatments');
        return JSON.parse(utf8Decoder.decode(resultBytes));
    });
}
// Express routes
app.post('/treatments', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const gateway = yield getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        yield createTreatment(contract, req.body);
        res.status(201).send('Treatment record created successfully');
    }
    catch (error) {
        res.status(500).send(`Error creating treatment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}));
app.get('/patients/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const patientID = req.params.id;
    try {
        const gateway = yield getGatewayClient();
        const network = gateway.getNetwork(channelName);
        // Switch to patient chaincode
        const patientContract = network.getContract('patientcc');
        const resultBytes = yield patientContract.evaluateTransaction('ReadPatient', patientID);
        const patient = JSON.parse(utf8Decoder.decode(resultBytes));
        res.status(200).json(patient);
    }
    catch (error) {
        res.status(500).send(`Error retrieving patient: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}));
app.get('/treatments/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const gateway = yield getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        const treatment = yield readTreatment(contract, req.params.id);
        res.status(200).json(treatment);
    }
    catch (error) {
        res.status(500).send(`Error fetching treatment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}));
app.put('/treatments/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const gateway = yield getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        yield updateTreatment(contract, Object.assign({ treatmentID: req.params.id }, req.body));
        res.status(200).send('Treatment updated successfully');
    }
    catch (error) {
        res.status(500).send(`Error updating treatment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}));
app.delete('/treatments/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const gateway = yield getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        yield deleteTreatment(contract, req.params.id);
        res.status(200).send('Treatment deleted successfully');
    }
    catch (error) {
        res.status(500).send(`Error deleting treatment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}));
app.get('/treatments', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const gateway = yield getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        const treatments = yield getAllTreatments(contract);
        res.status(200).json(treatments);
    }
    catch (error) {
        res.status(500).send(`Error fetching treatments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}));
function envOrDefault(key, defaultValue) {
    return process.env[key] || defaultValue;
}
app.listen(port, () => {
    console.log(`Treatment backend running on port ${port}`);
    console.log(__dirname);
});
//# sourceMappingURL=app.js.map