import util from 'util'
import { google } from 'googleapis'
import serviceAccount from './auth.json'

const scopes = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/firebase.database'
]

const jwtClient = new google.auth.JWT(
  serviceAccount.client_email,
  null,
  serviceAccount.private_key,
  scopes
)

const authorize = util.promisify(jwtClient.authorize.bind(jwtClient))

export default async function () {
  const tokens = await authorize()
  const accessToken = tokens.access_token
  if (!accessToken) throw Error('Missing access token')

  return {
    'content-type': 'application/json',
    authorization: `Bearer ${accessToken}`
  }
}
