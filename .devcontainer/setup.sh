#!/bin/bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common

sudo apt-get install -y python3 python3-pip python3-numpy
sudo apt-get install -y gdal-bin libgdal-dev

sudo mkdir /ramdisk && sudo mount -t tmpfs -o size=1G tmpfs /ramdisk
sudo chown $(whoami):$(whoami) /ramdisk

pip3 install -r requirements.txt

sudo mkdir -p /usr/lib/python3/dist-packages/all_your_base
sudo git clone https://github.com/rogerlew/all_your_base /usr/lib/python3/dist-packages/all_your_base
sudo chown -R $(whoami):$(whoami) /usr/lib/python3/dist-packages/all_your_base

sudo mkdir -p /usr/lib/python3/dist-packages/wepppy2
sudo git clone https://github.com/wepp-in-the-woods/wepppy2/ /usr/lib/python3/dist-packages/wepppy2
sudo chown -R $(whoami):$(whoami) /usr/lib/python3/dist-packages/wepppy2
sudo chmod +x /usr/lib/python3/dist-packages/wepppy2/climates/cligen/bin/cligen532
sudo chmod +x /usr/lib/python3/dist-packages/wepppy2/climates/cligen/bin/cligen43

# uvicorn main:app --host 0.0.0.0 --port 8080 --reload


# For starting frontend. Commented out because it downloads a lot of packages through nodejs for developing React.
# curl -sL https://deb.nodesource.com/setup_20.x | sudo -E bash -
# sudo apt-get install -y nodejs

# cd frontend

# cd fswepp2-frontend
# npm install --verbose
# npm install react-router-dom --verbose

# npm start --verbose