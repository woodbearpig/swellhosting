# Frontend Dockerfile (build + serve via nginx)
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile --network-timeout 600000

COPY . .

# REACT_APP_BACKEND_URL is baked in at build time.
# For same-origin deployment via nginx reverse proxy, set to empty string ""
# so requests hit /api on the same origin.
ARG REACT_APP_BACKEND_URL=""
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
ENV WDS_SOCKET_PORT=443
ENV ENABLE_HEALTH_CHECK=false
ENV DISABLE_ESLINT_PLUGIN=true
ENV CI=false

RUN yarn build

# ---- serve with nginx (static) ----
FROM nginx:1.27-alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx-frontend.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80
