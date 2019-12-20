import m from 'mithril'

import { tokenApiRoot } from '../../config'
export const userInfoPromise = m.request(tokenApiRoot).catch(() => null)

export function mergeArrays (sourceA, sourceB) {
  return sourceA.concat(sourceB).filter((e, n, a) => a.indexOf(e) === n)
}

export function encodeBase64 (arr) {
  const s = []
  const len = arr.length
  for (let i = 0; i < len; i++) s.push(String.fromCharCode(arr[i]))
  return window.btoa(s.join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function decodeBase64 (s) {
  s += '=='.substr((2 - s.length * 3) & 3)
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  const d = window.atob(s)
  const b = new Uint8Array(d.length)
  for (let i = 0; i < d.length; i++) b[i] = d.charCodeAt(i)
  return b
}

export function decodeUTF8 (arr) {
  const s = []
  for (let i = 0; i < arr.length; i++) s.push(String.fromCharCode(arr[i]))
  return decodeURIComponent(escape(s.join('')))
}

export function encodeUTF8 (s) {
  const d = unescape(encodeURIComponent(s))
  const b = new Uint8Array(d.length)
  for (let i = 0; i < d.length; i++) b[i] = d.charCodeAt(i)
  return b
}

export function bufferConcat (inputs) {
  let finalLength = 0
  for (const e of inputs) finalLength += e.length
  const finalArray = new Uint8Array(finalLength)
  let position = 0
  for (const e of inputs) {
    finalArray.set(e, position)
    position += e.length
  }
  return finalArray
}

export function isBufferEqual (a, b) {
  for (let i = 0, len = a.length; i < len; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

export function normalizeInput (input) {
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

export function processString (options) {
  let key = 0

  function processInputWithRegex (option, input) {
    if (typeof input === 'string') {
      const regex = option.regex
      let result = null
      const output = []

      while ((result = regex.exec(input)) !== null) {
        const index = result.index
        const match = result[0]

        output.push(input.substring(0, index))
        output.push(option.fn(result, ++key))

        input = input.substring(index + match.length, input.length + 1)
        regex.lastIndex = 0
      }

      output.push(input)
      return output
    }

    if (Array.isArray(input)) {
      return input.map(chunk => processInputWithRegex(option, chunk))
    }

    return input
  }

  return (input) => {
    for (const option of options) {
      input = processInputWithRegex(option, input)
    }

    return input
  }
}
