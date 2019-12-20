import nacl from 'tweetnacl'
import auth from 'tweetnacl-auth'
import m from 'mithril'

import {
  encodeBase64, decodeBase64, decodeUTF8, encodeUTF8,
  bufferConcat, isBufferEqual, normalizeInput, API_ROOT,
  userInfoPromise
} from './'

export async function handleAction (input, tickets, level, levels) {
  const messages = []
  const newTickets = []

  let nextLevel
  let matchedAction = false
  let skipBonuses

  const levelData = levels[level]
  const levelNonce = nacl.hash(decodeBase64(level)).slice(0, 24)

  const ticketIdentifiers = tickets.map(e => {
    return auth(decodeBase64(e), levelNonce).slice(0, 2)
  })

  const inputBuffer = encodeUTF8(normalizeInput(input))
  const actions = levelData.actions || []

  for (const action of actions) {
    const data = decodeBase64(action)
    const ticketCount = data[0] % 128
    if (ticketCount > tickets.length) continue

    let pointer = 1
    const requiredTickets = []
    for (let i = 0; i < ticketCount; i++) {
      const expectedId = data.slice(pointer, pointer + 2)
      const ticketIndex = ticketIdentifiers.findIndex(id => {
        return isBufferEqual(expectedId, id)
      })
      if (ticketIndex === -1) break
      requiredTickets.push(tickets[ticketIndex])
      pointer += 2
    }
    if (requiredTickets.length !== ticketCount) continue

    const noPassword = data[0] > 127
    const actionNonce = data.slice(pointer, pointer + 4)
    const inputPrefix = noPassword ? [actionNonce] : [inputBuffer, actionNonce]
    const password = bufferConcat(inputPrefix.concat(requiredTickets.map(decodeBase64)))
    const key = auth(password, levelNonce)

    const ciphertext = data.slice(pointer + 4)
    const actionData = nacl.secretbox.open(ciphertext, levelNonce, key)
    if (!actionData) continue

    matchedAction = true
    pointer = 0

    while (pointer <= actionData.length) {
      const actionKind = actionData[pointer++]
      const payloadSize = actionData[pointer++] * 256 + actionData[pointer++]
      const payload = actionData.slice(pointer, pointer += payloadSize)
      let bonusResult

      switch (actionKind) {
        case 0: // message
          messages.push(decodeUTF8(payload))
          break
        case 1: // goto
          nextLevel = encodeBase64(payload)
          break
        case 2: // bonus
          bonusResult = skipBonuses || await handleBonus(payload)
          break
        case 3: // add-flag
          newTickets.push(encodeBase64(payload))
          break
      }

      if (bonusResult === false) return false
      if (bonusResult && skipBonuses) {
        matchedAction = false
      }
      if (bonusResult && !bonusResult.ok) {
        matchedAction = false
        if (bonusResult.detail === 'already-have') {
          skipBonuses = true
        }
        break
      }
    }

    if (matchedAction) break
  }

  const message = matchedAction ? messages.join('\n') : 'Não entendi'
  return [message, nextLevel, newTickets]
}

async function handleBonus (payload) {
  const userInfo = await userInfoPromise
  if (!userInfo) return false

  let bonusResult
  for (let tries = 0; tries < 3; tries++) {
    bonusResult = await m.request(API_ROOT + 'bonus', {
      method: 'post',
      body: {
        ticket: encodeBase64(payload),
        user: userInfo.token
      }
    }).catch(() => null)

    if (bonusResult) return bonusResult
    await new Promise(resolve => setTimeout(resolve, 3000 * Math.pow(2, tries)))
  }

  return false
}

export function isPassiveEvent (level) {
  if (!level.actions) return true
  for (const action of level.actions) {
    const data = decodeBase64(action)
    if (data[0] < 128) return false
  }
  return true
}
