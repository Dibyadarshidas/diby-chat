// Cohere API configuration
export const COHERE_API_KEY = import.meta.env.VITE_COHERE_API_KEY;
export const COHERE_API_URL = "https://api.cohere.com/v2/chat";
export const COHERE_MODEL = "command-a-03-2025";

// API configuration object
export const apiConfig = {
  cohere: {
    apiKey: COHERE_API_KEY,
    apiUrl: COHERE_API_URL,
    model: COHERE_MODEL
  }
};

export default apiConfig; 