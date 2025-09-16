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
```
Success Response (200 OK)
Upon success, the server returns a JSON object with the AI-generated response.


```JSON

{
  "response": "The first steps typically involve learning a programming language like Python or JavaScript, understanding data structures and algorithms, and building personal projects to create a portfolio."
}
```

Error Response (400/500)
If the prompt is missing or an internal server error occurs, it returns a JSON object with an error message.

```JSON

{
  "error": "Prompt is required"
}
```

# Getting Started
Follow these instructions to get a local copy up and running for development and testing purposes.

Prerequisites
`Node.js (v18 or later recommended)`

`npm` or `yarn`
- For this project we're going to be using `npm`

- A Google Gemini `API Key` from Google AI Studio: [https://aistudio.google.com/apikey]

1. Installation
   
Clone the repository:

Bash
```
git clone https://github.com/LoneTerror/PathFinder-Chatbot.git
cd PathFinder-Chatbot.git
```

2. Install NPM packages:

Bash
```
npm install
```

3. Create an environment file:
   
Create a .env file in the root of the project and add your environment variables.

Code snippet ```.env``` file,

# Your Google Gemini API Key
```GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"``` - You can get an `API Key` from Google AI studio

# The port the server will run on (optional, defaults to 3000)
```PORT=3000```

4. Usage
To run the server locally for development, use the following command:

Bash

```npm start-server```
The server will start and listen on the `port` defined in your `.env` file (or port 3000 by default). 

You'll see a confirmation message in your console:
`Server is running on [http://localhost:3000] 🚀`

