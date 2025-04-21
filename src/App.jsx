import { useState, useEffect, useRef } from "react";
import ChatMessage from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";
import "./index.css";
import "./App.css";

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
    { id: 'previous1', title: 'Previous Chat 1', isActive: false },
    { id: 'previous2', title: 'Previous Chat 2', isActive: false },
    { id: 'previous3', title: 'React Component Help', isActive: false },
  ]);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

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
      // Get API response
      let response;
      
      try {
        // First try the Hugging Face API
        response = await callHuggingFaceAPI(messageText);
      } catch (huggingFaceError) {
        console.error("Hugging Face API failed:", huggingFaceError);
        
        try {
          // Then try the fallback API
          response = await callFallbackAPI(messageText);
        } catch (fallbackError) {
          console.error("Fallback API failed:", fallbackError);
          
          // Finally, try the direct generation API
          response = await callDirectGenerationAPI();
        }
      }

      // Add AI response to chat
      const aiMessage = { text: response, isUser: false };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error("Error in all API attempts:", error);
      // Add error message
      const errorMessage = {
        text: "Sorry, I encountered an error with all available services. Please try again later.",
        isUser: false,
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      // Clear loading state
      setIsLoading(false);
    }
  };

  const callHuggingFaceAPI = async (messageText) => {
    // Using TinyLlama model as suggested
    const API_URL =
      "https://api-inference.huggingface.co/models/TinyLlama/TinyLlama-1.1B-Chat-v1.0";
    const API_KEY = import.meta.env.VITE_HUGGING_FACE_API_KEY; // Use environment variable

    try {
      // Format the prompt for TinyLlama chat model with focus on code questions
      const prompt = `<|system|>
You are a coding assistant created by Dibyadarshi. You only answer questions related to programming, software development, web technologies, and technical topics. 
For non-coding questions, politely explain that you're designed to help specifically with development and coding topics.
You have expertise in HTML, CSS, JavaScript, React, and other web technologies.
Be concise and helpful in your explanations, and provide code examples when appropriate.<|endoftext|>
<|user|>
${messageText}<|endoftext|>
<|assistant|>`;
      
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 250,
            temperature: 0.7,
            top_p: 0.95,
            do_sample: true,
            return_full_text: false
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Response Error:", errorText);
        
        // Check for specific error messages
        if (errorText.includes("Model is loading")) {
          return "The TinyLlama model is currently loading. This might take a few seconds for the first request. Please try again in a moment.";
        } else if (errorText.includes("too large to be loaded")) {
          // Try a fallback model if the current one is too large
          return await callFallbackAPI(messageText);
        }
        
        return `I'm sorry, there was an error communicating with the AI service (${response.status}). Please try again later.`;
      }

      const result = await response.json();

      if (result.error) {
        console.error("API Response Error:", result.error);
        return `Sorry, there was an error: ${result.error}`;
      }

      if (Array.isArray(result) && result.length > 0 && result[0].generated_text) {
        let text = result[0].generated_text.trim();
        
        // Clean up the TinyLlama format markers if present
        text = text.replace(/<\|assistant\|>/g, "");
        text = text.replace(/<\|endoftext\|>/g, "");
        text = text.replace(/<\|user\|>/g, "");
        text = text.replace(/<\|system\|>/g, "");
        
        return text;
      }

      return "I couldn't generate a proper response. Please try again with a different question.";
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  };

  // Fallback to an even smaller model
  const callFallbackAPI = async (messageText) => {
    // Use a very small model as fallback
    const API_URL =
      "https://api-inference.huggingface.co/models/distilgpt2";
    const API_KEY = import.meta.env.VITE_HUGGING_FACE_API_KEY; // Use environment variable

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: `Question: ${messageText}\nAnswer:`,
          parameters: {
            max_length: 100,
            temperature: 0.7,
            return_full_text: false
          }
        }),
      });

      if (!response.ok) {
        return "I'm sorry, all our AI models are currently busy. Please try again in a few moments.";
      }

      const result = await response.json();
      
      if (result.generated_text) {
        return result.generated_text.trim();
      }
      
      return "I couldn't process that request. Please try another question.";
    } catch (error) {
      console.error("Fallback API Error:", error);
      return "Sorry, I'm having trouble connecting to my AI services right now. Please try again later.";
    }
  };

  // Direct text generation API (most reliable, but simple)
  const callDirectGenerationAPI = async () => {
    try {
      // Use a basic text completion API (random quotes and facts service as fallback)
      const response = await fetch("https://api.quotable.io/random");
      
      if (!response.ok) {
        return "I apologize, but all our AI services are currently unavailable. Here's a creative response instead: The best way to predict the future is to create it.";
      }
      
      const data = await response.json();
      return `I apologize, but our AI chat models are currently unavailable. Here's a quote instead:\n\n"${data.content}"\n\n— ${data.author}`;
    } catch (error) {
      console.error("Direct Generation API Error:", error);
      return "All our services are temporarily unavailable. Please try again later.";
    }
  };

  const startNewChat = () => {
    // Update conversations list
    const newId = `chat-${Date.now()}`;
    setConversations(prevConversations => {
      return prevConversations.map(conv => ({...conv, isActive: false}))
        .concat([{ id: newId, title: 'New Chat', isActive: true }]);
    });
    
    // Clear messages
    setMessages([
      {
        text: "👋 Welcome to Diby Chat Assistant! I'm here to help with your programming and development questions.",
        isUser: false,
      }
    ]);
    
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

  const selectConversation = (id) => {
    setConversations(prevConversations => {
      return prevConversations.map(conv => ({
        ...conv, 
        isActive: conv.id === id
      }));
    });
    
    // In a real app, we would load the conversation history here
    // For this demo, we'll just reset to the initial messages
    if (id !== 'current') {
      setMessages([
        {
          text: "This is a previous conversation. In a real app, we would load the conversation history here.",
          isUser: false,
        }
      ]);
    }
  };

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
            {conversations.map(conversation => (
              <div 
                key={conversation.id} 
                className={`conversation-item ${conversation.isActive ? 'active' : ''}`}
                onClick={() => selectConversation(conversation.id)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                {conversation.title}
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
            <p className="header-subtitle">Powered by TinyLlama</p>
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
