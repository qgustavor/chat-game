import m from 'mithril'
import { mergeArrays, userInfoPromise } from './'
import { handleAction, isPassiveEvent } from './action-handler'
import { apiRoot, databaseRoot, lsKey, cacheVersion } from '../../config'

let isLoading
let isFinished
let messages
let levels
let visited
let tickets
let currentLevel
let lastSync
let lastLevelUpdate
let lastUpdateTime
let isLevelPassive
let syncSize
let messageId = 0

export async function initHandler () {
  isLoading = true
  isFinished = false
  messages = []
  levels = {}
  visited = []
  tickets = []
  currentLevel = 'init'

  const cachedState = window.localStorage[lsKey] && JSON.parse(window.localStorage[lsKey])
  if (cachedState && cachedState.version === cacheVersion) {
    levels = cachedState.levels
    visited = cachedState.visited
    tickets = cachedState.tickets
    lastSync = cachedState.lastSync
    currentLevel = cachedState.level
    lastLevelUpdate = cachedState.lastUpdate
    lastUpdateTime = cachedState.lastUpdateTime
    syncSize = cachedState.syncSize
  }

  // Handle cache expiration
  // 1: only if there is a cache
  if (lastUpdateTime) {
    const timeSinceUpdate = Date.now() - lastLevelUpdate
    // 2: only if the last update was at least one hour ago
    if (timeSinceUpdate > 3600e3) {
      const initData = await m.request(databaseRoot + 'levels/init.json')
      // 3: only if the start level data was updated
      if (initData.updated !== lastUpdateTime) {
        lastUpdateTime = initData.updated
        lastLevelUpdate = 0
        levels = {}
      }
    }
  }

  if (!lastLevelUpdate) {
    lastLevelUpdate = Date.now()
  }

  // Handle data syncing
  if (lastSync) {
    await doSync()
  } else {
    lastSync = Date.now()
  }

  await loadLevel()
}

async function doSync (forced) {
  const userInfo = await userInfoPromise
  if (!userInfo) return

  const timeSinceSync = Date.now() - lastSync
  const minSyncTime = forced ? 300e3 : 3600e3
  if (timeSinceSync < minSyncTime) return

  const currentSyncSize = visited.length + ',' + tickets.length
  if (syncSize === currentSyncSize) return
  syncSize = currentSyncSize

  const result = await m.request(apiRoot + 'sync', {
    method: 'post',
    body: {
      data: { visited, tickets },
      user: userInfo.token
    }
  }).catch(() => null)

  if (result && result.ok) {
    visited = mergeArrays(visited, result.data.visited)
    tickets = mergeArrays(tickets, result.data.tickets)
  }

  lastSync = Date.now()
}

async function loadLevel () {
  const firstLoad = !visited.includes(currentLevel)
  const levelData = await getLevelData(currentLevel)
  if (!levelData) {
    isFinished = true
    return
  }

  const message = firstLoad ? levelData.first : (levelData.other || levelData.first)
  if (message) {
    messages.push({
      content: message,
      id: messageId++
    })
  }

  isLoading = false
  isFinished = !levelData.actions
  visited.push(currentLevel)
  m.redraw()

  if (isFinished) {
    currentLevel = 'init'
    await doSync(true)
  }
  smartUpdateCache()

  isLevelPassive = isPassiveEvent(levelData)
  if (isLevelPassive) await sendMessage(null)
}

async function getLevelData (level) {
  if (levels[level]) return levels[level]

  let data
  for (let tries = 0; tries < 3; tries++) {
    data = await m.request(databaseRoot + 'levels/' + level + '.json').catch(() => null)
    if (data) break
    await new Promise(resolve => setTimeout(resolve, 3000 * Math.pow(2, tries)))
  }
  if (!data) return null

  levels[level] = data
  if (level === 'init') lastUpdateTime = data.updated

  return data
}

function updateCache () {
  window.localStorage[lsKey] = JSON.stringify({
    levels,
    visited,
    tickets,
    lastSync,
    lastUpdateTime,
    lastUpdate: lastLevelUpdate,
    version: cacheVersion,
    level: currentLevel,
    syncSize
  })
}

let updateTimeout
function smartUpdateCache () {
  if (updateTimeout) clearTimeout(updateTimeout)
  updateTimeout = setTimeout(updateCache, 1000)
}

export async function sendMessage (message) {
  if (isFinished) return

  isLoading = true
  if (message !== null) {
    messages.push({
      self: true,
      content: message,
      id: messageId++
    })
  } else {
    message = ''
  }

  const result = await handleAction(message, tickets, currentLevel, levels)
  if (result === false) {
    isFinished = true
    isLoading = false
    m.redraw()
    return
  }

  const [newMessage, nextLevel, newTickets] = result

  if (nextLevel && !isLevelPassive) {
    for (const message of messages) message.old = true
  }

  if (newMessage) {
    messages.push({
      content: newMessage,
      id: messageId++
    })
  }
  for (const ticket of newTickets) tickets.push(ticket)

  if (nextLevel) {
    currentLevel = nextLevel
    await loadLevel()
  } else {
    isLoading = false
    m.redraw()
  }

  if (messages.length > 20) {
    messages = messages.slice(-20)
  }
}

export { isLoading, isFinished, messages }
