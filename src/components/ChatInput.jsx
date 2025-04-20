import { useState, useRef, useEffect } from 'react';

function ChatInput({ onSendMessage, disabled }) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);
  const minRows = 1;
  const maxRows = 5;

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Reset height to calculate new height
    textarea.style.height = 'auto';
    
    // Get scroll height
    const scrollHeight = textarea.scrollHeight;
    
    // Calculate how many rows we're using
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
    const paddingTop = parseInt(getComputedStyle(textarea).paddingTop);
    const paddingBottom = parseInt(getComputedStyle(textarea).paddingBottom);
    const currentRows = Math.floor((scrollHeight - paddingTop - paddingBottom) / lineHeight);
    
    // Determine final rows (clamped between min and max)
    const rows = Math.max(minRows, Math.min(maxRows, currentRows));
    
    // Set height based on rows
    textarea.style.height = `${paddingTop + (rows * lineHeight) + paddingBottom}px`;
    
    // If content is greater than what we show, enable scrolling
    textarea.style.overflowY = currentRows > maxRows ? 'auto' : 'hidden';
  }, [message]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e) => {
    // Submit on Enter (without Shift key)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }

    // Insert tab character when Tab is pressed
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      setMessage(
        message.substring(0, start) + '  ' + message.substring(end)
      );
      // Set cursor position after the inserted tab
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  return (
    <form className="chat-input-form" onSubmit={handleSubmit}>
      <div className="chat-input-container">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a coding question... (Shift+Enter for new line)"
          disabled={disabled}
          className="chat-input"
          rows={minRows}
        />
        <button 
          type="submit" 
          disabled={disabled || !message.trim()} 
          className="send-button"
          aria-label="Send message"
        >
          {disabled ? (
            <div className="button-spinner">
              <span></span>
              <span></span>
              <span></span>
            </div>
          ) : (
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          )}
        </button>
      </div>
      <div className="chat-input-footer">
        <span className="chat-input-info">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="12" 
            height="12" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span>Shift+Enter for new line • Tab for indentation</span>
        </span>
      </div>
    </form>
  );
}

export default ChatInput;