
import { useEffect, useRef, useState } from 'react'
import './App.css'

function App() {
  const [nameInput, setNameInput] = useState('')
  const [username, setUsername] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState('disconnected')
  const [error, setError] = useState('')

  const socketRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Подключение к WebSocket
  useEffect(() => {
    if (!username) return

    let disposed = false

    const ws = new WebSocket(
      `ws://127.0.0.1:8000/ws/${encodeURIComponent(username)}`
    )

    socketRef.current = ws

    ws.onopen = () => {
      if (disposed) return

      setStatus('connected')
      setError('')
    }

    ws.onmessage = (event) => {
      if (disposed) return

      try {
        const message = JSON.parse(event.data)

        if (
          message.type === 'chat' ||
          message.type === 'system'
        ) {
          setMessages(prev => [...prev, message])
        }
      } catch {
        setError('Не удалось прочитать сообщение сервера.')
      }
    }

    ws.onerror = () => {
      if (!disposed) {
        setError('Ошибка подключения к серверу.')
      }
    }

    ws.onclose = (event) => {
      if (disposed) return

      setStatus('disconnected')
      socketRef.current = null

      if (event.code === 1008) {
        setError('Это имя уже занято или недопустимо.')
      } else {
        setError('Соединение с сервером потеряно.')
      }
    }

    return () => {
      disposed = true
      ws.close()

      if (socketRef.current === ws) {
        socketRef.current = null
      }
    }
  }, [username])

  // Прокрутка сообщений вниз
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    })
  }, [messages])

  // Вход
  function joinChat(event) {
    event.preventDefault()

    const name = nameInput.trim()

    if (!name || name.length > 24) {
      setError('Введите имя длиной от 1 до 24 символов.')
      return
    }

    setMessages([])
    setError('')
    setStatus('connecting')
    setUsername(name)
  }

  // Отправка сообщения
  function sendMessage(event) {
    event.preventDefault()

    const text = messageInput.trim()
    const ws = socketRef.current

    if (
      !text ||
      !ws ||
      ws.readyState !== WebSocket.OPEN
    ) {
      return
    }

    ws.send(JSON.stringify({
      type: 'chat',
      text: text.slice(0, 1000)
    }))

    setMessageInput('')
  }

  // Выход
  function leaveChat() {
    setUsername('')
    setMessages([])
    setMessageInput('')
    setStatus('disconnected')
    setError('')
  }

  // Формат времени
  function formatTime(timestamp) {
    if (!timestamp) return ''

    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Экран входа
  if (!username) {
    return (
      <div className="app">
        <div className="login-card decorated-card">
          <div className="flower flower-top-left" />
          <div className="flower flower-bottom-right" />

          <div className="content-layer">
            <h1>Сад бесед</h1>

            <p className="description">
              Войдите в чат и общайтесь в реальном времени.
            </p>

            <form onSubmit={joinChat}>
              <label htmlFor="username">
                Ваше имя
              </label>

              <input
                id="username"
                type="text"
                placeholder="Введите имя"
                maxLength={24}
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                autoFocus
              />

              {error && (
                <p className="error">{error}</p>
              )}

              <button
                className="primary-button"
                type="submit"
              >
                Войти в чат
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Основной экран чата
  return (
    <div className="app">
      <div className="chat-card decorated-card">

        {/* Декоративные цветы */}
        <div className="flower flower-top-right" />
        <div className="flower flower-bottom-left" />

        <div className="content-layer chat-layout">

          {/* Шапка */}
          <header className="chat-header">
            <div>
              <h1>Сад бесед</h1>

              <p className="description">
                Вы вошли как {username}
              </p>
            </div>

            <button
              className="text-button"
              onClick={leaveChat}
            >
              Выйти
            </button>
          </header>

          {/* Статус подключения */}
          <div className="connection-status" role="status">
            <img
              className="status-lotus"
              src={
                status === 'connected'
                  ? '/decor/status-lotus-online.png'
                  : '/decor/status-lotus-offline.png'
              }
              alt=""
              aria-hidden="true"
            />

            <span>
              {status === 'connected'
                ? 'В сети'
                : status === 'connecting'
                  ? 'Подключение...'
                  : 'Нет соединения'}
            </span>
          </div>

          {/* Сообщения */}
          <div className="messages">

            {messages.length === 0 && (
              <div className="empty-chat">
                Сообщений пока нет
              </div>
            )}

            {messages.map((message, index) => (
              message.type === 'system' ? (

                <div
                  className="system-message"
                  key={index}
                >
                  {message.text}
                </div>

              ) : (

                <div
                  className={`message-row ${
                    message.username === username ? 'own' : ''
                  }`}
                  key={index}
                >
                  <div className="message-content">

                    <div className="message-info">
                      <span>
                        {message.username === username
                          ? 'Вы'
                          : message.username}
                      </span>

                      <span>
                        {formatTime(message.timestamp)}
                      </span>
                    </div>

                    <div className="message-bubble">
                      {message.text}
                    </div>

                  </div>
                </div>

              )
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* Ошибки */}
          {error && (
            <p className="chat-error">
              {error}
            </p>
          )}

          {/* Поле отправки */}
          <form
            className="message-form"
            onSubmit={sendMessage}
          >
            <div className="input-shell">
              <input
                type="text"
                placeholder="Текстовое сообщение..."
                value={messageInput}
                maxLength={1000}
                onChange={e => setMessageInput(e.target.value)}
                disabled={status !== 'connected'}
              />
            </div>

            <button
              className="send-button"
              type="submit"
              disabled={
                status !== 'connected' ||
                !messageInput.trim()
              }
            >
              Отправить
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}

export default App
