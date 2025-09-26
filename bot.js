// bot.js

const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

// Load environment variables from a .env file
dotenv.config();

// --- CONFIGURATION ---
const DISCORD_BOT_TOKEN = process.env.PATHFINDER_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// --- INITIALIZATION ---
if (!DISCORD_BOT_TOKEN || !GEMINI_API_KEY) {
    console.error("Error: Discord token or Gemini API key not found in environment variables.");
    process.exit(1);
}

// Configure Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Set up Discord bot intents
const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// --- CONTEXT & PERSONA MANAGEMENT ---
const conversationHistory = {}; // e.g., { 'userId': { persona: 'english', chat: chatSession } }

const ENGLISH_SYSTEM_PROMPT = `
You are PathFinderBot, a helpful and expert assistant on Discord. Your primary goal is to provide clear, accurate, and concise solutions to user questions.
- Structure your answers for maximum readability. Use markdown formatting like **bold text**, bullet points (using * or -), and code blocks (\`\`\`) whenever appropriate.
- Break down complex problems into simple, step-by-step instructions.
- If you don't know an answer, say so honestly.
- Maintain a polite, encouraging, and professional tone.
`;

const HINGLISH_SYSTEM_PROMPT = `
Aap PathFinderBot hain, ek bohot helpful aur expert assistant. Aapka kaam hai ki aap users ke sawaalon ka saaf, sateek, aur sankshipt jawaab dein.
- Apne jawaab ko aasaani se padhne laayak banayein. Markdown formatting jaise **bold text**, bullet points (* ya -), aur code blocks (\`\`\`) ka istemaal karein.
- Mushkil sawaalon ko aasaan, step-by-step instructions mein todein.
- Agar aapko jawaab nahi pata, toh saaf saaf bata dein.
- Hamesha ek vinamra, protsaahak, aur professional tone rakhein.
`;

const GREETING_QUOTES = [
    "Hello! How can I help you today? ✨",
    "Greetings! I'm ready to assist. What's your question?",
    "I'm here to help. What problem can we solve?",
    "Namaste! Main aapki kaise madad kar sakta hoon?",
    "Hey there! Ask me anything.",
];

async function detectLanguage(text) {
    try {
        const detectionPrompt = `
        Identify the primary language of the following text.
        Respond with only a single word: 'English' or 'Hinglish'.
        Do not add any other explanation.

        Text: "${text}"
        `;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(detectionPrompt);
        const response = await result.response;
        const language = response.text().trim().toLowerCase();
        
        console.log(`Detected language: ${language}`);
        return language;
    } catch (e) {
        console.error(`Language detection failed: ${e}`);
        return "english"; // Default to English on failure
    }
}

async function sendLongMessage(channel, text) {
    const MAX_LENGTH = 2000; // Discord's standard max length

    if (text.length <= MAX_LENGTH) {
        await channel.send(text);
        return;
    }

    const chunks = [];
    let currentChunk = "";

    // Split by lines first to preserve formatting
    const lines = text.split('\n');
    for (const line of lines) {
        if (currentChunk.length + line.length + 1 > MAX_LENGTH) {
            chunks.push(currentChunk);
            currentChunk = "";
        }
        // If a single line is too long, split it hard
        if (line.length > MAX_LENGTH) {
            for (let i = 0; i < line.length; i += MAX_LENGTH) {
                chunks.push(line.substring(i, i + MAX_LENGTH));
            }
        } else {
            currentChunk += line + '\n';
        }
    }
    // Add the last remaining chunk
    if (currentChunk) {
        chunks.push(currentChunk);
    }

    // Send each chunk as a separate message
    for (const chunk of chunks) {
        await channel.send(chunk);
    }
}


// --- DISCORD BOT EVENTS ---
discordClient.once('clientReady', () => {
    console.log(`Logged in as ${discordClient.user.tag}`);
    console.log('PathFinderBot is ready to help! 🤖');
    console.log('------');
});

discordClient.on('messageCreate', async (message) => {
    // Ignore messages from bots and messages that don't mention this bot
    if (message.author.bot || !message.mentions.has(discordClient.user)) {
        return;
    }

    const userId = message.author.id;
    // Remove the bot's mention from the message content to get the clean prompt
    const userMessageContent = message.content.replace(/<@!?\d+>/g, '').trim();

    // If there's no content after the mention, send a random greeting
    if (!userMessageContent) {
        await message.channel.send(GREETING_QUOTES[Math.floor(Math.random() * GREETING_QUOTES.length)]);
        return;
    }

    try {
        // Show a "typing..." indicator while processing
        await message.channel.sendTyping();

        const language = await detectLanguage(userMessageContent);
        
        let activeSystemPrompt;
        let personaName;

        if (language.includes('hinglish')) {
            activeSystemPrompt = HINGLISH_SYSTEM_PROMPT;
            personaName = "hinglish";
        } else {
            activeSystemPrompt = ENGLISH_SYSTEM_PROMPT;
            personaName = "english";
        }
        
        // If the user has no history or switched language, create a new chat session
        if (!conversationHistory[userId] || conversationHistory[userId].persona !== personaName) {
            console.log(`Starting new '${personaName}' chat session for user ${userId}`);
            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                systemInstruction: activeSystemPrompt,
            });
            const chatSession = model.startChat({ history: [] });
            conversationHistory[userId] = { persona: personaName, chat: chatSession };
        }
        
        const chat = conversationHistory[userId].chat;
        const result = await chat.sendMessage(userMessageContent);
        const botResponse = await result.response.text();

        await sendLongMessage(message.channel, botResponse);

    } catch (e) {
        console.error(`An error occurred in on_message: ${e}`);
        await message.channel.send("Apologies, I encountered an error. Please try your request again. 🙏");
    }
});

// --- RUN THE BOT ---
discordClient.login(DISCORD_BOT_TOKEN).catch(err => {
    console.error(`Error logging in: ${err}`);
});