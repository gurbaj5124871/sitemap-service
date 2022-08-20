FROM node:16.13-alpine as base

ENV NODE_ENV build

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app
USER node

COPY --chown=node:node . .

#######################################

FROM base as builder

WORKDIR /home/node/app
USER node

RUN npm i
RUN npm run build

#######################################

FROM node:16.13-alpine as production

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

WORKDIR /home/node/app
USER node

COPY --from=builder --chown=node:node /home/node/app/node_modules ./node_modules
COPY --from=builder --chown=node:node /home/node/app/prisma/ ./prisma
COPY --from=builder --chown=node:node /home/node/app/package*.json ./
COPY --from=builder --chown=node:node /home/node/app/dist/ ./dist

EXPOSE 3000

CMD ["node", "dist/src/main.js"]

#######################################

# FIXME: this is a hack to get prisma binaries to work on m1 macs
# Change back to base once https://github.com/prisma/prisma/issues/8478 is fixed
FROM node:16.13 as development

ARG NODE_ENV=development
ENV NODE_ENV $NODE_ENV

WORKDIR /home/node/app

COPY --chown=node:node package*.json .
COPY --chown=node:node prisma/schema.prisma prisma/

RUN npm i

USER node
COPY --chown=node:node . .
