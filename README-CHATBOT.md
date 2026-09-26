# HobbyFlow AI

This version adds a real Groq-powered chatbot while keeping the API key on the server.

## Setup

1. Install Node.js 18+.
2. Open a terminal in this folder.
3. Run:
   npm install
4. Copy `.env.example` to `.env`.
5. Put your Groq API key in `.env`:
   GROQ_API_KEY=your_key_here
6. Run:
   npm start
7. Open:
   http://localhost:3000

The browser talks to `/api/chat`; the server talks to Groq. The key is never included in `hobbyflow.html`.

## What the chatbot knows

The frontend sends the assistant a compact snapshot of:
- hobbies
- weekly targets
- preferred times
- goals
- completed minutes
- weekly time
- streak
- completion percentage
- completed/missed/planned sessions

It can then suggest hobbies, analyze progress, and propose realistic schedules.

## Security

Do not commit `.env` to GitHub or deploy the secret inside frontend JavaScript.
Because the API key was shared in a chat, rotate/revoke it in your Groq account before using the project publicly, then put the replacement in `.env`.
