import m from 'mithril'

let isActive = false
let clicked = false
let loopCount = 0
let posX
let posY

function handleGhostTiming () {
  isActive = true
  posX = '120vw'
  posY = Math.floor(Math.random() * 60 + 20) + 'vh'

  loopCount++
  m.redraw()

  window.requestAnimationFrame(() => {
    posX = '-256px'
    posY = Math.floor(Math.random() * 60 + 20) + 'vh'
    m.redraw()
  })
}

function handleAnimationEnd () {
  if (!isActive) return
  isActive = false
  m.redraw()
  if (!clicked) setTimeout(handleGhostTiming, 90e3 * Math.pow(2, loopCount))
}

let startHandler
function handleClick () {
  if (clicked) return
  posX = '200vw'
  posY = '200vh'
  clicked = true
  startHandler()
}

const pageURL = window.location.href
setTimeout(handleGhostTiming, 1e3)

export function restartTimer (isGameFinished) {
  clicked = false
  let time = 5e3
  if (isGameFinished) {
    loopCount = 0
  } else {
    time = 90e3 * Math.pow(2, loopCount++)
  }
  setTimeout(handleGhostTiming, time)
}

export default {
  view: (vnode) => {
    startHandler = vnode.attrs.onclick

    return m('.ghost' + (isActive ? '.ghost__active' : '') + (clicked ? '.ghost__run' : ''), {
      onclick: handleClick,
      onanimationend: handleAnimationEnd,
      style: {
        transform: `translate(${posX}, ${posY})`
      }
    })
  }
}
