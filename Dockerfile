# Sử dụng image Node.js làm base image
FROM node:14.17.3

# Cài đặt các công cụ cần thiết
# RUN apt-get update && \
#     apt-get install -y \
#     python3 \
#     python3-pip \
#     python3-setuptools \
#     build-essential \
#     libcairo2-dev \
#     libpango1.0-dev \
#     libjpeg-dev \
#     libgif-dev \
#     librsvg2-dev && \
#     apt-get clean && \
#     rm -rf /var/lib/apt/lists/*

# Thiết lập thư mục làm việc trong container
# WORKDIR /app

# Copy các file package.json và package-lock.json (nếu có) vào container
COPY package*.json ./

# Cài đặt các dependencies
RUN npm install

# Thiết lập biến môi trường
ENV NODE_ENV=production
# RUN npm uninstall typescript ts-node && \
# npm install ts-node --save-dev && \
# npm install typescript -g \
# npm install typescript --save-dev

# Copy toàn bộ mã nguồn vào container
COPY . .

# Build project (nếu cần)
RUN npm run build


# Expose cổng ứng dụng
EXPOSE 5502

# Lệnh để chạy ứng dụng
CMD ["npm", "start"]
