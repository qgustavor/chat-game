import fetch from 'node-fetch'
import { sourceURL } from '../../config'

export default function getData () {
  return fetch(sourceURL).then(e => e.text())
}
