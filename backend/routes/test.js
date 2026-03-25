const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

(async () => {
  try {
    const models = await groq.models.list();
    console.log(models);
  } catch (err) {
    console.error(err);
  }
})();