import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { config } from '../config/env';
import { logger } from './logger';

if (config.LOG_LEVEL === 'debug' || config.LOG_LEVEL === 'trace') {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
}

let sdk: NodeSDK | null = null;

export const initTracer = (): void => {
  if (config.NODE_ENV === 'test') {
    return;
  }

  try {
    const traceExporter = new OTLPTraceExporter({
      url: config.OTEL_EXPORTER_OTLP_ENDPOINT,
    });

    sdk = new NodeSDK({
      serviceName: 'auth-service',
      traceExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false },
        }),
      ],
    });

    sdk.start();
    logger.info('OpenTelemetry tracing initialized for auth-service');
  } catch (error) {
    logger.warn({ err: error }, 'Failed to initialize OpenTelemetry tracing');
  }
};

export const shutdownTracer = async (): Promise<void> => {
  if (sdk) {
    try {
      await sdk.shutdown();
      logger.info('OpenTelemetry SDK shut down');
    } catch (error) {
      logger.error({ err: error }, 'Error shutting down OpenTelemetry SDK');
    }
  }
};
