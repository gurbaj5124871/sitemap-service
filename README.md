<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo_text.svg" width="320" alt="Nest Logo" /></a>
</p>

## Description

Automated sitemap generator pipeline which automatically creates or amends sitemap files with new links and register them with popular crawlers like google.

## Technologies

1. [Apache Kafka](https://kafka.apache.org/) : For real time updates of newly created links with relevant data
2. [PostgreSQL](https://www.postgresql.org/) : For persistance, locking and mapping with sitemap files

## Dependencies

1. [NestJS](https://docs.nestjs.com/) : A progressive Node.js framework for building efficient and scalable server-side applications.
2. [Prisma.io](https://www.prisma.io/docs/getting-started) : Next-generation Node.js and TypeScript ORM

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## License

Nest is [MIT licensed](LICENSE).
