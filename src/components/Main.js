import m from 'mithril'
import { isLoading, isFinished, messages, initHandler, sendMessage } from '../utils/message-handler'
import { processString } from '../utils/'
import { appMessages } from '../../config'

let currentInput = ''
function handleInput (e) {
  currentInput = e.target.value
}

function handleSubmit (e) {
  e.preventDefault()
  sendMessage(currentInput)
  currentInput = ''
}

function handleArrow (e) {
  if (e.key === 'ArrowUp') {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].self) {
        currentInput = messages[i].content
        break
      }
    }
  }
}

function keepScrollDown (vnode) {
  vnode.dom.scrollTop = vnode.dom.scrollHeight
}

function renderMessage (e) {
  const lines = e.content.split('\n')
  const selector = '.message.' +
    (e.self ? 'message__self' : 'message__reply') +
    (e.old ? '.message__old' : '')

  return m(selector, { key: e.id },
    lines.map(line => m('div', e.self ? line : lineRenderer(line)))
  )
}

const lineRenderer = processString([{
  regex: /\[([^\]]+)\]/g,
  fn: matches => m('a.message__command[href="#"]', {
    onclick: (e) => {
      e.preventDefault()
      if (!isLoading) sendMessage(matches[1])
      currentInput = ''
    }
  }, matches[1])
}, {
  regex: /https?:\/\/(?:\w+\.)?imgur.com\/(\w*)+(?:\.\w{3,4})?/g,
  fn: matches => m('a', {
    href: matches[0],
    target: '_blank',
    rel: 'noopener noreferrer'
  }, m('img', {
    src: 'https://i.imgur.com/' + matches[1] + 't.png'
  }))
}, {
  regex: /https?:\/\/\S+/g,
  fn: matches => m('a', {
    href: matches[0],
    target: '_blank'
  }, matches[0])
}, {
  regex: /(\*\*|__)(.*?)\1/g,
  fn: matches => m('strong', matches[2])
}, {
  regex: /(\*|_)(.*?)\1/g,
  fn: matches => m('em', matches[2])
}])

function setFocus (vnode) {
  if (isLoading || isFinished) return
  vnode.dom.focus()
}

let isOpening, isClosed

export default {
  oninit: () => {
    isOpening = true
    isClosed = false
    initHandler()
  },
  view: (vnode) => {
    return m('.main' + (isClosed ? '.main__close' : isOpening ? '.main__opening' : ''), {
      onanimationend: () => {
        if (isClosed) vnode.attrs.onclose(isFinished)
        isOpening = false
      }
    },
    m('form.main__window', {
      onsubmit: handleSubmit
    },
    m('.main__messages', {
      onupdate: keepScrollDown
    },
    messages.map(renderMessage),
    isLoading && m('.message.message__loading', '…')
    ),
    m('input.main__input', {
      placeholder: isLoading ? appMessages.wait
        : isFinished ? appMessages.gameEnd
          : appMessages.placeholder
      oninput: handleInput,
      onkeydown: handleArrow,
      value: currentInput,
      disabled: isLoading,
      readonly: isFinished,
      onupdate: setFocus,
      onclick: () => {
        if (isFinished) isClosed = true
      }
    })
    ),
    m('.main__ghost', {
      onclick: () => {
        isClosed = true
      }
    })
    )
  }
}
