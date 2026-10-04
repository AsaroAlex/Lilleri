import { describe, expect, test } from 'vitest'
import { consentRecoveryFromEvidence } from '../src/consent-history-gap.js'

const events = [
  {
    action: 'granted',
    occurredAt: '2026-01-01T00:00:00.000Z',
    authorization: { consentExpiresAt: '2026-03-28T23:00:00.000Z' },
  },
  {
    action: 'renewed',
    occurredAt: '2026-04-04T09:00:00.000Z',
    authorization: { consentExpiresAt: '2026-10-01T00:00:00.000Z' },
  },
]
const job = {
  id: 'complete',
  state: 'completed',
  completedAt: '2026-04-04T12:00:00.000Z',
  requestedFrom: '2026-04-01',
  requestedTo: '2026-04-04',
  report: {
    coverage: 'complete_requested_interval',
    historyFrom: '2026-04-01',
    balances: [{ accountId: 'a' }],
  },
}
describe('late consent renewal coverage evidence', () => {
  test('uses profile calendar across DST and discloses exact bank interval only after completed coverage', () => {
    expect(consentRecoveryFromEvidence(events, [job], 'Europe/Rome', ['a'])).toEqual({
      interruptedAt: events[0]?.authorization.consentExpiresAt,
      renewedAt: events[1]?.occurredAt,
      status: 'bank_gap',
      intervals: [{ from: '2026-03-29', to: '2026-03-31' }],
      evidenceJobIds: ['complete'],
    })
    expect(
      consentRecoveryFromEvidence(
        events,
        [{ ...job, requestedFrom: '2026-03-29' }],
        'Europe/Rome',
        ['a'],
      )?.status,
    ).toBe('covered')
  })
  test('unknown or partial evidence does not invent dates and aggregate multi-account history stays unknown', () => {
    for (const incomplete of [
      { ...job, state: 'partial' },
      { ...job, report: { ...job.report, coverage: 'unknown' } },
      { ...job, requestedFrom: null, report: { ...job.report, historyFrom: null } },
    ]) {
      expect(consentRecoveryFromEvidence(events, [incomplete], 'Europe/Rome', ['a'])).toMatchObject(
        {
          status: 'unverified',
          intervals: [],
        },
      )
    }
    expect(
      consentRecoveryFromEvidence(events, [{ ...job, requestedFrom: null }], 'Europe/Rome', [
        'a',
        'b',
      ]),
    ).toMatchObject({ status: 'unverified', intervals: [] })
    expect(
      consentRecoveryFromEvidence(events, [{ ...job, requestedFrom: null }], 'Europe/Rome', ['a'])
        ?.status,
    ).toBe('bank_gap')
  })
  test('unions completed windows and keeps two exact unrecovered intervals without claiming imported rows prove completeness', () => {
    expect(
      consentRecoveryFromEvidence(
        events,
        [{ ...job, requestedFrom: '2026-03-31', requestedTo: '2026-04-01' }],
        'Europe/Rome',
        ['a'],
      )?.intervals,
    ).toEqual([
      { from: '2026-03-29', to: '2026-03-30' },
      { from: '2026-04-02', to: '2026-04-04' },
    ])
    expect(
      consentRecoveryFromEvidence(
        events,
        [job, { ...job, id: 'catchup', requestedFrom: '2026-03-29', requestedTo: '2026-03-31' }],
        'Europe/Rome',
        ['a'],
      )?.status,
    ).toBe('covered')
  })
  test('on-time renewal and older completed jobs prove no late-renewal gap', () => {
    expect(
      consentRecoveryFromEvidence(
        events.map((event) =>
          event.action === 'renewed' ? { ...event, occurredAt: '2026-03-28T12:00:00.000Z' } : event,
        ),
        [job],
        'Europe/Rome',
        ['a'],
      ),
    ).toBeNull()
    expect(
      consentRecoveryFromEvidence(
        events,
        [{ ...job, completedAt: '2026-03-28T12:00:00.000Z' }],
        'Europe/Rome',
        ['a'],
      ),
    ).toMatchObject({ status: 'unverified', evidenceJobIds: [] })
  })
})
