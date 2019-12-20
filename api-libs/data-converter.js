import nacl from 'tweetnacl'
import auth from 'tweetnacl-auth'
import { serverKey } from '../../config'

function toBase64URL (buffer) {
  return buffer.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function normalizeInput (input) {
  return input
    // Ignore case
    .toLowerCase()
    // Ignore accents
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    // Ignore stop words
    .replace(/(^|\s+)((a|an|some|of|to|the)(\s+|$))+/g, ' ')
    // Leave just spaces and letters
    .replace(/[^\w\d\s]/g, '')
    // Remove extra spaces
    .trim().replace(/\s+/g, ' ')
}

function getIdFromName (name) {
  return Buffer.from(auth(Buffer.from(normalizeInput(name)), serverKey)).slice(0, 3)
}

const actionIds = {
  message: 0,
  goto: 1,
  bonus: 2,
  'add-flag': 3
}

function serializeActions (actions, nonce) {
  const result = []
  const tickets = {}

  for (const action of actions) {
    const actionId = actionIds[action.kind]
    let payload

    switch (action.kind) {
      case 'message':
        payload = action.content
        break
      case 'goto':
        payload = getIdFromName(action.content)
        break
      case 'bonus':
        payload = generateBonusTicket(action.content, nonce)
        tickets[toBase64URL(payload)] = action.content
        break
      case 'add-flag':
        payload = getIdFromName(action.content)
        break
    }

    const payloadBuffer = Buffer.from(payload)
    result.push(Buffer.concat([
      Buffer.from([actionId, payloadBuffer.length]),
      payloadBuffer
    ]))
  }

  return {
    result: Buffer.concat(result),
    tickets
  }
}

function generateBonusTicket (info, nonce) {
  // AA BBBBBB CCCCCCCC
  // AA       -> value
  // BBBBBB   -> ticket nonce
  // CCCCCCCC -> HMAC verifier

  const ticketNonce = auth(nonce, serverKey).slice(0, 6)
  const value = info.count
    ? info.count * (info.kind === 'bill' ? 100 : 1)
    : 0

  const payload = Buffer.alloc(16)
  payload.writeUInt16BE(value, 0)
  payload.set(ticketNonce, 2)
  const verifier = auth(payload.slice(0, 8), serverKey)
  payload.set(verifier.slice(0, 8), 8)

  return payload
}

export default function processData (scenes) {
  const processedScenes = []
  const mainScene = scenes[0]
  const tickets = {}
  const levels = {}
  const flags = {}

  for (const scene of scenes) {
    const { name, first, other, commands } = scene
    const id = scene === mainScene
      ? Buffer.from('init', 'base64')
      : getIdFromName(name)

    let segmentedCommands
    let encryptedActions

    if (commands) {
      let current
      segmentedCommands = []

      for (const command of commands) {
        const { input } = command
        current = { input, actions: [], flags: [] }
        segmentedCommands.push(current)

        for (const action of command.actions) {
          if (action.kind === 'if-flag') {
            current.flags.push(action.content)
          } else if (action.kind === 'else') {
            current = { input, actions: [], flags: [] }
            segmentedCommands.push(current)
          } else {
            current.actions.push(action)
          }
        }
      }

      const levelNonce = nacl.hash(id).slice(0, 24)
      encryptedActions = segmentedCommands.map(command => {
        const input = normalizeInput(command.input)
        const flagLenPrefix = new Uint8Array([
          command.flags.length + (input === '' ? 128 : 0)
        ])

        for (const flag of command.flags) {
          flags[toBase64URL(getIdFromName(flag))] = flag
        }

        const flagBuffers = command.flags.map(getIdFromName)
        const mergedFlags = Buffer.concat(flagBuffers)

        const flagIdentifiers = Buffer.concat(flagBuffers.map(e => {
          return auth(e, levelNonce).slice(0, 2)
        }))

        const actionNonce = nacl.randomBytes(4)
        const password = Buffer.concat([Buffer.from(input), actionNonce, mergedFlags])
        const key = auth(password, levelNonce)

        const serializedData = serializeActions(command.actions, levelNonce)
        const ciphertext = nacl.secretbox(serializedData.result, levelNonce, key)
        const storedData = Buffer.concat([
          flagLenPrefix, flagIdentifiers, actionNonce, ciphertext
        ])

        Object.assign(tickets, serializedData.tickets)

        return toBase64URL(storedData)
      })
    }

    levels[toBase64URL(id)] = name
    processedScenes.push({
      id: toBase64URL(id),
      first,
      other,
      actions: encryptedActions
    })
  }

  const haveDuplicatedId = processedScenes.find(a =>
    processedScenes.find(b => a !== b && a.id === b.id)
  )
  if (haveDuplicatedId) throw Error('duplicated scene id')

  return {
    scenes: processedScenes,
    tickets,
    levels,
    flags
  }
}
