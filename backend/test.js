require("dotenv").config();

const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function checkModels() {
  try {
    const models = await groq.models.list();

    console.log("AVAILABLE MODELS:\n");

    models.data.forEach((m, i) => {
      console.log(`${i + 1}. ${m.id}`);
    });

  } catch (err) {
    console.error("ERROR:", err);
  }
}

checkModels();