FROM node:alpine

WORKDIR /app

COPY src ./src
COPY package-lock.json .
COPY package.json .
COPY tsconfig.json .

RUN npm install

EXPOSE 3030

CMD ["npm", "start"]