# Dockerfile
FROM ubuntu:24.04

# avoid prompts
ENV DEBIAN_FRONTEND=noninteractive

# system deps + Python/GDAL
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      apt-transport-https ca-certificates curl software-properties-common \
      build-essential pkg-config python3-dev \
      python3-full python3-venv \
      gdal-bin libgdal-dev wget dpkg git \
      proj-bin libproj-dev \
 && rm -rf /var/lib/apt/lists/*

# tmpfs is mounted at /dev/shm via docker-compose
VOLUME ["/dev/shm"]

# install uv
ENV PATH="/root/.local/bin:$PATH"
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# install Python requirements
RUN uv venv /opt/venv
ENV VIRTUAL_ENV="/opt/venv"
ENV PATH="/root/.local/bin:/opt/venv/bin:$PATH"
ENV UV_PYTHON="/opt/venv/bin/python"
COPY requirements.txt ./
RUN uv pip install --python /opt/venv/bin/python --no-cache-dir "numpy==2.4.1" "setuptools" "wheel" \
 && uv pip install --python /opt/venv/bin/python --no-cache-dir --no-build-isolation "GDAL==$(gdal-config --version)" \
 && uv pip install --python /opt/venv/bin/python --no-cache-dir -r requirements.txt \
 && /opt/venv/bin/python -c "import pyproj"

# install fortran runtime for cligen43
RUN wget -q http://archive.ubuntu.com/ubuntu/pool/universe/g/gcc-6/gcc-6-base_6.4.0-17ubuntu1_amd64.deb \
 && wget -q http://archive.ubuntu.com/ubuntu/pool/universe/g/gcc-6/libgfortran3_6.4.0-17ubuntu1_amd64.deb \
 && dpkg -i gcc-6-base_6.4.0-17ubuntu1_amd64.deb libgfortran3_6.4.0-17ubuntu1_amd64.deb || true \
 && apt-get update \
 && apt-get -f install -y \
 && rm -f *.deb

# expose and default command
EXPOSE 8090
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8090", "--reload", "--log-config", "/workdir/fswepp2/logging_config.json"]
