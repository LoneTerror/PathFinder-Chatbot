# Pathfinder AI - Chatbot Backend 🚀

A simple, stateless, and scalable Node.js Express server that acts as a backend for the Pathfinder AI mobile application. This server provides a secure proxy to the Google Gemini API, handling AI chat completions.

## Features ✨

* **Simple & Lightweight:** Built with Express.js for minimal overhead.
* **Gemini API Integration:** Connects to Google's `gemini-1.5-flash-latest` model to provide fast and intelligent responses.
* **Stateless API:** A single `/chat` endpoint that processes one prompt at a time, making it easy to scale.
* **Secure:** Keeps your Google Gemini API key safe on the server, never exposing it to the client application.
* **Environment-Ready:** Uses a `.env` file for easy configuration of API keys and server ports.

---

## API Endpoint

The server exposes a single endpoint for handling chat requests.

### `POST /chat`

This endpoint receives a user's prompt and returns a text response from the Gemini AI.

#### Request Body

The client must send a JSON object with a `prompt` key.

```json
{
  "prompt": "What are the first steps to becoming a software developer?"
}
