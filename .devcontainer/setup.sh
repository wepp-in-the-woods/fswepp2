#!/bin/bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common

sudo apt-get install -y python3 python3-pip

sudo mkdir /ramdisk && mount -t tmpfs -o size=1G tmpfs /ramdisk

pip3 install -r app/requirements.txt 

cd app
uvicorn main:app --host 0.0.0.0 --port 8080 --reload &
echo "Uvicorn started and running in the background."