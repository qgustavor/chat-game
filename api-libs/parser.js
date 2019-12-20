export default function parseData (data) {
  const scenes = []

  data.replace(/\r(?!\n)/g, '\n').replace(/\r/g, '').replace(/[“”]/g, '"').split(/^# /gm).slice(1).forEach(e => {
    const parts = e.split(/\n{2}/g)
    const name = parts.shift()
    const first = !parts[0] || parts[0].startsWith('*') ? null : parts.shift()
    const other = !parts[0] || parts[0].startsWith('*') ? null : parts.shift()
    const commandsRaw = parts[0]

    const commands = commandsRaw && commandsRaw.startsWith('*') && commandsRaw
      .match(/\* (?:\[([^*\]]+)\])?(([\s\S](?!\*|\n\n))*.)/g)
      .map(e => {
        const parts = e.match(/\* (?:\[([^*\]]+)\])?(([\s\S](?!\*|\n\n))*.)/)
        if (!parts) return

        const input = (parts[1] || '').trim()
        const actions = parseAction(parts[2].trim())
        return { input, actions }
      })

    const scene = { name }
    if (first) scene.first = first
    if (other) scene.other = other
    if (commands) scene.commands = commands
    scenes.push(scene)
  })

  return scenes
}

function parseAction (action) {
  const bracketParts = action.match(/\{[^}]+\}/g) || []
  const nonBracketParts = action.split(/\{[^}]+\}/g)
  const mergedParts = nonBracketParts.reduce((sum, e, n) => {
    return sum.concat(e, bracketParts[n])
  }, []).map(e => e).filter(e => e).map(e => {
    let kind, content

    if (!e.startsWith('{')) {
      kind = 'message'
      content = e.trim()
    } else if (e.includes('else')) {
      kind = 'else'
      content = null
    } else if (e.match(/go ?to/)) {
      kind = 'goto'
      content = e.replace(/^\{|\}$/g, '').replace(/"/g, '').split(/ir pa?ra/)[1].trim()
    } else if (e.includes('add flag')) {
      kind = 'add-flag'
      content = e.replace(/^\{|\}$/g, '').replace(/"/g, '').split('ativar flag')[1].trim()
    } else if (e.includes('if have flag')) {
      kind = 'if-flag'
      content = e.replace(/^\{|\}$/g, '').replace(/"/g, '').split('se tiver flag')[1].trim()
    } else if (e.match(/(\d+) (coin|bill)s?/)) {
      kind = 'bonus'

      const tokens = e.match(/(\d+) (coin|bill)s?(?: up to (\d+) players?)?/)
      content = {
        count: Number(tokens[1]),
        kind: tokens[2],
        limit: Number(tokens[3]) || null
      }
    } else if (e.includes('give')) {
      kind = 'bonus'

      const tokens = e.match(/give "([^"]+)"(?: up to (\d+) players?)?/)
      content = {
        kind: tokens[1],
        limit: Number(tokens[2]) || 1
      }
    } else {
      throw Error(`Unrecognized action: ${e}`)
    }

    const action = { kind }
    if (content) action.content = content
    return action
  }).filter(e => e.kind !== 'message' || e.content)

  return mergedParts
}
