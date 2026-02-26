FROM node:18-slim

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# DB 파일이 저장될 폴더 생성
RUN mkdir -p /app/data

EXPOSE 3000
CMD ["node", "server.js"]
