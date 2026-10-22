import {
  booleanField,
  integerField,
  jsonCodeField,
  stringField,
  timestampField,
} from './fields.ts';

export function telemetryFields() {
  return [
    timestampField('received_at', { label: 'Server receipt time' }),
    integerField('analytics_version', { label: 'Analytics version' }),
    stringField('environment', { label: 'Environment' }),
    stringField('request_id', { label: 'Browser request ID' }),
    stringField('journey_id', { label: 'Journey ID' }),
  ];
}
export function diagnosticFields() {
  return [
    integerField('provider_duration_ms', { label: 'Provider duration (ms)' }),
    integerField('validation_duration_ms', { label: 'Validation duration (ms)' }),
    stringField('validation_status', { label: 'Validation status' }),
    jsonCodeField('evidence_references', { label: 'Accepted evidence references' }),
    booleanField('analytics_excluded', { label: 'Excluded from journey analytics' }, false),
  ];
}
