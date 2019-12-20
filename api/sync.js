import crypto from 'crypto'
import fetch from 'node-fetch'
import getGoogleHeaders from '../api-libs/google-client'
import { databaseRoot, userAuthKey, websiteOrigin } from '../../config'

export default async (req, res) => {
  if (req.headers.origin === websiteOrigin) {
    res.setHeader('Access-Control-Allow-Origin', websiteOrigin)
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  }
  if (req.method === 'OPTIONS') {
    return res.status(204).send('')
  }
  if (req.method !== 'POST' || typeof req.body !== 'object') {
    return res.status(400).send('Invalid request')
  }

  let result = await handleSync(req.body)
  let data

  if (result) {
    data = result
    result = true
  }

  res.status(200).json({ ok: result, data })
}

function expectArray (input) {
  return Array.isArray(input) ? input : []
}

function mergeAndNormalizeArrays (a, b) {
  return Array.from(new Set(a.concat(b)))
    .filter(e => typeof e === 'string' && e.length < 16)
}

async function handleSync ({ user, data }) {
  const [id, hmac] = user.split('.')
  if (!id || !hmac) return false

  const expectedHmac = crypto.createHmac('sha3-224', userAuthKey).update(id).digest()
  const isUserValid = crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), expectedHmac)
  if (!isUserValid) return false

  const googleHeaders = await getGoogleHeaders()

  const storeURL = databaseRoot + '/users/' + id + '.json'
  const existentDataQuery = await fetch(storeURL, {
    headers: googleHeaders
  }).then(e => e.json())
  const existentData = existentDataQuery.result || {}

  const existentVisited = expectArray(existentData.visited)
  const existentTickets = expectArray(existentData.tickets)

  const newVisited = expectArray(data.visited)
  const newTickets = expectArray(data.tickets)

  const visited = mergeAndNormalizeArrays(existentVisited, newVisited)
  const tickets = mergeAndNormalizeArrays(existentTickets, newTickets)

  const finalData = { visited, tickets }

  const storeResult = await fetch(storeURL, {
    method: 'PUT',
    body: JSON.stringify(finalData),
    headers: googleHeaders
  })

  if (!storeResult.ok) return false
  return finalData
}
