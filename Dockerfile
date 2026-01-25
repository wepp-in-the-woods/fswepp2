# Dockerfile
FROM ubuntu:24.04

# avoid prompts
ENV DEBIAN_FRONTEND=noninteractive

# system deps + Python/GDAL
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      apt-transport-https ca-certificates curl software-properties-common \
      python3-full python3-venv python3-numpy \
      gdal-bin libgdal-dev python3-gdal wget dpkg git\
      proj-bin libproj-dev \
 && rm -rf /var/lib/apt/lists/*

# tmpfs is mounted at /dev/shm via docker-compose
VOLUME ["/dev/shm"]

# install uv
ENV PATH="/root/.local/bin:$PATH"
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# install Python requirements
RUN uv venv --system-site-packages /opt/venv
ENV VIRTUAL_ENV="/opt/venv"
ENV PATH="/root/.local/bin:/opt/venv/bin:$PATH"
ENV UV_PYTHON="/opt/venv/bin/python"
COPY requirements.txt ./
RUN uv pip install --python /opt/venv/bin/python --no-cache-dir -r requirements.txt \
 && /opt/venv/bin/python -c "import pyproj"

# clone your packages
RUN mkdir -p /usr/lib/python3/dist-packages/all_your_base \
 && git clone https://github.com/rogerlew/all_your_base \
      /opt/venv/lib/python3.12/site-packages/all_your_base \
 && mkdir -p /usr/lib/python3/dist-packages/wepppy2 \
 && git clone https://github.com/wepp-in-the-woods/wepppy2/ \
      /opt/venv/lib/python3.12/site-packages/wepppy2

RUN chmod +x /opt/venv/lib/python3.12/site-packages/wepppy2/climates/cligen/bin/cligen43 \
             /opt/venv/lib/python3.12/site-packages/wepppy2/climates/cligen/bin/cligen532

# install fortran runtime for cligen43
RUN wget -q http://archive.ubuntu.com/ubuntu/pool/universe/g/gcc-6/gcc-6-base_6.4.0-17ubuntu1_amd64.deb \
 && wget -q http://archive.ubuntu.com/ubuntu/pool/universe/g/gcc-6/libgfortran3_6.4.0-17ubuntu1_amd64.deb \
 && dpkg -i gcc-6-base_6.4.0-17ubuntu1_amd64.deb libgfortran3_6.4.0-17ubuntu1_amd64.deb \
 && rm *.deb

# expose and default command
EXPOSE 8090
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8090", "--reload", "--log-config", "/workdir/fswepp2/logging_config.json"]
