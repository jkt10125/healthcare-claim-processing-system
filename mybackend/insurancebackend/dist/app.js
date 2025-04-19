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
const chaincodeName = envOrDefault('CHAINCODE_NAME', 'insurancecc');
const mspId = envOrDefault('MSP_ID', 'Org3MSP');
const cryptoPath = envOrDefault('CRYPTO_PATH', path.resolve(__dirname, '..', '..', '..', 'organizations', 'peerOrganizations', 'org3.example.com'));
const keyDirectoryPath = envOrDefault('KEY_DIRECTORY_PATH', path.resolve(cryptoPath, 'users', 'User1@org3.example.com', 'msp', 'keystore'));
const certDirectoryPath = envOrDefault('CERT_DIRECTORY_PATH', path.resolve(cryptoPath, 'users', 'User1@org3.example.com', 'msp', 'signcerts'));
const tlsCertPath = envOrDefault('TLS_CERT_PATH', path.resolve(cryptoPath, 'peers', 'peer0.org3.example.com', 'tls', 'ca.crt'));
const peerEndpoint = envOrDefault('PEER_ENDPOINT', 'localhost:11051');
const peerHostAlias = envOrDefault('PEER_HOST_ALIAS', 'peer0.org3.example.com');
const utf8Decoder = new util_1.TextDecoder();
const app = (0, express_1.default)();
const port = 3003;
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
            evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
            endorseOptions: () => ({ deadline: Date.now() + 15000 }),
            submitOptions: () => ({ deadline: Date.now() + 5000 }),
            commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
        });
    });
}
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
// Insurance Contract Functions
function createInsurance(contract, insuranceDetails) {
    return __awaiter(this, void 0, void 0, function* () {
        yield contract.submitTransaction('CreateInsurance', insuranceDetails.insuranceNumber, insuranceDetails.name, insuranceDetails.aadharNumber, insuranceDetails.startDate, insuranceDetails.endDate, insuranceDetails.age.toString(), insuranceDetails.claimLimit.toString(), insuranceDetails.alreadyClaimed.toString());
    });
}
function readInsurance(contract, insuranceNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        const resultBytes = yield contract.evaluateTransaction('ReadInsurance', insuranceNumber);
        return JSON.parse(utf8Decoder.decode(resultBytes));
    });
}
function updateInsurance(contract, insuranceDetails) {
    return __awaiter(this, void 0, void 0, function* () {
        yield contract.submitTransaction('UpdateInsurance', insuranceDetails.insuranceNumber, insuranceDetails.name, insuranceDetails.aadharNumber, insuranceDetails.startDate, insuranceDetails.endDate, insuranceDetails.age.toString(), insuranceDetails.claimLimit.toString(), insuranceDetails.alreadyClaimed.toString());
    });
}
function deleteInsurance(contract, insuranceNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        yield contract.submitTransaction('DeleteInsurance', insuranceNumber);
    });
}
function getAllInsurances(contract) {
    return __awaiter(this, void 0, void 0, function* () {
        const resultBytes = yield contract.evaluateTransaction('GetAllInsurances');
        return JSON.parse(utf8Decoder.decode(resultBytes));
    });
}
// Express Routes
app.post('/insurances', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const gateway = yield getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        yield createInsurance(contract, req.body);
        res.status(201).send('Insurance record created successfully');
    }
    catch (error) {
        res.status(500).send(`Error creating insurance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}));
app.get('/insurances/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const gateway = yield getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        const insurance = yield readInsurance(contract, req.params.id);
        res.status(200).json(insurance);
    }
    catch (error) {
        res.status(500).send(`Error fetching insurance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}));
app.put('/insurances/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const gateway = yield getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        yield updateInsurance(contract, Object.assign({ insuranceNumber: req.params.id }, req.body));
        res.status(200).send('Insurance updated successfully');
    }
    catch (error) {
        res.status(500).send(`Error updating insurance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}));
app.delete('/insurances/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const gateway = yield getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        yield deleteInsurance(contract, req.params.id);
        res.status(200).send('Insurance deleted successfully');
    }
    catch (error) {
        res.status(500).send(`Error deleting insurance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}));
app.get('/insurances', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const gateway = yield getGatewayClient();
        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        const insurances = yield getAllInsurances(contract);
        res.status(200).json(insurances);
    }
    catch (error) {
        res.status(500).send(`Error fetching insurances: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}));
function envOrDefault(key, defaultValue) {
    return process.env[key] || defaultValue;
}
app.listen(port, () => {
    console.log(`Insurance backend running on port ${port}`);
});
