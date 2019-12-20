import fetch from 'node-fetch'
import getGoogleHeaders from '../api-libs/google-client'
import { databaseRoot } from '../../config'

export default async (req, res) => {
  const data = await fetch(databaseRoot + '.json', {
    headers: await getGoogleHeaders()
  }).then(e => e.json())

  const flagIds = Object.keys(data.flagNames)
  const flags = Object.values(data.flagNames)

  const levelIds = Object.keys(data.levelNames)
  const levels = Object.values(data.levelNames)

  const tickets = Object.values(data.tickets)
  const users = data.users && Object.entries(data.users).reduce((sum, [id, { visited, tickets }]) => {
    sum[id] = {
      visited: visited ? visited.map(e => levelIds.indexOf(e)) : [],
      tickets: tickets ? tickets.map(e => flagIds.indexOf(e)) : []
    }
    return sum
  }, {})

  res.status(200).json({ tickets, flags, levels, users })
}
