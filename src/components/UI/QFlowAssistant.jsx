import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { request } from '@/lib/api'
import './QFlowAssistant.css'

export default function QFlowAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi there! I am your QFLOW Assistant. How can I help you today?' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (e) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      const data = await request('/chat', {
        method: 'POST',
        body: JSON.stringify({ message: userMessage })
      })

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      console.error('Chatbot error:', err)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error while processing your request.' }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="qflow-assistant-wrapper">
      {/* Chat Window */}
      {isOpen && (
        <div className="qflow-assistant-window">
          <div className="qflow-assistant-header">
            <div className="qflow-assistant-brand">
              <img src="/qflow_logo_transparent.png" alt="QFLOW Logo" className="qflow-assistant-logo" />
              <span>Ask Your QFLOW Assistant</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="qflow-assistant-close">
              <X size={18} />
            </button>
          </div>

          <div className="qflow-assistant-messages">
            {messages.map((msg, idx) => (
              <div 
                key={idx}
                className={`qflow-message-bubble ${msg.role === 'user' ? 'user' : 'assistant'} ${msg.role === 'assistant' ? 'markdown-body text-sm' : ''}`}
              >
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="qflow-message-bubble assistant loading">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="qflow-assistant-input-area" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Type your question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" disabled={!input.trim() || isLoading}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      {/* Floating Action Button */}
      {!isOpen && (
        <button
          className="qflow-assistant-fab"
          onClick={() => setIsOpen(true)}
          title="Ask Your QFLOW Assistant"
        >
          <img src="/qflow_logo_transparent.png" alt="QFLOW Logo" className="fab-logo" />
        </button>
      )}
    </div>
  )
}
