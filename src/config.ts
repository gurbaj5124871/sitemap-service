import 'dotenv/config';

const config = {
  env: process.env.NODE_ENV,
  deployEnv: process.env.DEPLOY_ENV,
  port: process.env.PORT || 3000,
  enableApiDocs: process.env.ENABLE_API_DOCS === 'true',

  databaseURL: process.env.DATABASE_URL,

  sitemapFileMaxLimit: process.env.SITEMAP_FILE_MAX_LIMIT || 45000,
  sitemapIndexFileLimit: process.env.SITEMAP_INDEX_FILE_MAX_LIMIT || 20000,
  sitemapS3OutputBucket: process.env.SITEMAP_S3_OUTPUT_BUCKET,

  frontendDomain: process.env.FRONTEND_DOMAIN,

  kafkaBrokers: process.env.KAFKA_BROKERS.split(','),
  kafkaUseSSL: process.env.KAFKA_USE_SSL === 'true',
  kafkaSASLMechanism: process.env.KAFKA_SASL_MECHANISM,
  kafkaUsername: process.env.KAFKA_USERNAME,
  kafkaPassword: process.env.KAFKA_PASSWORD,

  kafkaTextSitemapsTopicName: process.env.KAFKA_TEXT_SITEMAPS_TOPIC_NAME,
  kafkaVideoSitemapsTopicName: process.env.KAFKA_VIDEO_SITEMAPS_TOPIC_NAME,

  awsAccessKeyID: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};

export type ConfigType = typeof config;

export default () => config;
