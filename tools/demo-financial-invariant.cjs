/** Economic invariants for real browser proofs while the synthetic bank refreshes its freshness. */
const assert = require('node:assert/strict')
const ordered = (values) => [...values].sort((first, second) => first.id.localeCompare(second.id))

function financialSnapshot(value, includeAnalysis = false) {
  return {
    accounts: ordered(value.accounts.map(({ balanceUpdatedAt: _freshness, ...facts }) => facts)),
    transactions: ordered(value.transactions),
    ...(includeAnalysis ? { analysis: value.analysis } : {}),
  }
}

function assertFinancialUnchanged(before, after, report, includeAnalysis = false) {
  assert.deepEqual(
    financialSnapshot(after, includeAnalysis),
    financialSnapshot(before, includeAnalysis),
  )
  const refreshable = new Set(
    before.connections.filter((row) => row.providerId === 'mock-italian').map((row) => row.id),
  )
  const previous = new Map(before.accounts.map((row) => [row.id, row]))
  let updates = 0
  for (const account of after.accounts) {
    const original = previous.get(account.id)
    assert.ok(original, 'Every financial account remains owned and present')
    const first = Date.parse(original.balanceUpdatedAt),
      last = Date.parse(account.balanceUpdatedAt)
    assert.ok(
      Number.isFinite(first) && Number.isFinite(last) && last >= first && last <= Date.now(),
    )
    if (account.balanceUpdatedAt !== original.balanceUpdatedAt) {
      assert.ok(refreshable.has(account.connectionId), 'Local account timestamps remain unchanged')
      updates++
    }
  }
  report.accountFreshnessUpdates = Math.max(report.accountFreshnessUpdates || 0, updates)
}

module.exports = { financialSnapshot, assertFinancialUnchanged }
