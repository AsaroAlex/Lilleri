import { readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { assessEconomics, finapiBenchmarkCents, formatEuroCents } from './economics.mjs'

async function main() {
  const args = process.argv.slice(2)
  let scenarioUrl = new URL('./scenario.json', import.meta.url)
  let json = false
  const seen = new Set()
  for (const arg of args) {
    const key = arg.split('=')[0]
    if (seen.has(key)) throw new Error('Duplicate argument')
    seen.add(key)
    if (arg === '--json') json = true
    else if (arg.startsWith('--scenario=') && arg.slice(11)) scenarioUrl = resolve(arg.slice(11))
    else throw new Error('Use --json and/or --scenario=/path/to/scenario.json')
  }
  if (!(await stat(scenarioUrl)).isFile() || (await stat(scenarioUrl)).size > 65_536)
    throw new Error('Scenario must be a JSON file no larger than 64 KiB')
  const [policy, scenario] = await Promise.all([
    readFile(new URL('./policy.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(scenarioUrl, 'utf8').then(JSON.parse),
  ])
  const report = assessEconomics(scenario, policy)
  if (json) console.log(JSON.stringify(report, null, 2))
  else {
    const euro = formatEuroCents
    console.log('Lilleri: piano a investimento iniziale zero')
    console.log(
      'Gratis permanente; demo locale sintetica; banche, checkout e AI esterna disattivati.',
    )
    console.log(`Netto ipotetico per pagamento mensile: ${euro(report.monthlyNetReceiptCents)}`)
    console.log(`Netto ipotetico per pagamento annuale: ${euro(report.annualNetReceiptCents)}`)
    console.log(`Ricavo netto mensile riconosciuto: ${euro(report.monthlyNetRevenueCents)}`)
    console.log(`Contributo dopo la banca: ${euro(report.monthlyContributionAfterBankCents)}`)
    console.log(
      `Cassa disponibile dopo gli obblighi: ${euro(report.cashAvailableAfterObligationsCents)}`,
    )
    console.log(
      `Copertura richiesta (${report.cashCoverageMonths} mesi): ${euro(report.cashRequiredCents)}`,
    )
    console.log(`Espansione bancaria: ${report.bankExpansion}`)
    for (const reason of report.reasons) console.log(`- ${reason}`)
    console.log('Costi da quantificare:')
    for (const cost of report.unknownCosts) console.log(`- ${cost}`)
    console.log('Benchmark finAPI ex IVA, un paese, senza extra; non è un preventivo italiano:')
    for (const users of [200, 1_000, 10_000, 50_000, 100_000])
      console.log(`${users} utenti: ${euro(finapiBenchmarkCents(users).totalCents)}/mese`)
    console.log('Questo calcolo non incassa, non acquista e non attiva servizi.')
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
