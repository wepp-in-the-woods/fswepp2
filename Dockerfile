# Dockerfile
FROM ubuntu:24.04

# avoid prompts
ENV DEBIAN_FRONTEND=noninteractive

# system deps + Python/GDAL
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      apt-transport-https ca-certificates curl software-properties-common \
      python3-full python3-venv python3-pip python3-numpy \
      gdal-bin libgdal-dev python3-gdal wget dpkg git\
 && rm -rf /var/lib/apt/lists/*

# create ramdisk mountpoint (use --tmpfs on docker run / compose)
VOLUME ["/ramdisk"]

# install Python requirements
RUN python3 -m venv --system-site-packages /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# clone your packages
RUN mkdir -p /usr/lib/python3/dist-packages/all_your_base \
 && git clone https://github.com/rogerlew/all_your_base \
      /opt/venv/lib/python3.12/site-packages/all_your_base \
 && mkdir -p /usr/lib/python3/dist-packages/wepppy2 \
 && git clone https://github.com/wepp-in-the-woods/wepppy2/ \
      /opt/venv/lib/python3.12/site-packages/wepppy2

# install fortran runtime for cligen43
RUN wget -q http://archive.ubuntu.com/ubuntu/pool/universe/g/gcc-6/gcc-6-base_6.4.0-17ubuntu1_amd64.deb \
 && wget -q http://archive.ubuntu.com/ubuntu/pool/universe/g/gcc-6/libgfortran3_6.4.0-17ubuntu1_amd64.deb \
 && dpkg -i gcc-6-base_6.4.0-17ubuntu1_amd64.deb libgfortran3_6.4.0-17ubuntu1_amd64.deb \
 && rm *.deb

# expose and default command
EXPOSE 8090
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8090", "--reload"]
