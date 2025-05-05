/**
 * Chat storage utility for persisting conversations
 */

const STORAGE_KEY = 'diby_chat_history';

/**
 * Get all saved conversations from local storage
 * @returns {Array} Array of conversation objects
 */
export const getSavedConversations = () => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) return [];
    
    return JSON.parse(storedData);
  } catch (error) {
    console.error('Error retrieving chat history:', error);
    return [];
  }
};

/**
 * Save a conversation to local storage
 * @param {Object} conversation - Conversation to save
 */
export const saveConversation = (conversation) => {
  try {
    const conversations = getSavedConversations();
    
    // Check if conversation already exists and update it
    const existingIndex = conversations.findIndex(c => c.id === conversation.id);
    
    if (existingIndex >= 0) {
      conversations[existingIndex] = conversation;
    } else {
      conversations.push(conversation);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (error) {
    console.error('Error saving conversation:', error);
  }
};

/**
 * Get a specific conversation by ID
 * @param {string} id - Conversation ID
 * @returns {Object|null} Conversation object or null if not found
 */
export const getConversationById = (id) => {
  const conversations = getSavedConversations();
  return conversations.find(c => c.id === id) || null;
};

/**
 * Delete a conversation by ID
 * @param {string} id - Conversation ID
 * @returns {boolean} Success status
 */
export const deleteConversation = (id) => {
  try {
    const conversations = getSavedConversations();
    const filteredConversations = conversations.filter(c => c.id !== id);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredConversations));
    return true;
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return false;
  }
};

export default {
  getSavedConversations,
  saveConversation,
  getConversationById,
  deleteConversation
}; 