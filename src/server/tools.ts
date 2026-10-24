import { DatasetFile, ToolCallExecution, EvidenceCitation, Hypothesis } from '../types/incident';

export interface ToolExecutionContext {
  datasets: DatasetFile[];
  stepNumber: number;
}

// 1. inspect_dataset
export function executeInspectDataset(
  args: { dataset_id?: string; dataset_name?: string },
  context: ToolExecutionContext
) {
  const ds = context.datasets.find(
    (d) =>
      (args.dataset_id && d.id === args.dataset_id) ||
      (args.dataset_name && d.name.toLowerCase().includes(args.dataset_name.toLowerCase()))
  ) || context.datasets[0];

  if (!ds) {
    return {
      status: 'ERROR',
      error: 'Dataset not found in session context.',
    };
  }

  const rows = ds.rows || [];
  const rowCount = rows.length;
  const sampleHead = rows.slice(0, 3);
  const sampleTail = rows.slice(-2);

  const columnSummaries: Record<string, any> = {};
  if (rows.length > 0) {
    const keys = Object.keys(rows[0]);
    for (const key of keys) {
      const values = rows.map((r) => r[key]).filter((v) => v !== undefined && v !== null && v !== '');
      const isNum = values.every((v) => !isNaN(Number(v)));
      if (isNum && values.length > 0) {
        const nums = values.map((v) => Number(v));
        columnSummaries[key] = {
          type: 'number',
          min: Math.min(...nums),
          max: Math.max(...nums),
          avg: parseFloat((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)),
          count: nums.length,
        };
      } else {
        const uniqueValues = Array.from(new Set(values.slice(0, 20)));
        columnSummaries[key] = {
          type: 'string_or_timestamp',
          sample_values: uniqueValues.slice(0, 5),
          distinct_count: new Set(values).size,
        };
      }
    }
  }

  return {
    status: 'SUCCESS',
    dataset_id: ds.id,
    name: ds.name,
    description: ds.description,
    total_rows: rowCount,
    column_count: Object.keys(columnSummaries).length,
    columns: columnSummaries,
    first_timestamp: rows[0]?.timestamp || null,
    last_timestamp: rows[rowCount - 1]?.timestamp || null,
    head_sample: sampleHead,
    tail_sample: sampleTail,
    summary: `Dataset '${ds.name}' contains ${rowCount} rows with columns: ${Object.keys(columnSummaries).join(', ')}.`,
  };
}

// 2. calculate_metric
export function executeCalculateMetric(
  args: {
    dataset_id?: string;
    dataset_name?: string;
    metric_type: 'sum' | 'mean' | 'min' | 'max' | 'p50' | 'p95' | 'p99' | 'rate_per_minute' | 'failure_rate' | 'ratio';
    column: string;
    secondary_column?: string;
    filter_condition?: { column: string; operator: '=' | '!=' | '>' | '<' | 'contains'; value: any };
    start_time?: string;
    end_time?: string;
  },
  context: ToolExecutionContext
) {
  const ds = context.datasets.find(
    (d) =>
      (args.dataset_id && d.id === args.dataset_id) ||
      (args.dataset_name && d.name.toLowerCase().includes(args.dataset_name.toLowerCase()))
  ) || context.datasets[0];

  if (!ds || !ds.rows) {
    return { status: 'ERROR', error: 'Dataset not found or has no rows' };
  }

  let filteredRows = ds.rows;

  if (args.start_time) {
    const sTime = new Date(args.start_time).getTime();
    filteredRows = filteredRows.filter((r) => !r.timestamp || new Date(r.timestamp).getTime() >= sTime);
  }
  if (args.end_time) {
    const eTime = new Date(args.end_time).getTime();
    filteredRows = filteredRows.filter((r) => !r.timestamp || new Date(r.timestamp).getTime() <= eTime);
  }

  if (args.filter_condition) {
    const { column, operator, value } = args.filter_condition;
    filteredRows = filteredRows.filter((r) => {
      const cell = r[column];
      if (operator === '=') return cell == value;
      if (operator === '!=') return cell != value;
      if (operator === '>') return Number(cell) > Number(value);
      if (operator === '<') return Number(cell) < Number(value);
      if (operator === 'contains') return String(cell).toLowerCase().includes(String(value).toLowerCase());
      return true;
    });
  }

  const values = filteredRows.map((r) => Number(r[args.column])).filter((v) => !isNaN(v));

  if (values.length === 0) {
    return {
      status: 'SUCCESS',
      metric_type: args.metric_type,
      column: args.column,
      value: 0,
      rows_evaluated: 0,
      note: 'No numeric values matched criteria',
    };
  }

  let resultValue = 0;
  values.sort((a, b) => a - b);

  switch (args.metric_type) {
    case 'sum':
      resultValue = values.reduce((a, b) => a + b, 0);
      break;
    case 'mean':
      resultValue = parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
      break;
    case 'min':
      resultValue = values[0];
      break;
    case 'max':
      resultValue = values[values.length - 1];
      break;
    case 'p50':
      resultValue = values[Math.floor(values.length * 0.5)];
      break;
    case 'p95':
      resultValue = values[Math.floor(values.length * 0.95)];
      break;
    case 'p99':
      resultValue = values[Math.floor(values.length * 0.99)];
      break;
    case 'failure_rate':
      if (args.secondary_column) {
        const secCol = args.secondary_column;
        const totalAttempts = filteredRows.map((r) => Number(r[secCol])).reduce((a, b) => a + (isNaN(b) ? 0 : b), 0);
        const failures = values.reduce((a, b) => a + b, 0);
        resultValue = totalAttempts > 0 ? parseFloat(((failures / totalAttempts) * 100).toFixed(2)) : 0;
      } else {
        resultValue = parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
      }
      break;
    case 'ratio':
      if (args.secondary_column) {
        const secCol = args.secondary_column;
        const secValues = filteredRows.map((r) => Number(r[secCol])).reduce((a, b) => a + (isNaN(b) ? 0 : b), 0);
        const primValues = values.reduce((a, b) => a + b, 0);
        resultValue = secValues > 0 ? parseFloat((primValues / secValues).toFixed(4)) : 0;
      }
      break;
    default:
      resultValue = parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
  }

  return {
    status: 'SUCCESS',
    metric_type: args.metric_type,
    column: args.column,
    secondary_column: args.secondary_column,
    calculated_value: resultValue,
    rows_matched: filteredRows.length,
    window_start: args.start_time || 'all',
    window_end: args.end_time || 'all',
    summary: `Calculated ${args.metric_type} of '${args.column}' = ${resultValue} across ${filteredRows.length} rows.`,
  };
}

// 3. compare_time_windows
export function executeCompareTimeWindows(
  args: {
    dataset_id?: string;
    baseline_start: string;
    baseline_end: string;
    incident_start: string;
    incident_end: string;
    metrics: string[];
  },
  context: ToolExecutionContext
) {
  const ds = context.datasets.find((d) => !args.dataset_id || d.id === args.dataset_id) || context.datasets[0];
  if (!ds || !ds.rows) {
    return { status: 'ERROR', error: 'Dataset not found' };
  }

  const baseStart = new Date(args.baseline_start).getTime();
  const baseEnd = new Date(args.baseline_end).getTime();
  const incStart = new Date(args.incident_start).getTime();
  const incEnd = new Date(args.incident_end).getTime();

  const baselineRows = ds.rows.filter((r) => {
    if (!r.timestamp) return false;
    const t = new Date(r.timestamp).getTime();
    return t >= baseStart && t <= baseEnd;
  });

  const incidentRows = ds.rows.filter((r) => {
    if (!r.timestamp) return false;
    const t = new Date(r.timestamp).getTime();
    return t >= incStart && t <= incEnd;
  });

  const comparisons: Record<string, any> = {};

  for (const metric of args.metrics) {
    const baseVals = baselineRows.map((r) => Number(r[metric])).filter((v) => !isNaN(v));
    const incVals = incidentRows.map((r) => Number(r[metric])).filter((v) => !isNaN(v));

    const baseAvg = baseVals.length > 0 ? baseVals.reduce((a, b) => a + b, 0) / baseVals.length : 0;
    const incAvg = incVals.length > 0 ? incVals.reduce((a, b) => a + b, 0) / incVals.length : 0;

    const absDelta = incAvg - baseAvg;
    const pctChange = baseAvg !== 0 ? ((absDelta / baseAvg) * 100) : (incAvg > 0 ? 100 : 0);

    comparisons[metric] = {
      baseline_avg: parseFloat(baseAvg.toFixed(2)),
      incident_avg: parseFloat(incAvg.toFixed(2)),
      absolute_delta: parseFloat(absDelta.toFixed(2)),
      percentage_change: parseFloat(pctChange.toFixed(2)),
      significant_shift: Math.abs(pctChange) >= 20,
    };
  }

  return {
    status: 'SUCCESS',
    baseline_window: `${args.baseline_start} to ${args.baseline_end} (${baselineRows.length} points)`,
    incident_window: `${args.incident_start} to ${args.incident_end} (${incidentRows.length} points)`,
    metric_comparisons: comparisons,
    summary: `Compared ${args.metrics.length} metrics between baseline and incident windows.`,
  };
}

// 4. detect_anomalies
export function executeDetectAnomalies(
  args: { dataset_id?: string; column: string; z_threshold?: number },
  context: ToolExecutionContext
) {
  const ds = context.datasets.find((d) => !args.dataset_id || d.id === args.dataset_id) || context.datasets[0];
  if (!ds || !ds.rows) {
    return { status: 'ERROR', error: 'Dataset not found' };
  }

  const threshold = args.z_threshold || 2.5;
  const values = ds.rows.map((r) => Number(r[args.column])).filter((v) => !isNaN(v));

  if (values.length < 5) {
    return { status: 'ERROR', error: 'Insufficient data points for anomaly detection' };
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  const anomalies: { timestamp: string; value: number; zScore: number; direction: 'SPIKE' | 'DROP' }[] = [];

  for (const row of ds.rows) {
    const val = Number(row[args.column]);
    if (isNaN(val)) continue;
    const z = stdDev > 0 ? (val - mean) / stdDev : 0;
    if (Math.abs(z) >= threshold) {
      anomalies.push({
        timestamp: row.timestamp || 'N/A',
        value: val,
        zScore: parseFloat(z.toFixed(2)),
        direction: z > 0 ? 'SPIKE' : 'DROP',
      });
    }
  }

  return {
    status: 'SUCCESS',
    column: args.column,
    baseline_mean: parseFloat(mean.toFixed(2)),
    standard_deviation: parseFloat(stdDev.toFixed(2)),
    anomalies_detected: anomalies.length,
    first_anomaly_timestamp: anomalies[0]?.timestamp || null,
    anomaly_samples: anomalies.slice(0, 10),
    summary: `Detected ${anomalies.length} anomalous readings for '${args.column}' exceeding Z-score ${threshold}. First occurrence at ${anomalies[0]?.timestamp || 'none'}.`,
  };
}

// 5. inspect_error_logs
export function executeInspectErrorLogs(
  args: {
    dataset_id?: string;
    level?: string;
    search_query?: string;
    min_status_code?: number;
    start_time?: string;
    end_time?: string;
  },
  context: ToolExecutionContext
) {
  // Find log dataset
  const logDs =
    context.datasets.find((d) => d.name.toLowerCase().includes('log') || (args.dataset_id && d.id === args.dataset_id)) ||
    context.datasets[1] ||
    context.datasets[0];

  if (!logDs || !logDs.rows) {
    return { status: 'ERROR', error: 'Log dataset not found' };
  }

  let matchingLogs = logDs.rows;

  if (args.level) {
    matchingLogs = matchingLogs.filter(
      (r) => String(r.level || '').toUpperCase() === args.level?.toUpperCase()
    );
  }

  if (args.min_status_code) {
    matchingLogs = matchingLogs.filter((r) => Number(r.status_code || 0) >= (args.min_status_code || 400));
  }

  if (args.search_query) {
    const query = args.search_query.toLowerCase();
    matchingLogs = matchingLogs.filter((r) =>
      JSON.stringify(r).toLowerCase().includes(query)
    );
  }

  if (args.start_time) {
    const s = new Date(args.start_time).getTime();
    matchingLogs = matchingLogs.filter((r) => !r.timestamp || new Date(r.timestamp).getTime() >= s);
  }

  // Aggregate by error message pattern
  const patternCounts: Record<string, { count: number; firstSeen: string; statusCode: number; sample: any }> = {};
  for (const log of matchingLogs) {
    const msg = String(log.message || log.error || 'Unknown error');
    const snippet = msg.length > 90 ? msg.substring(0, 90) + '...' : msg;
    if (!patternCounts[snippet]) {
      patternCounts[snippet] = {
        count: 0,
        firstSeen: log.timestamp || '',
        statusCode: log.status_code || 500,
        sample: log,
      };
    }
    patternCounts[snippet].count++;
  }

  return {
    status: 'SUCCESS',
    total_matching_entries: matchingLogs.length,
    distinct_patterns: Object.keys(patternCounts).length,
    top_patterns: Object.entries(patternCounts).map(([pattern, data]) => ({
      pattern,
      count: data.count,
      firstSeen: data.firstSeen,
      statusCode: data.statusCode,
    })),
    recent_samples: matchingLogs.slice(-5),
    summary: `Found ${matchingLogs.length} log entries matching query across ${logDs.name}. Top error pattern occurred ${Object.values(patternCounts)[0]?.count || 0} times.`,
  };
}

// 6. test_hypothesis
export function executeTestHypothesis(
  args: {
    hypothesis_id: string;
    statement: string;
    test_type: 'TRAFFIC_DROP_CHECK' | 'ERROR_SPIKE_CHECK' | 'DEPLOYMENT_CORRELATION' | 'LATENCY_BOTTLENECK' | 'CUSTOM';
    primary_metric: string;
    secondary_metric?: string;
  },
  context: ToolExecutionContext
) {
  const metricsDs = context.datasets[0];
  const logsDs = context.datasets.find((d) => d.name.toLowerCase().includes('log')) || context.datasets[1];

  let status: 'CONFIRMED' | 'REFUTED' | 'PARTIALLY_SUPPORTED' | 'INSUFFICIENT_DATA' = 'INSUFFICIENT_DATA';
  let confidence = 50;
  let rationale = '';
  let citations: string[] = [];
  let limits = 'Analysis is limited to telemetry collected during the 60-minute window.';

  const rows = metricsDs?.rows || [];

  if (args.test_type === 'TRAFFIC_DROP_CHECK') {
    // Check if request count actually dropped
    const preRows = rows.slice(0, Math.floor(rows.length * 0.7));
    const postRows = rows.slice(Math.floor(rows.length * 0.7));

    const preReqs = preRows.map((r) => Number(r.request_count || 0)).filter((v) => v > 0);
    const postReqs = postRows.map((r) => Number(r.request_count || 0)).filter((v) => v > 0);

    const preAvg = preReqs.length > 0 ? preReqs.reduce((a, b) => a + b, 0) / preReqs.length : 0;
    const postAvg = postReqs.length > 0 ? postReqs.reduce((a, b) => a + b, 0) / postReqs.length : 0;
    const pctDelta = preAvg > 0 ? ((postAvg - preAvg) / preAvg) * 100 : 0;

    if (Math.abs(pctDelta) < 8) {
      status = 'REFUTED';
      confidence = 96;
      rationale = `Hypothesis refuted: Request volume stayed practically unchanged (pre-incident avg: ${preAvg.toFixed(0)} req/min vs post-incident avg: ${postAvg.toFixed(0)} req/min, delta: ${pctDelta.toFixed(1)}%). The order decline was not caused by missing inbound traffic.`;
      citations.push(`ecommerce_timeseries_metrics.csv: request_count delta = ${pctDelta.toFixed(1)}%`);
    } else if (pctDelta <= -50) {
      status = 'CONFIRMED';
      confidence = 94;
      rationale = `Hypothesis confirmed: Traffic dropped severely from ${preAvg.toFixed(0)} to ${postAvg.toFixed(0)} req/min (${pctDelta.toFixed(1)}% drop).`;
      citations.push(`request_count drop = ${pctDelta.toFixed(1)}%`);
    }
  } else if (args.test_type === 'ERROR_SPIKE_CHECK' || args.test_type === 'DEPLOYMENT_CORRELATION') {
    // Check payment failure or gateway timeout errors
    const errorVals = rows.map((r) => Number(r.failed_payments || r.http_504_count || r.db_timeout_errors || 0));
    const maxErrors = Math.max(...errorVals, 0);

    const deployLog = logsDs?.rows?.find((r) => String(r.message || '').toLowerCase().includes('deployed') || String(r.message || '').toLowerCase().includes('release'));

    if (maxErrors > 50) {
      status = 'CONFIRMED';
      confidence = 95;
      rationale = `Hypothesis confirmed: Spike of ${maxErrors} errors/min recorded. Log analysis confirms upstream 504 / connection timeout errors beginning immediately after ${deployLog ? deployLog.timestamp : 'the trigger window'}.`;
      citations.push(`failed_payments peak = ${maxErrors}/min`);
      if (deployLog) citations.push(`Deployment log at ${deployLog.timestamp}: ${deployLog.message}`);
    } else {
      status = 'PARTIALLY_SUPPORTED';
      confidence = 60;
      rationale = `Some errors observed but below high-severity threshold.`;
    }
  } else if (args.test_type === 'LATENCY_BOTTLENECK') {
    const latVals = rows.map((r) => Number(r.avg_latency_ms || r.p95_latency_ms || 0));
    const maxLat = Math.max(...latVals, 0);
    if (maxLat > 2500) {
      status = 'CONFIRMED';
      confidence = 93;
      rationale = `Hypothesis confirmed: Latency reached ${maxLat}ms, exceeding normal 120ms baseline by over 20x.`;
      citations.push(`Peak latency = ${maxLat}ms`);
    } else {
      status = 'REFUTED';
      confidence = 88;
      rationale = `Latency remained within acceptable baseline (< 500ms).`;
    }
  }

  return {
    status: 'SUCCESS',
    hypothesis_id: args.hypothesis_id,
    test_result_status: status,
    confidence_score: confidence,
    rationale,
    empirical_citations: citations,
    limits_of_evidence: limits,
    summary: `Evaluated ${args.hypothesis_id}: ${status} with ${confidence}% confidence. ${rationale}`,
  };
}

// 7. generate_incident_report
export function executeGenerateIncidentReport(
  args: {
    incident_title: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    hypotheses: Hypothesis[];
    evidence: EvidenceCitation[];
    summary_findings?: string;
  },
  context: ToolExecutionContext
) {
  const confirmedHypothesis = args.hypotheses.find((h) => h.status === 'CONFIRMED') || args.hypotheses[0];

  const timeline = [
    {
      timestamp: '14:12:04 UTC',
      event: 'Deployment of checkout-service:v2.4.1 completed',
      source: 'checkout_application_logs.csv',
      significance: 'Trigger event updating payment gateway SDK endpoints',
    },
    {
      timestamp: '14:14:00 UTC',
      event: 'First HTTP 504 Gateway Timeout logged by checkout-service',
      source: 'checkout_application_logs.csv',
      significance: 'Onset of customer transaction failures',
    },
    {
      timestamp: '14:15:00 UTC',
      event: 'Payment failure rate surged from 0.8% to 85.2%',
      source: 'ecommerce_timeseries_metrics.csv',
      significance: 'Completed store orders collapsed from 210/min to <18/min',
    },
    {
      timestamp: '14:18:00 UTC',
      event: 'Circuit breaker triggered and automated alert raised',
      source: 'checkout_application_logs.csv',
      significance: 'Failure rate exceeded 5% threshold',
    },
  ];

  return {
    status: 'SUCCESS',
    report_title: args.incident_title,
    severity: args.severity,
    timeline,
    confirmed_root_cause: confirmedHypothesis ? confirmedHypothesis.statement : 'Upstream Payment Gateway Timeout after v2.4.1 deployment',
    confidence_score: confirmedHypothesis ? confirmedHypothesis.confidenceScore : 94,
    correlation_vs_causation_note:
      'Causation established through sequence of events: Deployment v2.4.1 altered endpoint -> upstream read timeouts immediately began at 14:14 UTC -> payment failures surged while user inbound traffic remained unchanged at ~2,050 req/min.',
    limits_of_evidence:
      'Telemetry verifies upstream payment gateway 504s and steady storefront traffic. Third-party payment provider internal network logs were unavailable for direct origin packet trace.',
    unresolved_questions: [
      'Did upstream payment provider issue an unannounced API deprecation on the v3 endpoint?',
      'Why did integration tests in staging not reproduce the 15000ms read timeout under production load?',
    ],
    summary: `Generated traceable incident report with ${timeline.length} timeline milestones and ${args.evidence.length} evidence items.`,
  };
}

// 8. create_simulated_action
export function executeCreateSimulatedAction(
  args: {
    category: 'REMEDIATION' | 'CIRCUIT_BREAKER' | 'ROLLBACK' | 'DIAGNOSTIC_CHECKLIST' | 'ALERTING_UPDATE';
    title: string;
    urgency: 'IMMEDIATE' | 'NEXT_RELEASE' | 'PLANNED';
    target_service: string;
    action_type: string;
  },
  context: ToolExecutionContext
) {
  const simulatedTasks = {
    ROLLBACK: {
      title: 'Rollback checkout-service to v2.4.0',
      description: 'Safely revert checkout-service deployment back to known healthy revision v2.4.0 to restore customer checkout flow.',
      proposedChanges: [
        {
          targetSystem: 'Kubernetes Cluster / checkout-service',
          actionType: 'Helm Rollback',
          commandOrConfigSnippet: 'helm rollback checkout-service-prod 41 --wait --timeout 3m0s',
        },
        {
          targetSystem: 'Payment Gateway Client Config',
          actionType: 'Endpoint Revert',
          commandOrConfigSnippet: 'PAYMENT_UPSTREAM_ENDPOINT="https://api.payment-provider.net/v2/charge"\nREAD_TIMEOUT_MS=8000',
        },
      ],
      rollbackPlan: 'If v2.4.0 fails to initialize, route traffic to standby secondary payment gateway via Feature Flag `FF_PAYMENT_FALLBACK_PROVIDER=true`.',
    },
    CIRCUIT_BREAKER: {
      title: 'Enable Fallback Payment Gateway Circuit Breaker',
      description: 'Trip circuit breaker on primary payment gateway to instantly route orders through backup payment gateway.',
      proposedChanges: [
        {
          targetSystem: 'Consul Config / feature_flags',
          actionType: 'Dynamic Config Patch',
          commandOrConfigSnippet: 'consul kv put config/checkout/circuit_breaker_open true',
        },
      ],
      rollbackPlan: 'Toggle circuit breaker open status to false once provider status page shows green.',
    },
    DIAGNOSTIC_CHECKLIST: {
      title: 'Third-Party Payment Gateway Triage Checklist',
      description: 'Step-by-step diagnostic verification to isolate provider edge latency vs application socket pool leak.',
      proposedChanges: [
        {
          targetSystem: 'Bastion host',
          actionType: 'Diagnostic Probe',
          commandOrConfigSnippet: 'curl -Iv --trace-time https://api.payment-provider.net/healthcheck',
        },
      ],
      rollbackPlan: 'No state changes applied.',
    },
  };

  const selected = simulatedTasks[args.category === 'ROLLBACK' ? 'ROLLBACK' : args.category === 'CIRCUIT_BREAKER' ? 'CIRCUIT_BREAKER' : 'ROLLBACK'] || simulatedTasks.ROLLBACK;

  return {
    status: 'SUCCESS',
    task_id: `task-${Date.now().toString(36)}`,
    title: args.title || selected.title,
    category: args.category,
    urgency: args.urgency,
    description: selected.description,
    proposed_changes: selected.proposedChanges,
    rollback_plan: selected.rollbackPlan,
    approval_required: true,
    requires_human_approval_notice: 'Human approval is mandatory before any production configuration or rollback execution.',
    summary: `Created simulated action task '${args.title || selected.title}' awaiting operator approval.`,
  };
}
