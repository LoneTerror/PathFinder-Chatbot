// server.js
const fetch = require("node-fetch");
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// --- CONFIGURATION ---
const MAIN_BACKEND_URL = "https://backend.revvote.site/graphql";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PORT = process.env.PORT || 3000;

// --- INITIALIZATION ---
if (!GEMINI_API_KEY) {
  console.error("Error: Gemini API key not found in environment variables.");
  process.exit(1);
}
const app = express();
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- SYSTEM PROMPTS ---
const ENGLISH_SYSTEM_PROMPT = `You are PathFinderBot, a helpful and expert assistant. Your primary goal is to provide clear, accurate, and concise solutions to user questions in English. Structure your answers for maximum readability. Use markdown formatting. If the user provides a vague, conversational prompt like 'what's up' or 'tell me more', respond casually and prompt them for a specific question.`;

const HINGLISH_SYSTEM_PROMPT = `Aap PathFinderBot hain, ek bohot helpful aur expert assistant. Aapka kaam hai ki aap users ke sawaalon ka saaf, sateek, aur sankshipt jawaab Hinglish (Hindi written in English script) mein dein. Apne jawaab ko aasaani se padhne laayak banayein. Markdown formatting ka istemaal karein. Agar user koi aam baat kare jaise 'aur btao' ya 'kya haal hai', toh casually jawaab dein aur poochein ki woh kis baare mein jaanana chahte hain.`;

// NEW: Language detection helper function
async function detectLanguage(text) {
  try {
    const detectionPrompt = `
        You are an expert language identifier. Given the following text, identify if it's primarily English or Hinglish.
        Respond with only a single word: 'English' or 'Hinglish'.

 ---
 EXAMPLES:
 Text: "how to learn python"
 Language: English

 Text: "cricket match kab hai"
 Language: Hinglish

 Text: "aur btao"
 Language: Hinglish
 ---

 TASK:
 Text: "${text}"
 Language:
 `;
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
    });
    const result = await model.generateContent(detectionPrompt);
    const response = await result.response;
    const language = response.text().trim().toLowerCase();
    console.log(`Detected language: ${language}`);
    if (language.includes("hinglish")) {
      return "hinglish";
    }
    return "english";
  } catch (e) {
    console.error(`Language detection failed: ${e}`);
    return "english"; // Default to English on any failure
  }
}

// --- API ENDPOINT (UPDATED) ---
app.post("/chat", async (req, res) => {
  try {
    const { userId, prompt } = req.body;

    if (!userId || !prompt) {
      return res.status(400).json({ error: "userId and prompt are required" });
    } // 1. Make a GraphQL query to the main backend to get chat history
    const historyQuery = `
 query ChatMessages($userId: ID!) {
  chatMessages(userId: $userId) {
   sender
   text
  }
 }
 `;

    const historyResponse = await fetch(MAIN_BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: historyQuery,
        variables: { userId },
      }),
    });
    const historyData = await historyResponse.json();

    // *** NEW ERROR HANDLING ***
    if (historyData.errors) {
      console.error(
        "GraphQL History Query Failed:",
        JSON.stringify(historyData.errors, null, 2)
      );
      return res
        .status(500)
        .json({ error: "Failed to fetch chat history from main backend." });
    }

    const history = historyData.data.chatMessages || [];
    const geminiHistory = history.map((msg) => ({
      role: msg.sender,
      parts: [{ text: msg.text }],
    })); // 2. Detect the language from the user's prompt

    const language = await detectLanguage(prompt); // 3. Select the appropriate system prompt

    const activeSystemPrompt =
      language === "hinglish" ? HINGLISH_SYSTEM_PROMPT : ENGLISH_SYSTEM_PROMPT; // 4. Initialize the main model with the selected prompt and history
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      systemInstruction: activeSystemPrompt,
    });

    const chat = model.startChat({ history: geminiHistory });

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    const text = response.text(); // 5. Make a GraphQL mutation to the main backend to save the new messages

    const saveMessagesMutation = `
mutation SaveChatMessages($userId: ID!, $messages: [ChatMessageInput!]!) {
  saveChatMessages(userId: $userId, messages: $messages)
 }
`;

    const mutationResponse = await fetch(MAIN_BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: saveMessagesMutation,
        variables: {
          userId,
          messages: [
            { sender: "user", text: prompt },
            { sender: "model", text: text },
          ],
        },
      }),
    });
    const mutationData = await mutationResponse.json();
    console.log("Messages saved:", mutationData);

    res.json({ response: text });
  } catch (error) {
    console.error("Error in /chat endpoint:", error);
    res.status(500).json({ error: "Failed to get response from AI" });
  }
});

// --- RUN THE SERVER ---
app.listen(PORT, () => {
  console.log(
    `Server is running on https://chatbot.revvote.site on PORT=${PORT} 🚀`
  );
});
