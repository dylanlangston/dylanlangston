FROM mcr.microsoft.com/devcontainers/base:debian as base

# Install General Dependencies
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
     && apt-get -y install --no-install-recommends ca-certificates bash curl unzip xz-utils git nodejs npm

# GIT LFS
RUN curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | sudo bash \
     && apt-get -y install --no-install-recommends git-lfs

# Clean Image
RUN apt-get clean && rm -rf /var/cache/apt/* && rm -rf /var/lib/apt/lists/* && rm -rf /tmp/*

# Important we change to the vscode user that the devcontainer runs under
USER vscode
WORKDIR /home/vscode