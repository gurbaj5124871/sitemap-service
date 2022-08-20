import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka } from 'kafkajs';
import { ConfigType } from './config';

export const KafkaClientProvider: FactoryProvider = {
  provide: 'KAFKA_CLIENT',
  inject: [ConfigService],
  useFactory: (configService: ConfigService<ConfigType>): Kafka => {
    const deployEnv = configService.get('deployEnv', { infer: true });

    const username: string | undefined = configService.get('kafkaUsername', {
      infer: true,
    });
    const password: string | undefined = configService.get('kafkaPassword', {
      infer: true,
    });
    const ssl = configService.get('kafkaUseSSL', { infer: true });
    const saslMechanism = configService.get('kafkaSASLMechanism', {
      infer: true,
    }) as 'plain' | 'scram-sha-256' | 'scram-sha-512' | undefined;

    const brokers = configService.get('kafkaBrokers', { infer: true });

    const clientID = `sitemap-service-${deployEnv}`;

    const useSASL = saslMechanism && username && password;

    const client = new Kafka({
      clientId: clientID,
      ssl,
      brokers,
      ...(useSASL && {
        sasl: {
          username,
          password,
          mechanism: saslMechanism,
        },
      }),
    });

    return client;
  },
};
