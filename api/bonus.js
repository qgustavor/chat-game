import crypto from 'crypto'
import fetch from 'node-fetch'
import auth from 'tweetnacl-auth'
import getGoogleHeaders from '../api-libs/google-client'
import { databaseRoot, userAuthKey, bonusApiRoot, websiteOrigin, serverKey } from '../../config'

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

  let result = await handleBonus({
    user: req.body.user,
    ticket: req.body.ticket
  }).catch(e => {
    console.error(e)
    return false
  })

  if (typeof result !== 'object') {
    result = { ok: result }
  }

  res.status(200).json(result)
}

async function handleBonus ({ user, ticket }) {
  if (!user || !ticket) return false

  const [id, hmac] = user.split('.')
  if (!id || !hmac) return false

  const expectedHmac = crypto.createHmac('sha3-224', userAuthKey).update(id).digest()
  const isUserValid = crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), expectedHmac)
  if (!isUserValid) return false

  const ticketBuffer = Buffer.from(ticket, 'base64')
  const verifier = auth(ticketBuffer.slice(0, 8), serverKey).slice(0, 8)
  const isTicketValid = crypto.timingSafeEqual(ticketBuffer.slice(8), verifier)
  if (!isTicketValid) return false

  const googleHeaders = await getGoogleHeaders()

  const ticketInfoURL = databaseRoot + 'tickets/' + ticket + '.json'
  const ticketInfo = await fetch(ticketInfoURL, {
    headers: googleHeaders
  }).then(e => e.json())
  if (!ticketInfo) return false

  const prefix = 'user_'
  const prefixedId = prefix + id
  if (ticketInfo[prefixedId]) {
    return { ok: false, detail: 'already-have' }
  }

  const maxRedeems = ticketInfo.limit
  if (maxRedeems) {
    const redeemCount = Object.keys(ticketInfo)
      .filter(e => e.startsWith(prefix))
      .length
    if (redeemCount >= maxRedeems) return false
  }

  const value = ticketBuffer.readUInt16BE(0)
  if (value > 0) {
    const bonusURL = bonusApiRoot + '&user_token=' + user + '&value=' + value
    const bonusResult = await fetch(bonusURL).then(e => e.json())
    if (!bonusResult.ok) return false
  }

  const ticketStoreURL = databaseRoot + 'tickets/' + ticket + '/' + prefixedId + '.json'
  const storeResult = await fetch(ticketStoreURL, {
    method: 'PUT',
    body: JSON.stringify(new Date()),
    headers: googleHeaders
  })

  return !!storeResult.ok
}
