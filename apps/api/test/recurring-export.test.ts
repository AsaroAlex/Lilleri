import { createHash } from 'node:crypto'
import type { RecurringSelector } from '@lilleri/engines'
import { recurringStableKey } from '@lilleri/engines'
import { expect, test } from 'vitest'
import { validateRecurringOwnershipExport } from '../src/recurring-export.js'

const at = '2026-10-03T12:00:00.000Z',
  selector: RecurringSelector = {
    profileId: 'p',
    accountId: 'a',
    currency: 'EUR',
    direction: 'outgoing',
    identityKind: 'legacy_merchant',
    identityValue: 'synthetic',
  }
const id = `recurring_${createHash('sha256').update(recurringStableKey(selector)).digest('hex')}`
const baseline = {
    status: 'observed' as const,
    kind: null,
    frequency: null,
    installmentCount: null,
    installmentIndex: null,
  },
  after = {
    ...baseline,
    status: 'confirmed' as const,
    kind: 'subscription' as const,
    frequency: 'monthly' as const,
  }
function fixture() {
  return {
    profile: { id: 'p' },
    accounts: [{ id: 'a', profileId: 'p' }],
    transactions: [{ id: 't', profileId: 'p', accountId: 'a' }],
    exportedAt: at,
    recurringPreferences: [
      {
        id,
        profileId: 'p',
        accountId: 'a',
        selector,
        choice: after,
        revision: 2,
        createdAt: at,
        updatedAt: at,
      },
    ],
    recurringPreferenceEvents: [
      {
        id: 'd4e6af25-82e0-453b-a58e-40be71404578',
        profileId: 'p',
        accountId: 'a',
        preferenceId: id,
        revision: 2,
        action: 'updated',
        occurredAt: at,
        snapshot: {
          before: baseline,
          after,
          evidenceTransactionIds: ['t'],
          policyVersion: 'synthetic',
        },
      },
    ],
  }
}
test('standalone ownership validation accepts legacy profile without creation clock and exact audit chain', () => {
  expect(validateRecurringOwnershipExport(fixture())).toBeDefined()
})
test.each([
  'scope',
  'identity',
  'clock',
  'revision',
  'foreign evidence',
  'choice',
  'undo',
] as const)('standalone recurring snapshot rejects %s corruption', (kind) => {
  const snapshot = fixture(),
    pref = snapshot.recurringPreferences[0],
    event = snapshot.recurringPreferenceEvents[0]
  if (!pref || !event) throw new Error('Expected synthetic fixture')
  if (kind === 'scope') pref.selector = { ...selector, profileId: 'other' }
  if (kind === 'identity') pref.id = `recurring_${'0'.repeat(64)}`
  if (kind === 'clock') event.occurredAt = '2026-10-03T12:00:01.000Z'
  if (kind === 'revision') pref.revision = 3
  if (kind === 'foreign evidence') event.snapshot.evidenceTransactionIds = ['foreign']
  if (kind === 'choice')
    pref.choice = {
      ...after,
      frequency: 'monthly',
      status: 'confirmed',
      kind: 'subscription',
      installmentCount: 1,
      installmentIndex: 2,
    } as typeof after
  if (kind === 'undo') event.action = 'undone'
  expect(() => validateRecurringOwnershipExport(snapshot)).toThrow()
})
