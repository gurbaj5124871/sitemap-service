import * as Joiful from 'joiful';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export enum DeployEnvironment {
  Local = 'local',
  Develop = 'develop',
  Staging = 'staging',
  Prod = 'production',
}

class EnvironmentVariables {
  @Joiful.string()
    .valid(Object.values(Environment))
    .default(Environment.Development)
  NODE_ENV?: Environment;

  @Joiful.string()
    .valid(Object.values(DeployEnvironment))
    .default(DeployEnvironment.Develop)
  DEPLOY_ENV?: DeployEnvironment;

  @Joiful.number().integer().positive().default(3000)
  PORT = 3000;

  @Joiful.boolean().default(false)
  ENABLE_API_DOCS: boolean;

  @Joiful.number().integer().positive().max(50000).default(45000)
  SITEMAP_FILE_MAX_LIMIT?: number;

  @Joiful.number().integer().positive().max(20000).default(20000)
  SITEMAP_INDEX_FILE_MAX_LIMIT?: number;

  @Joiful.string().required()
  SITEMAP_S3_OUTPUT_BUCKET: string;

  @Joiful.string().required()
  FRONTEND_DOMAIN: string;

  @Joiful.string().required()
  DATABASE_URL: string;

  @Joiful.string().required()
  KAFKA_BROKERS: string;

  @Joiful.boolean().default(false)
  KAFKA_USE_SSL: boolean;

  @Joiful.string().optional()
  KAFKA_SASL_MECHANISM?: string;

  @Joiful.string().optional()
  KAFKA_USERNAME?: string;

  @Joiful.string().optional()
  KAFKA_PASSWORD?: string;

  @Joiful.string().required()
  KAFKA_TEXT_SITEMAPS_TOPIC_NAME: string;

  @Joiful.string().required()
  KAFKA_VIDEO_SITEMAPS_TOPIC_NAME: string;

  @Joiful.string().required()
  AWS_ACCESS_KEY_ID: string;

  @Joiful.string().required()
  AWS_SECRET_ACCESS_KEY: string;
}

export function validate(config: Record<string, unknown>) {
  const validationResult = Joiful.validateAsClass(
    config,
    EnvironmentVariables,
    { stripUnknown: true },
  );

  if (validationResult.error) {
    throw new Error(validationResult.error as any);
  }
  return validationResult.value;
}
