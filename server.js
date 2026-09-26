// HobbyFlow AI backend
// Keeps GROQ_API_KEY on the server, never in the browser.
const http = require("http");
const fs = require("fs");
const path = require("path");

try { require("dotenv").config(); } catch (_) {}

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

function send(res, status, body, type="application/json") {
  res.writeHead(status, {"Content-Type": type, "Cache-Control":"no-store"});
  res.end(type === "application/json" ? JSON.stringify(body) : body);
}

function systemPrompt(context) {
  return `You are HobbyFlow AI Coach, a friendly personal hobby-planning assistant.
Your job is to understand the user's interests and behavior and give practical, personalized hobby suggestions, schedules, goals, motivation, and progress analysis.
Use the supplied app data as context. Do not invent activity that is not present.
When suggesting a schedule, respect available evidence about preferred times and workload. Prefer realistic, small sessions when consistency is low.
Keep responses concise but useful. If the user asks for a hobby recommendation, explain why it fits their profile.
If the user asks for analysis, mention concrete numbers from the context when useful.
Do not claim that you can send real notifications or perform actions unless the app actually exposes such an action.

Current HobbyFlow data:
${JSON.stringify(context, null, 2)}`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/") {
    const file = path.join(__dirname, "hobbyflow.html");
    if (!fs.existsSync(file)) return send(res,404,"hobbyflow.html not found","text/plain");
    res.writeHead(200, {"Content-Type":"text/html; charset=utf-8"});
    return fs.createReadStream(file).pipe(res);
  }

  if (req.method === "POST" && url.pathname === "/api/chat") {
    if (!API_KEY) return send(res,500,{error:"GROQ_API_KEY is not configured. Put your key in .env."});
    let raw="";
    req.on("data", chunk => { raw += chunk; if(raw.length > 200000) req.destroy(); });
    req.on("end", async () => {
      try {
        const body=JSON.parse(raw || "{}");
        const message=String(body.message || "").slice(0,5000);
        const history=Array.isArray(body.history)?body.history.slice(-12):[];
        const context=body.context || {};
        if(!message) return send(res,400,{error:"Message is required."});

        const messages=[
          {role:"system",content:systemPrompt(context)},
          ...history.filter(m=>m && (m.role==="user" || m.role==="assistant"))
            .map(m=>({role:m.role,content:String(m.content||"").slice(0,5000)}))
        ];
        // Avoid duplicating the latest user message if the client included it in history.
        if(!messages.length || messages[messages.length-1].content !== message)
          messages.push({role:"user",content:message});

        const api=await fetch("https://api.groq.com/openai/v1/chat/completions",{
          method:"POST",
          headers:{"Authorization":`Bearer ${API_KEY}`,"Content-Type":"application/json"},
          body:JSON.stringify({
            model:MODEL,
            messages,
            temperature:0.7,
            max_completion_tokens:700
          })
        });
        const data=await api.json();
        if(!api.ok) return send(res,api.status,{error:data?.error?.message || "Groq API request failed."});
        return send(res,200,{reply:data?.choices?.[0]?.message?.content || "No response generated."});
      } catch(err) {
        return send(res,500,{error:err.message || "Server error"});
      }
    });
    return;
  }

  send(res,404,{error:"Not found"});
});

server.listen(PORT,()=>console.log(`HobbyFlow running at http://localhost:${PORT}`));
