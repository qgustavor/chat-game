export const appMessages = {
  wait: 'Wait...',
  gameEnd: 'Lost connection',
  placeholder: 'Write a message'
}

export const databaseRoot = 'https://example.firebaseio.com/'
export const apiRoot = 'https://example.now.sh/api/'
export const tokenApiRoot = 'https://example.com/game/api/get-token'
export const bonusApiRoot = 'https://example.com/game/api/bonus'
export const sourceURL = 'https://example.com/game/source.md'
export const websiteOrigin = 'https://example.com'

export const lsKey = 'game'
export const cacheVersion = 1

// Use openssl rand -hex 16 to generate new keys
export const serverKey = Buffer.from('', 'hex')
export const userAuthKey = ''
