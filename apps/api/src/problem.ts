export class Problem extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    detail: string,
  ) {
    super(detail)
    this.name = 'Problem'
  }
}
export const notFound = () =>
  new Problem(404, 'not_found', 'La risorsa richiesta non è disponibile.')
export const conflict = (detail = 'Il movimento è cambiato. Aggiorna la pagina e riprova.') =>
  new Problem(409, 'conflict', detail)
export const providerFailure = () =>
  new Problem(
    502,
    'provider_unavailable',
    'La fonte dimostrativa non è disponibile. I dati salvati sono al sicuro; riprova.',
  )
