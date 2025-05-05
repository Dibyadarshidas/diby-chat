import React, { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

function ChatMessage({ message }) {
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  // Update window width when resizing
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  // Format regular text with markdown-like syntax
  const formatTextWithMarkdown = (text) => {
    // Process bold text (**text** or __text__)
    text = text.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
    
    // Process italic text (*text* or _text_)
    text = text.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
    
    // Process headings (### Heading)
    text = text.replace(/^###\s+(.*)$/gm, '<h3>$1</h3>');
    text = text.replace(/^##\s+(.*)$/gm, '<h2>$1</h2>');
    text = text.replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');
    
    // Process bullet lists
    text = text.replace(/^[•-]\s+(.*)$/gm, '<li>$1</li>');
    
    // Process numbered lists
    text = text.replace(/^\d+\.\s+(.*)$/gm, '<li>$1</li>');
    
    // Wrap lists in ul/ol tags (simple approach)
    if (text.includes('<li>')) {
      let inList = false;
      const lines = text.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('<li>') && !inList) {
          lines[i] = '<ul>' + lines[i];
          inList = true;
        } else if (!lines[i].includes('<li>') && inList) {
          lines[i-1] = lines[i-1] + '</ul>';
          inList = false;
        }
      }
      
      // Close list if it's still open at the end
      if (inList) {
        lines[lines.length-1] = lines[lines.length-1] + '</ul>';
      }
      
      text = lines.join('\n');
    }
    
    return text;
  };
  
  // Function to format message text with code blocks
  const formatMessage = (text) => {
    // Check if the text contains code blocks
    if (!text.includes('```')) {
      // Format regular text with markdown-like syntax
      const formattedText = formatTextWithMarkdown(text);
      
      // Split by newlines and create paragraph elements
      return formattedText.split('\n').map((line, index) => {
        if (line.trim() === '') {
          return <br key={index} />;
        } else if (line.startsWith('<h1>')) {
          return <h1 key={index} dangerouslySetInnerHTML={{ __html: line.replace(/<h1>|<\/h1>/g, '') }} />;
        } else if (line.startsWith('<h2>')) {
          return <h2 key={index} dangerouslySetInnerHTML={{ __html: line.replace(/<h2>|<\/h2>/g, '') }} />;
        } else if (line.startsWith('<h3>')) {
          return <h3 key={index} dangerouslySetInnerHTML={{ __html: line.replace(/<h3>|<\/h3>/g, '') }} />;
        } else if (line.startsWith('<ul>')) {
          return <ul key={index} dangerouslySetInnerHTML={{ __html: line.replace(/<ul>|<\/ul>/g, '') }} />;
        } else {
          return <p key={index} dangerouslySetInnerHTML={{ __html: line }} />;
        }
      });
    }

    const segments = [];
    let currentIndex = 0;
    let codeBlockStart = text.indexOf('```', currentIndex);
    let codeBlockCount = 0;

    while (codeBlockStart !== -1) {
      // Add text before code block - split by newlines for proper formatting
      if (codeBlockStart > currentIndex) {
        const textBeforeCodeBlock = text.substring(currentIndex, codeBlockStart);
        const formattedText = formatTextWithMarkdown(textBeforeCodeBlock);
        
        formattedText.split('\n').forEach((line, idx) => {
          if (line.trim() === '') {
            segments.push(<br key={`br-${currentIndex}-${idx}`} />);
          } else if (line.startsWith('<h1>')) {
            segments.push(<h1 key={`h1-${currentIndex}-${idx}`} dangerouslySetInnerHTML={{ __html: line.replace(/<h1>|<\/h1>/g, '') }} />);
          } else if (line.startsWith('<h2>')) {
            segments.push(<h2 key={`h2-${currentIndex}-${idx}`} dangerouslySetInnerHTML={{ __html: line.replace(/<h2>|<\/h2>/g, '') }} />);
          } else if (line.startsWith('<h3>')) {
            segments.push(<h3 key={`h3-${currentIndex}-${idx}`} dangerouslySetInnerHTML={{ __html: line.replace(/<h3>|<\/h3>/g, '') }} />);
          } else if (line.startsWith('<ul>')) {
            segments.push(<ul key={`ul-${currentIndex}-${idx}`} dangerouslySetInnerHTML={{ __html: line.replace(/<ul>|<\/ul>/g, '') }} />);
          } else {
            segments.push(<p key={`text-${currentIndex}-${idx}`} dangerouslySetInnerHTML={{ __html: line }} />);
          }
        });
      }

      // Find the end of the code block
      const codeBlockEnd = text.indexOf('```', codeBlockStart + 3);
      if (codeBlockEnd === -1) break;

      // Extract language and code
      const codeContent = text.substring(codeBlockStart + 3, codeBlockEnd);
      let language = 'javascript'; // Default language
      let code = codeContent;

      // Check if a language is specified
      const firstLineBreak = codeContent.indexOf('\n');
      if (firstLineBreak > 0) {
        const potentialLang = codeContent.substring(0, firstLineBreak).trim();
        if (potentialLang && !potentialLang.includes(' ')) {
          language = potentialLang;
          code = codeContent.substring(firstLineBreak + 1);
        }
      }

      const currentBlockIndex = codeBlockCount++;
      const codeToHighlight = code.trim();

      // Add the code block with syntax highlighting
      segments.push(
        <div className="code-block-container" key={`code-${codeBlockStart}`}>
          <div className="code-block-header">
            <span>{language}</span>
            <button 
              className="copy-button"
              onClick={() => copyToClipboard(codeToHighlight, currentBlockIndex)}
              aria-label="Copy code"
            >
              {copiedIndex === currentBlockIndex ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <SyntaxHighlighter 
            language={language} 
            style={atomDark}
            wrapLines={true}
            wrapLongLines={true}
            customStyle={{ 
              margin: 0, 
              borderRadius: '0 0 8px 8px', 
              maxHeight: '400px', 
              overflow: 'auto',
              fontSize: windowWidth <= 480 ? '12px' : '14px'
            }}
          >
            {codeToHighlight}
          </SyntaxHighlighter>
        </div>
      );

      currentIndex = codeBlockEnd + 3;
      codeBlockStart = text.indexOf('```', currentIndex);
    }

    // Add any remaining text - split by newlines for proper formatting
    if (currentIndex < text.length) {
      const remainingText = text.substring(currentIndex);
      const formattedText = formatTextWithMarkdown(remainingText);
      
      formattedText.split('\n').forEach((line, idx) => {
        if (line.trim() === '') {
          segments.push(<br key={`br-end-${idx}`} />);
        } else if (line.startsWith('<h1>')) {
          segments.push(<h1 key={`h1-end-${idx}`} dangerouslySetInnerHTML={{ __html: line.replace(/<h1>|<\/h1>/g, '') }} />);
        } else if (line.startsWith('<h2>')) {
          segments.push(<h2 key={`h2-end-${idx}`} dangerouslySetInnerHTML={{ __html: line.replace(/<h2>|<\/h2>/g, '') }} />);
        } else if (line.startsWith('<h3>')) {
          segments.push(<h3 key={`h3-end-${idx}`} dangerouslySetInnerHTML={{ __html: line.replace(/<h3>|<\/h3>/g, '') }} />);
        } else if (line.startsWith('<ul>')) {
          segments.push(<ul key={`ul-end-${idx}`} dangerouslySetInnerHTML={{ __html: line.replace(/<ul>|<\/ul>/g, '') }} />);
        } else {
          segments.push(<p key={`text-end-${idx}`} dangerouslySetInnerHTML={{ __html: line }} />);
        }
      });
    }

    return segments;
  };

  return (
    <div className={`message ${message.isUser ? 'user-message' : 'ai-message'}`}>
      {!message.isUser && (
        <div className="avatar ai-avatar">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </div>
      )}
      <div className="message-content">
        <div className="message-text">
          {formatMessage(message.text)}
          {!message.isUser && message.isTyping && (
            <span className="typing-cursor"></span>
          )}
        </div>
        <span className="message-time">{timestamp}</span>
      </div>
      {message.isUser && (
        <div className="avatar user-avatar">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
      )}
    </div>
  );
}

export default ChatMessage;