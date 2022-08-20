<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo_text.svg" width="320" alt="Nest Logo" /></a>
</p>

# Description

Automated sitemap generator pipeline which automatically creates or amends sitemap files with new links and register them with popular crawlers like google.
<br/>
<br/>

## Technologies

1. [Apache Kafka](https://kafka.apache.org/): For real time updates of newly created links with relevant data
2. [PostgreSQL](https://www.postgresql.org/): For persistance, locking and mapping with sitemap files
3. [AWS S3](https://aws.amazon.com/s3/): For persisting actual sitemap xml files

## Dependencies

1. [NestJS](https://docs.nestjs.com/) : A progressive Node.js framework for building efficient and scalable server-side applications.
2. [Prisma.io](https://www.prisma.io/docs/getting-started) : Next-generation Node.js and TypeScript ORM
3. [kafkaJS](https://kafka.js.org/docs/getting-started) : Kafka client for nodeJS

<br/>

# Getting Started

Create `.env` and override custom environment values

```bash
$ cat .env.example > .env
```

Install dependencies

```bash
$ npm install
```

Run DB Migrations

```bash
$ npx prisma migrate dev
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

## Running the app via docker compose

The compose file provides:

1. Apache Kafka with Zookeeper and will automatically creating necessary topics
2. UI for kafka and will be accessible at port 8080
3. PostgreSQL 13 running on port 5432
4. UI for postgreSQL named Admirer which will be accessible at port 8081

```bash
docker compose -f docker-compose.yaml up -d
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

<br/>
<br/>

## License

Nest is [MIT licensed](LICENSE).
