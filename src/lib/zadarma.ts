import crypto from 'crypto'

const USER_KEY = process.env.ZADARMA_USER_KEY!
const SECRET_KEY = process.env.ZADARMA_SECRET_KEY!
const BASE_URL = 'https://api.zadarma.com/v1'

/**
 * Genera la firma HMAC-SHA1 requerida por Zadarma.
 * Algoritmo: base64( HMAC-SHA1( SECRET_KEY, method + queryString + MD5(queryString) ) )
 */
export function buildZadarmaSignature(method: string, params: Record<string, string>): string {
  // Ordenar parámetros alfabéticamente
  const sorted = Object.keys(params)
    .sort()
    .reduce((acc, k) => ({ ...acc, [k]: params[k] }), {} as Record<string, string>)

  const queryString = new URLSearchParams(sorted).toString()
  const hashMd5 = crypto.createHash('md5').update(queryString).digest('hex')

  const sign = crypto
    .createHmac('sha1', SECRET_KEY)
    .update(method + queryString + hashMd5)
    .digest('base64')

  return sign
}

/**
 * Realiza una petición autenticada a la API de Zadarma.
 */
export async function zadarmaRequest(
  method: string,
  params: Record<string, string> = {},
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'
): Promise<Record<string, unknown>> {
  const sign = buildZadarmaSignature(method, params)
  const queryString = new URLSearchParams(params).toString()

  const headers: Record<string, string> = {
    Authorization: `${USER_KEY}:${sign}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  }

  const url =
    httpMethod === 'GET'
      ? `${BASE_URL}${method}?${queryString}`
      : `${BASE_URL}${method}`

  const response = await fetch(url, {
    method: httpMethod,
    headers,
    body: httpMethod !== 'GET' ? queryString : undefined,
  })

  if (!response.ok) {
    let body = ''
    try { body = await response.text() } catch { /* ignore */ }
    throw new Error(`Zadarma API error: ${response.status} ${response.statusText} — ${body}`)
  }

  return response.json()
}

/**
 * Verifica la firma del webhook enviado por Zadarma.
 * Zadarma envía el header "sign" con el body del POST.
 */
export function verifyZadarmaWebhook(
  params: Record<string, string>,
  signature: string
): boolean {
  // Excluir el campo "sign" del body antes de recalcular
  const { sign: _sign, ...rest } = params

  const sorted = Object.keys(rest)
    .sort()
    .reduce((acc, k) => ({ ...acc, [k]: rest[k] }), {} as Record<string, string>)

  const queryString = new URLSearchParams(sorted).toString()
  const hashMd5 = crypto.createHash('md5').update(queryString).digest('hex')

  const expectedSign = crypto
    .createHmac('sha1', SECRET_KEY)
    .update(queryString + hashMd5)
    .digest('base64')

  // Diagnóstico temporal: loguear firma calculada vs recibida para verificar algoritmo
  if (expectedSign !== signature) {
    console.warn('[Zadarma Webhook] Signature mismatch', {
      expected: expectedSign,
      received: signature,
      queryString,
      hashMd5,
      paramKeys: Object.keys(sorted),
    })
  }

  return expectedSign === signature
}
