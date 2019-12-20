import m from 'mithril'
import Ghost, { restartTimer } from './Ghost'
import styles from '../styles.scss'

let MainElement
async function handleStart () {
  MainElement = (await import('./Main')).default
  m.redraw()
}

function handleClose (isGameFinished) {
  MainElement = null
  restartTimer(isGameFinished)
}

export default {
  view: () => {
    return [
      m('style', styles.toString()),
      m(Ghost, {
        onclick: handleStart
      }),
      MainElement && m(MainElement, {
        onclose: handleClose
      })
    ]
  }
}
