#!/bin/sh

./network.sh down
./network.sh up createChannel
cd addOrg3
./addOrg3.sh up
cd ..

