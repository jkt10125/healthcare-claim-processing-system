#!/bin/sh

cd patientbackend
npm run build
npm run start &

cd ../treatmentbackend
npm run build
npm run start &

cd ../insuranceclaimbackend
npm run build
npm run start &

cd ../insurancebackend
npm run build
npm run start &

cd ..
