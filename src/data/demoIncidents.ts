import { DatasetFile, EvaluationBenchmark } from '../types/incident';

// Benchmark Incident 1: Payment API Failure with Misleading Traffic Drop Hypothesis
export function generateEcommercePaymentIncidentData(): {
  datasets: DatasetFile[];
  incidentDescription: string;
} {
  // Generate 60 minutes of metrics data (13:30 to 14:30 UTC)
  // Deployment happened at 14:12 UTC. Payment failures spiked at 14:14 UTC.
  const metricsRows: Record<string, any>[] = [];
  const logRows: Record<string, any>[] = [];

  for (let minute = 0; minute < 60; minute++) {
    const hour = minute < 30 ? 13 : 14;
    const minStr = (minute < 30 ? 30 + minute : minute - 30).toString().padStart(2, '0');
    const timestamp = `2026-10-24T${hour}:${minStr}:00Z`;

    const isPostIncident = minute >= 44; // 14:14 onwards
    const isDeploymentWindow = minute >= 42 && minute < 44; // 14:12 - 14:13

    // Request volume remains steady around 2,050 +/- 60 req/min
    const requestCount = 2000 + Math.floor(Math.sin(minute / 5) * 60) + Math.floor(Math.random() * 50);

    // Baseline: checkout attempts ~ 220/min
    const checkoutAttempts = 210 + Math.floor(Math.random() * 20);

    let paymentFailures = 1 + Math.floor(Math.random() * 3);
    let successfulOrders = checkoutAttempts - paymentFailures;
    let avgLatencyMs = 110 + Math.floor(Math.random() * 15);
    let http504Count = 0;
    let http500Count = 1;

    if (isPostIncident) {
      // Payment failure spike
      paymentFailures = 180 + Math.floor(Math.random() * 40);
      successfulOrders = Math.max(10, checkoutAttempts - paymentFailures);
      avgLatencyMs = 3400 + Math.floor(Math.random() * 400); // High latency due to 15s timeout retries
      http504Count = paymentFailures;
      http500Count = 12 + Math.floor(Math.random() * 6);
    } else if (isDeploymentWindow) {
      paymentFailures = 8;
      successfulOrders = checkoutAttempts - 8;
      avgLatencyMs = 240;
    }

    metricsRows.push({
      timestamp,
      request_count: requestCount,
      checkout_attempts: checkoutAttempts,
      successful_orders: successfulOrders,
      failed_payments: paymentFailures,
      avg_latency_ms: avgLatencyMs,
      http_200_count: requestCount - http504Count - http500Count,
      http_500_count: http500Count,
      http_504_count: http504Count,
      cpu_utilization_pct: isPostIncident ? 48.5 : 42.1,
      payment_gateway_error_rate_pct: parseFloat(((paymentFailures / checkoutAttempts) * 100).toFixed(2)),
    });

    // Sample logs
    if (isDeploymentWindow && minute === 42) {
      logRows.push({
        timestamp: `2026-10-24T14:12:04Z`,
        level: 'INFO',
        service: 'deploy-bot',
        message: 'Release checkout-service:v2.4.1 deployed to production cluster (updated upstream payment gateway SDK endpoint & retry policy)',
        status_code: 200,
      });
    }

    if (isPostIncident) {
      if (minute % 2 === 0) {
        logRows.push({
          timestamp: `2026-10-24T${hour}:${minStr}:${(10 + (minute % 40)).toString().padStart(2, '0')}Z`,
          level: 'ERROR',
          service: 'checkout-service',
          message: 'POST /v1/charges failed upstream: HTTP 504 Gateway Timeout from payment-provider.net (Read timeout after 15000ms)',
          status_code: 504,
        });
      }
      if (minute % 5 === 0) {
        logRows.push({
          timestamp: `2026-10-24T${hour}:${minStr}:33Z`,
          level: 'WARN',
          service: 'checkout-service',
          message: 'CircuitBreaker: payment-gateway failure rate exceeded threshold (42.6% > 5.0%), retries exhausted',
          status_code: 504,
        });
      }
    } else {
      if (minute % 10 === 0) {
        logRows.push({
          timestamp: `2026-10-24T${hour}:${minStr}:15Z`,
          level: 'INFO',
          service: 'checkout-service',
          message: 'Processed batch charge settlement successfully for 48 transactions',
          status_code: 200,
        });
      }
    }
  }

  // Convert metricsRows to CSV format
  const metricsHeaders = Object.keys(metricsRows[0]).join(',');
  const metricsCsvLines = metricsRows.map((r) => Object.values(r).join(','));
  const rawMetricsCsv = [metricsHeaders, ...metricsCsvLines].join('\n');

  // Convert logRows to CSV format
  const logsHeaders = Object.keys(logRows[0]).join(',');
  const logsCsvLines = logRows.map((r) =>
    [r.timestamp, r.level, r.service, `"${r.message.replace(/"/g, '""')}"`, r.status_code].join(',')
  );
  const rawLogsCsv = [logsHeaders, ...logsCsvLines].join('\n');

  const metricsDataset: DatasetFile = {
    id: 'ds-ecommerce-metrics',
    name: 'ecommerce_timeseries_metrics.csv',
    description: '1-minute time series of storefront HTTP traffic, checkout attempts, order completions, latencies, and status codes (13:30 - 14:30 UTC)',
    rowCount: metricsRows.length,
    rawCsv: rawMetricsCsv,
    rows: metricsRows,
    uploadedAt: '2026-10-24T14:35:00Z',
    columns: [
      { name: 'timestamp', type: 'timestamp', sampleValues: [metricsRows[0].timestamp, metricsRows[30].timestamp] },
      { name: 'request_count', type: 'number', sampleValues: [metricsRows[0].request_count], min: 1950, max: 2150 },
      { name: 'checkout_attempts', type: 'number', sampleValues: [metricsRows[0].checkout_attempts], min: 200, max: 235 },
      { name: 'successful_orders', type: 'number', sampleValues: [metricsRows[0].successful_orders], min: 10, max: 230 },
      { name: 'failed_payments', type: 'number', sampleValues: [metricsRows[0].failed_payments], min: 1, max: 220 },
      { name: 'avg_latency_ms', type: 'number', sampleValues: [metricsRows[0].avg_latency_ms], min: 100, max: 3800 },
      { name: 'http_504_count', type: 'number', sampleValues: [0, 185], min: 0, max: 220 },
      { name: 'payment_gateway_error_rate_pct', type: 'number', sampleValues: [0.8, 85.2], min: 0.4, max: 92.5 },
    ],
  };

  const logsDataset: DatasetFile = {
    id: 'ds-ecommerce-logs',
    name: 'checkout_application_logs.csv',
    description: 'Application and deployment event logs containing error stack traces, deployment triggers, and circuit breaker events',
    rowCount: logRows.length,
    rawCsv: rawLogsCsv,
    rows: logRows,
    uploadedAt: '2026-10-24T14:35:00Z',
    columns: [
      { name: 'timestamp', type: 'timestamp', sampleValues: [logRows[0].timestamp] },
      { name: 'level', type: 'string', sampleValues: ['INFO', 'ERROR', 'WARN'] },
      { name: 'service', type: 'string', sampleValues: ['checkout-service', 'deploy-bot'] },
      { name: 'message', type: 'string', sampleValues: [logRows[0].message] },
      { name: 'status_code', type: 'number', sampleValues: [200, 504] },
    ],
  };

  return {
    datasets: [metricsDataset, logsDataset],
    incidentDescription:
      'Storefront business alert: Executive on-call received an alert at 14:18 UTC reporting that completed online store orders dropped abruptly by over 80%. Initial stakeholder inquiry suspects a sudden drop in marketing traffic or checkout drop-off. Need an evidence-driven investigation to determine the ground truth, test competing hypotheses, verify timeline correlations, and recommend immediate remediation.',
  };
}

// Benchmark Incident 2: Traffic Decline (DNS/Edge misconfiguration)
export function generateTrafficDeclineIncidentData(): {
  datasets: DatasetFile[];
  incidentDescription: string;
} {
  const metricsRows: Record<string, any>[] = [];
  const logRows: Record<string, any>[] = [];

  for (let minute = 0; minute < 60; minute++) {
    const timestamp = `2026-10-24T09:${minute.toString().padStart(2, '0')}:00Z`;
    const isPostIncident = minute >= 25; // Drop at 09:25

    const normalTraffic = 5000 + Math.floor(Math.random() * 200);
    const requestCount = isPostIncident ? 1100 + Math.floor(Math.random() * 50) : normalTraffic;
    const errorCount = Math.floor(Math.random() * 2);

    metricsRows.push({
      timestamp,
      request_count: requestCount,
      edge_status_200: requestCount - errorCount,
      edge_status_5xx: errorCount,
      origin_cpu_pct: isPostIncident ? 14.2 : 55.4,
      origin_latency_ms: 45 + Math.floor(Math.random() * 8),
      cdn_edge_latency_ms: 18 + Math.floor(Math.random() * 4),
    });

    if (minute === 24) {
      logRows.push({
        timestamp: '2026-10-24T09:24:18Z',
        level: 'INFO',
        service: 'cloudflare-dns-sync',
        message: 'Updated DNS geo-steering records for EMEA & APAC edge pop groups (ttl=300s)',
        status_code: 200,
      });
    }
  }

  const rawMetricsCsv = [Object.keys(metricsRows[0]).join(','), ...metricsRows.map((r) => Object.values(r).join(','))].join('\n');
  const rawLogsCsv = [Object.keys(logRows[0]).join(','), ...logRows.map((r) => [r.timestamp, r.level, r.service, `"${r.message}"`, r.status_code].join(','))].join('\n');

  return {
    datasets: [
      {
        id: 'ds-traffic-metrics',
        name: 'edge_cdn_traffic.csv',
        description: 'Edge CDN request volume and origin metrics across 09:00 - 10:00 UTC',
        rowCount: metricsRows.length,
        rawCsv: rawMetricsCsv,
        rows: metricsRows,
        uploadedAt: '2026-10-24T10:05:00Z',
        columns: [
          { name: 'timestamp', type: 'timestamp', sampleValues: [metricsRows[0].timestamp] },
          { name: 'request_count', type: 'number', sampleValues: [5050, 1120], min: 1050, max: 5300 },
          { name: 'edge_status_5xx', type: 'number', sampleValues: [0, 1], min: 0, max: 3 },
          { name: 'origin_latency_ms', type: 'number', sampleValues: [48], min: 40, max: 56 },
        ],
      },
      {
        id: 'ds-traffic-logs',
        name: 'infrastructure_events.csv',
        description: 'DNS and routing infrastructure sync logs',
        rowCount: logRows.length,
        rawCsv: rawLogsCsv,
        rows: logRows,
        uploadedAt: '2026-10-24T10:05:00Z',
        columns: [
          { name: 'timestamp', type: 'timestamp', sampleValues: [logRows[0].timestamp] },
          { name: 'level', type: 'string', sampleValues: ['INFO'] },
          { name: 'service', type: 'string', sampleValues: ['cloudflare-dns-sync'] },
          { name: 'message', type: 'string', sampleValues: [logRows[0].message] },
          { name: 'status_code', type: 'number', sampleValues: [200] },
        ],
      },
    ],
    incidentDescription:
      'Traffic dropped by 78% abruptly at 09:25 UTC. Customer support wonders if origin servers crashed or are throwing 500 errors. Investigate edge vs origin metrics, error rates, and DNS configuration to confirm true cause.',
  };
}

// Benchmark Incident 3: Server Latency Surge (DB connection pool exhaustion)
export function generateLatencySurgeIncidentData(): {
  datasets: DatasetFile[];
  incidentDescription: string;
} {
  const metricsRows: Record<string, any>[] = [];
  const logRows: Record<string, any>[] = [];

  for (let minute = 0; minute < 60; minute++) {
    const timestamp = `2026-10-24T18:${minute.toString().padStart(2, '0')}:00Z`;
    const isPostIncident = minute >= 35; // Latency spike at 18:35

    const requestCount = 1500 + Math.floor(Math.random() * 80);
    const p95Latency = isPostIncident ? 4850 + Math.floor(Math.random() * 600) : 110 + Math.floor(Math.random() * 15);
    const activeDbPoolConnections = isPostIncident ? 50 : 12 + Math.floor(Math.random() * 4);
    const dbTimeoutErrors = isPostIncident ? 45 + Math.floor(Math.random() * 15) : 0;

    metricsRows.push({
      timestamp,
      request_count: requestCount,
      p95_latency_ms: p95Latency,
      active_db_pool_conns: activeDbPoolConnections,
      db_pool_max_limit: 50,
      db_timeout_errors: dbTimeoutErrors,
      cpu_percent: isPostIncident ? 89.4 : 32.1,
    });

    if (isPostIncident && minute % 3 === 0) {
      logRows.push({
        timestamp: `2026-10-24T18:${minute.toString().padStart(2, '0')}:12Z`,
        level: 'ERROR',
        service: 'api-gateway',
        message: 'ActiveRecord::ConnectionTimeoutError: could not obtain a connection from the pool within 5.000 seconds (size: 50)',
        status_code: 503,
      });
    }
  }

  const rawMetricsCsv = [Object.keys(metricsRows[0]).join(','), ...metricsRows.map((r) => Object.values(r).join(','))].join('\n');
  const rawLogsCsv = [Object.keys(logRows[0]).join(','), ...logRows.map((r) => [r.timestamp, r.level, r.service, `"${r.message}"`, r.status_code].join(','))].join('\n');

  return {
    datasets: [
      {
        id: 'ds-latency-metrics',
        name: 'api_server_latency_and_db_pool.csv',
        description: 'Server p95 latency, active PostgreSQL pool connections, and error counts across 18:00 - 19:00 UTC',
        rowCount: metricsRows.length,
        rawCsv: rawMetricsCsv,
        rows: metricsRows,
        uploadedAt: '2026-10-24T19:05:00Z',
        columns: [
          { name: 'timestamp', type: 'timestamp', sampleValues: [metricsRows[0].timestamp] },
          { name: 'p95_latency_ms', type: 'number', sampleValues: [110, 4950], min: 95, max: 5500 },
          { name: 'active_db_pool_conns', type: 'number', sampleValues: [14, 50], min: 10, max: 50 },
          { name: 'db_timeout_errors', type: 'number', sampleValues: [0, 48], min: 0, max: 62 },
        ],
      },
      {
        id: 'ds-latency-logs',
        name: 'api_gateway_error_logs.csv',
        description: 'Connection pool timeout exceptions and upstream timeout logs',
        rowCount: logRows.length,
        rawCsv: rawLogsCsv,
        rows: logRows,
        uploadedAt: '2026-10-24T19:05:00Z',
        columns: [
          { name: 'timestamp', type: 'timestamp', sampleValues: [logRows[0].timestamp] },
          { name: 'level', type: 'string', sampleValues: ['ERROR'] },
          { name: 'service', type: 'string', sampleValues: ['api-gateway'] },
          { name: 'message', type: 'string', sampleValues: [logRows[0].message] },
          { name: 'status_code', type: 'number', sampleValues: [503] },
        ],
      },
    ],
    incidentDescription:
      'High latency alert: API p95 response time skyrocketed past 4,800ms at 18:35 UTC. Team suspects an external DDoS attack flooded endpoints. Investigate latency, database pool saturation, and error logs to identify the real bottleneck.',
  };
}

export const BENCHMARKS: EvaluationBenchmark[] = [
  {
    id: 'benchmark-payment-fail',
    name: 'Online Storefront Payment API Failure',
    incidentBrief: 'Orders plummeted by 80% after 14:12 UTC. Initial claim: Traffic dropped. Ground truth: Upstream 504 Gateway Timeout in v2.4.1.',
    expectedRootCauseKeywords: ['payment', 'gateway', '504', 'timeout', 'v2.4.1'],
    misleadingHypothesisTitle: 'Reduced user traffic / consumer demand drop',
    expectedStatus: 'REFUTED',
    keyEvidenceRequirements: ['Request count remained steady at ~2,050/min', 'HTTP 504 errors increased from 0 to >180/min', 'v2.4.1 deployment at 14:12 UTC'],
  },
  {
    id: 'benchmark-traffic-decline',
    name: 'Edge CDN Geo-DNS Routing Drop',
    incidentBrief: 'Inbound requests plunged 78% at 09:25 UTC. Initial claim: Origin application crashed. Ground truth: Edge DNS geo-steering misconfiguration.',
    expectedRootCauseKeywords: ['dns', 'geo', 'edge', 'routing', 'cloudflare'],
    misleadingHypothesisTitle: 'Origin application crash or 500 error wave',
    expectedStatus: 'REFUTED',
    keyEvidenceRequirements: ['Origin 5xx error rate remained < 0.05%', 'DNS sync event at 09:24 UTC', 'Origin CPU decreased from 55% to 14%'],
  },
  {
    id: 'benchmark-latency-surge',
    name: 'PostgreSQL DB Connection Pool Starvation',
    incidentBrief: 'p95 latency jumped from 110ms to >4,800ms at 18:35 UTC. Initial claim: External DDoS flood. Ground truth: DB pool exhaustion (size: 50).',
    expectedRootCauseKeywords: ['connection pool', 'database', 'timeout', 'pool saturation', '503'],
    misleadingHypothesisTitle: 'External distributed denial-of-service (DDoS) traffic flood',
    expectedStatus: 'REFUTED',
    keyEvidenceRequirements: ['Total request volume remained steady ~1,500 req/min', 'Active DB connections hit hard cap 50/50', 'ActiveRecord::ConnectionTimeoutError in logs'],
  },
];
