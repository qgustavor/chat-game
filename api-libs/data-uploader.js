import fetch from 'node-fetch'
import getGoogleHeaders from './google-client'
import { databaseRoot } from '../../config'

export default async function uploadData (data, purge) {
  const googleHeaders = await getGoogleHeaders()
  const storedScenes = data.scenes.reduce((result, scene) => {
    const fields = {}
    if (scene.first) fields.first = scene.first
    if (scene.other) fields.other = scene.other
    if (scene.actions) fields.actions = scene.actions
    if (scene.id === 'init') fields.updated = Date.now()
    result[scene.id] = fields

    return result
  }, {})

  await fetch(databaseRoot + 'levels.json', {
    method: 'PUT',
    body: JSON.stringify(storedScenes),
    headers: googleHeaders
  }).then(handleFetchErrors)

  if (!purge) {
    const existentTickets = await fetch(databaseRoot + 'tickets.json', {
      headers: googleHeaders
    }).then(handleFetchErrors).then(e => e.json())

    for (const ticket of Object.keys(existentTickets)) {
      const ticketData = existentTickets[ticket]
      if (!data.tickets[ticket]) data.tickets[ticket] = {}
      const reddems = Object.keys(ticketData).filter(e => e.startsWith('user_'))
      for (const reddem of reddems) {
        data.tickets[ticket][reddem] = ticketData[reddem]
      }
    }
  }

  await fetch(databaseRoot + 'tickets.json', {
    method: 'PUT',
    body: JSON.stringify(data.tickets),
    headers: googleHeaders
  }).then(handleFetchErrors)

  await fetch(databaseRoot + 'levelNames.json', {
    method: 'PUT',
    body: JSON.stringify(data.levels),
    headers: googleHeaders
  }).then(handleFetchErrors)

  await fetch(databaseRoot + 'flagNames.json', {
    method: 'PUT',
    body: JSON.stringify(data.flags),
    headers: googleHeaders
  }).then(handleFetchErrors)
}

async function handleFetchErrors (response) {
  if (!response.ok) {
    const info = await response.json()
    throw Error('Error while updating Firebase: ' + JSON.stringify(info))
  }
  return response
}
