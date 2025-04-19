#!/bin/sh

kill -9 $(lsof -ti :3000,3001,3002,3003)