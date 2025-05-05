import { useState, useEffect, useRef } from "react";
import ChatMessage from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";
import { apiConfig } from "./config/api";
import { getSavedConversations, saveConversation, getConversationById } from "./utils/chatStorage";
import "./index.css";
import "./App.css";

// Format a date for display in the sidebar
const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Today: Show time
  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  // Yesterday: Show "Yesterday"
  else if (diffDays === 1) {
    return 'Yesterday';
  }
  // Within last 7 days: Show day name
  else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  // Older: Show date
  else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

function App() {
  const [messages, setMessages] = useState([
    {
      text: "👋 Welcome to Diby Chat Assistant! I'm here to help with your programming and development questions.",
      isUser: false,
    },
    {
      text: "I can assist with coding challenges, explain concepts, and provide examples across various languages and frameworks. For instance, here's a React button component:\n\n```jsx\nfunction Button({ onClick, children, variant = 'primary' }) {\n  return (\n    <button \n      className={`btn btn-${variant}`} \n      onClick={onClick}\n    >\n      {children}\n    </button>\n  );\n}\n\nexport default Button;\n```\n\nFeel free to ask about:\n• JavaScript, HTML, CSS, TypeScript\n• React, Angular, Vue, Node.js\n• Algorithms and data structures\n• Best practices and code optimization\n• Debugging and troubleshooting\n\nWhat coding question can I help you with today?",
      isUser: false,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [conversations, setConversations] = useState([
    { id: 'current', title: 'Current Chat', isActive: true },
  ]);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [fullResponse, setFullResponse] = useState('');
  const typingSpeedRef = useRef(30); // ms per character

  // Load saved conversations on initial load
  useEffect(() => {
    const savedConversations = getSavedConversations();
    if (savedConversations.length > 0) {
      // Add current conversation if it doesn't exist
      if (!savedConversations.find(conv => conv.id === 'current')) {
        savedConversations.unshift({ 
          id: 'current', 
          title: 'Current Chat', 
          isActive: true,
          messages: [...messages]
        });
      } else {
        // Make sure current conversation is active
        savedConversations.forEach(conv => {
          conv.isActive = conv.id === 'current';
        });
      }
      
      setConversations(savedConversations);
    } else {
      // Initialize with current conversation
      saveConversation({ 
        id: 'current', 
        title: 'Current Chat', 
        isActive: true,
        messages: [...messages]
      });
    }
  }, []);

  // Save messages when they change
  useEffect(() => {
    // Only save if we have at least one message
    if (messages.length > 0) {
      const activeConversation = conversations.find(conv => conv.isActive);
      if (activeConversation) {
        saveConversation({
          ...activeConversation,
          messages: [...messages],
          lastUpdated: new Date().toISOString()
        });
      }
    }
  }, [messages, conversations]);

  // Close sidebar on mobile devices by default
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      }
    };

    // Set initial state
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // iOS Safari viewport height fix
  useEffect(() => {
    const setVhProperty = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    // Set on initial load
    setVhProperty();
    
    // Update on resize
    window.addEventListener('resize', setVhProperty);
    
    // Cleanup
    return () => window.removeEventListener('resize', setVhProperty);
  }, []);

  // Handle scroll event to detect user scrolling and show/hide scroll-to-top button
  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    if (!messagesContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
      
      // Check if user has scrolled up enough to show the button
      setShowScrollToTop(scrollTop < scrollHeight - clientHeight - 50);
      
      // Detect if user is scrolling up
      if (scrollTop < scrollHeight - clientHeight - 10) {
        setIsUserScrolling(true);
      } else {
        // User has scrolled to the bottom
        setIsUserScrolling(false);
      }
    };

    messagesContainer.addEventListener('scroll', handleScroll);
    return () => messagesContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // Modified auto-scroll behavior that respects user scrolling
  useEffect(() => {
    if (!isUserScrolling && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isUserScrolling]);

  // Reset user scrolling when starting a new chat
  useEffect(() => {
    if (messages.length <= 2) { // Initial state or new chat
      setIsUserScrolling(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages.length]);

  // Effect for the typing animation
  useEffect(() => {
    if (!fullResponse || !isTyping) return;
    
    let displayedLength = currentResponse.length;
    const totalLength = fullResponse.length;
    
    if (displayedLength >= totalLength) {
      setIsTyping(false);
      return;
    }
    
    // Calculate typing speed based on response length
    // Longer responses type faster
    const baseSpeed = 30; // ms
    const speed = fullResponse.length > 500 ? 5 : 
                 fullResponse.length > 200 ? 10 : 
                 fullResponse.length > 100 ? 20 : baseSpeed;
    typingSpeedRef.current = speed;
    
    // Add the next character
    const timer = setTimeout(() => {
      // Add 1-3 characters at a time for a more natural effect
      const charsToAdd = Math.floor(Math.random() * 3) + 1;
      const newDisplayedLength = Math.min(displayedLength + charsToAdd, totalLength);
      setCurrentResponse(fullResponse.substring(0, newDisplayedLength));
    }, typingSpeedRef.current);
    
    return () => clearTimeout(timer);
  }, [fullResponse, currentResponse, isTyping]);

  const scrollToTop = () => {
    messagesContainerRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const scrollToBottom = () => {
    setIsUserScrolling(false);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async (messageText) => {
    // Add user message to chat
    const userMessage = { text: messageText, isUser: true };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    // Reset scrolling state to ensure auto-scroll to the latest message
    setIsUserScrolling(false);

    // Set loading state
    setIsLoading(true);

    try {
      // Call Cohere API
      const response = await callCohereAPI(messageText);
      
      // Start typing animation
      setFullResponse(response);
      setCurrentResponse('');
      setIsTyping(true);
      
      // Add empty AI message that will be filled with the typing animation
      const aiMessage = { text: '', isUser: false, isTyping: true };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
      
    } catch (error) {
      console.error("Error in API call:", error);
      // Add error message
      const errorMessage = {
        text: "Sorry, I encountered an error. Please try again later.",
        isUser: false,
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      // Clear loading state
      setIsLoading(false);
    }
  };

  // Update the latest message with the current typing text
  useEffect(() => {
    if (isTyping && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // Only update if the last message is from the AI and is typing
      if (!lastMessage.isUser && lastMessage.isTyping) {
        setMessages(prevMessages => {
          const updatedMessages = [...prevMessages];
          updatedMessages[updatedMessages.length - 1] = {
            ...lastMessage,
            text: currentResponse
          };
          return updatedMessages;
        });
      }
    }
  }, [currentResponse, isTyping]);
  
  // When typing is done, remove the isTyping flag
  useEffect(() => {
    if (!isTyping && fullResponse && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // Only update if the last message is from the AI and was typing
      if (!lastMessage.isUser && lastMessage.isTyping) {
        setMessages(prevMessages => {
          const updatedMessages = [...prevMessages];
          updatedMessages[updatedMessages.length - 1] = {
            ...lastMessage,
            text: fullResponse,
            isTyping: false
          };
          return updatedMessages;
        });
        
        // Reset the full response
        setFullResponse('');
      }
    }
  }, [isTyping, fullResponse]);

  const callCohereAPI = async (messageText) => {
    try {
      // Get API settings from config
      const { apiKey, apiUrl, model } = apiConfig.cohere;
      
      // Get current conversation messages for context
      // Take the last 10 messages or fewer to avoid token limits
      const contextMessages = messages
        .slice(-10) // Get last 10 messages
        .map(msg => ({
          role: msg.isUser ? "user" : "assistant",
          content: msg.text
        }));
      
      // Add the current message
      const allMessages = [
        ...contextMessages,
        {
          role: "user", 
          content: messageText
        }
      ];
      
      // Call Cohere API with exact payload format specified
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "stream": false,
          "model": model,
          "messages": allMessages
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Response Error:", errorText);
        return `I'm sorry, there was an error communicating with the AI service (${response.status}). Please try again later.`;
      }

      const result = await response.json();
      console.log("API Response:", result);
      
      // Process the Cohere API response
      if (result.message && result.message.content && result.message.content.length > 0) {
        // Get the text content from the first message
        const text = result.message.content[0].text;
        return text;
      }
      
      return "I couldn't generate a proper response. Please try again with a different question.";
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  };

  const selectConversation = (id) => {
    // Update active conversation
    setConversations(prevConversations => {
      return prevConversations.map(conv => ({
        ...conv, 
        isActive: conv.id === id
      }));
    });
    
    // Load conversation messages if they exist
    const conversation = getConversationById(id);
    if (conversation && conversation.messages) {
      setMessages(conversation.messages);
    } else if (id !== 'current') {
      // For new conversations, reset to welcome message
      setMessages([
        {
          text: "👋 Welcome to a new conversation! How can I help you today?",
          isUser: false,
        }
      ]);
    }
    
    // Reset user scrolling state for new conversation
    setIsUserScrolling(false);
  };

  const startNewChat = () => {
    // Create a new conversation with timestamp-based ID
    const newId = `chat-${Date.now()}`;
    const newConversation = { 
      id: newId, 
      title: 'New Chat', 
      isActive: true,
      messages: [
        {
          text: "👋 Welcome to Diby Chat Assistant! I'm here to help with your programming and development questions.",
          isUser: false,
        }
      ],
      createdAt: new Date().toISOString()
    };
    
    // Update conversations list
    setConversations(prevConversations => {
      return prevConversations.map(conv => ({...conv, isActive: false}))
        .concat([newConversation]);
    });
    
    // Set initial messages
    setMessages(newConversation.messages);
    
    // Save the new conversation
    saveConversation(newConversation);
    
    // Reset user scrolling state for new chat
    setIsUserScrolling(false);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebarOnMobile = () => {
    // Close sidebar when clicking on the overlay (mobile only)
    const isMobile = window.innerWidth <= 768;
    if (isMobile && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  };

  // Rename a conversation
  const renameConversation = (id, newTitle) => {
    setConversations(prevConversations => {
      const updatedConversations = prevConversations.map(conv => {
        if (conv.id === id) {
          const updated = { ...conv, title: newTitle };
          // Save the updated conversation
          saveConversation(updated);
          return updated;
        }
        return conv;
      });
      return updatedConversations;
    });
  };

  // Get a conversation title based on content
  const generateConversationTitle = (messages) => {
    // Find first user message that's not empty
    const firstUserMessage = messages.find(msg => msg.isUser && msg.text.trim().length > 0);
    
    if (firstUserMessage) {
      // Get first 30 characters of the message
      const title = firstUserMessage.text.trim().substring(0, 30);
      // Add ellipsis if truncated
      return title.length < firstUserMessage.text.trim().length ? `${title}...` : title;
    }
    
    return 'New Conversation';
  };

  // Auto-rename new conversations based on first user message
  useEffect(() => {
    const activeConversation = conversations.find(conv => conv.isActive);
    
    // Only auto-rename if the title is "New Chat" and we have user messages
    if (activeConversation && 
        activeConversation.title === 'New Chat' && 
        messages.some(msg => msg.isUser)) {
      
      const suggestedTitle = generateConversationTitle(messages);
      renameConversation(activeConversation.id, suggestedTitle);
    }
  }, [messages]);

  return (
    <div className="app-container">
      <div className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button className="new-chat-button" onClick={startNewChat}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Chat
          </button>
        </div>
        <div className="sidebar-content">
          <div className="conversations-list">
            {conversations
              .sort((a, b) => {
                // Sort by lastUpdated date (most recent first)
                const dateA = a.lastUpdated ? new Date(a.lastUpdated) : new Date(0);
                const dateB = b.lastUpdated ? new Date(b.lastUpdated) : new Date(0);
                return dateB - dateA;
              })
              .map(conversation => (
              <div 
                key={conversation.id} 
                className={`conversation-item ${conversation.isActive ? 'active' : ''}`}
                onClick={() => selectConversation(conversation.id)}
              >
                <div className="conversation-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <div className="conversation-details">
                  <div className="conversation-title">{conversation.title}</div>
                  {conversation.lastUpdated && (
                    <div className="conversation-date">{formatDate(conversation.lastUpdated)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <a href="https://dibyadarshi.netlify.app" target="_blank" rel="noopener noreferrer" className="homepage-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            Visit Dibyadarshi's Homepage
          </a>
        </div>
      </div>

      <div className="chat-app" onClick={closeSidebarOnMobile}>
        <div className="header-with-toggle">
          <button className="toggle-sidebar-button" onClick={toggleSidebar}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <header className="chat-header">
            <h1>Diby Chat Assistant</h1>
            <p className="header-subtitle">Powered by Cohere AI</p>
          </header>
        </div>

        <div className="chat-container">
          <div className="messages-container" ref={messagesContainerRef}>
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            {isLoading && (
              <div className="message ai-message">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} /> {/* Empty div for auto-scrolling */}
          </div>

          {/* Scroll to top button */}
          <button 
            className={`scroll-to-top ${showScrollToTop ? 'visible' : ''}`} 
            onClick={scrollToTop}
            aria-label="Scroll to top"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"></line>
              <polyline points="5 12 12 5 19 12"></polyline>
            </svg>
          </button>

          {/* New scroll to bottom button that appears when user has scrolled up */}
          {isUserScrolling && (
            <button 
              className="scroll-to-top visible" 
              onClick={scrollToBottom}
              aria-label="Scroll to bottom"
              style={{ bottom: "30px" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
              </svg>
            </button>
          )}

          <ChatInput onSendMessage={sendMessage} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}

export default App;
