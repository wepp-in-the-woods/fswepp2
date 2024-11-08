#!/bin/bash
# Install necessary packages
sudo apt-get update
sudo apt-get install -y build-essential util-linux

# Copy your Linux binaries to a suitable location (adjust as needed)
cp /workspaces/fswepp2/bin/* /usr/local/bin/

# Set up a ramdisk (e.g., at /mnt/ramdisk)
sudo mkdir -p /mnt/ramdisk
sudo mount -t tmpfs -o size=1G tmpfs /mnt/ramdisk

echo "Ramdisk mounted at /mnt/ramdisk with 1GB size."
