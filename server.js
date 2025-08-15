require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const OpenAI = require("openai");

const app = express();
const PORT = 5001;

const AZURE_API_KEY = process.env.GITHUB_TOKEN;
const MODEL_NAME = "gpt-4.1-mini";
const ENDPOINT = "https://models.inference.ai.azure.com";

if (!AZURE_API_KEY) {
  console.error("❌ ERROR: Missing API key in .env file");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: AZURE_API_KEY,
  baseURL: ENDPOINT,
});

app.use(cors());
app.use(bodyParser.json());

// Health check
app.get("/", (req, res) => {
  res.send("✅ Backend is working with Azure OpenAI model");
});

// Generic chat endpoint
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;
  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: messages || [],
      temperature: 0.8,
    });
    res.json(response);
  } catch (error) {
    console.error("❌ Error:", error);
    if (error.response) console.error("Response data:", error.response.data);
    res.status(500).json({ error: "Failed to contact AI API", details: error.message });
  }
});

// Preparation tips endpoint
app.post("/api/preparation-tips", async (req, res) => {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: "You are a helpful assistant for blood donors." },
        { role: "user", content: "Give me preparation tips before donating blood." },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });
    res.json({ reply: response.choices[0].message.content });
  } catch (error) {
    console.error("❌ Error fetching preparation tips:", error);
    if (error.response) console.error("Response data:", error.response.data);
    res.status(500).json({ error: "Failed to fetch preparation tips", details: error.message });
  }
});

// Post-care tips endpoint
app.post("/api/post-care", async (req, res) => {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: "You are a helpful assistant for blood donors." },
        { role: "user", content: "Give me post-donation care tips for a blood donor." },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });
    res.json({ reply: response.choices[0].message.content });
  } catch (error) {
    console.error("❌ Error fetching post-care tips:", error);
    if (error.response) console.error("Response data:", error.response.data);
    res.status(500).json({ error: "Failed to fetch post-donation care tips", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
});
