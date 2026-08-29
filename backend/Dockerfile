FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    curl wget gnupg build-essential \
    qemu-system-x86 qemu-kvm \
    android-tools-adb \
    xvfb x11vnc \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libgtk-3-0 libgbm1 libasound2 libxshmfence1 \
    unzip python3 jq && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Google Chrome
RUN wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
    apt-get install -y ./google-chrome-stable_current_amd64.deb 2>/dev/null || true && \
    rm -f google-chrome-stable_current_amd64.deb

# ADB Platform Tools
RUN mkdir -p /opt/adb && \
    wget -q https://dl.google.com/android/repository/platform-tools-latest-linux.zip -O /tmp/pt.zip && \
    unzip -q /tmp/pt.zip -d /opt && chmod +x /opt/platform-tools/adb && \
    ln -sf /opt/platform-tools/adb /usr/bin/adb && rm /tmp/pt.zip

ENV ANDROID_SDK_ROOT=/opt/platform-tools
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV DISPLAY=:99

WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
# Railway may build from a filtered source context; use npm install so deployment does not depend on lockfile transfer.
RUN npm install --no-audit --no-fund && npx prisma generate

COPY src ./src/
RUN mkdir -p /android/images /app/screenshots /app/apks /app/logs

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Railway generated domain is mapped to 5037 in this service.
ENV PORT=5037
EXPOSE 5037 4000 4001
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "src/index.js"]
