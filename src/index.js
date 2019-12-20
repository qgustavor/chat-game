import m from 'mithril'
import Container from './components/Container'

function init () {
  const root = document.createElement('div')
  root.className = 'game'
  document.body.appendChild(root)

  m.mount(root, Container)
}

function ready (fn) {
  if (document.readyState !== 'loading') {
    fn()
  } else {
    document.addEventListener('DOMContentLoaded', fn)
  }
}

ready(init)
