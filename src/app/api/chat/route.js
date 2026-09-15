// app/api/chat/route.js
import { OpenAI } from "openai";
import { OpenAIStream } from "ai";

// Initialize OpenAI client but point it to OpenRouter
const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY2,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000", // change to your domain in prod
    "X-Title": "My Next.js Chatbot",
  },
});

export async function POST(req) {
  try {
    const { messages, context, option } = await req.json();
    if(option && option==='ask-blog'){
    const systemPrompt = `You are a helpful AI assistant. The user will ask questions about this blog post and You would ans it in good quality, concise and very well-structured (and well-formatted) markdown format ,... Here's the blog content for context:\n\n${context}`;
    
    // Prepend system prompt
    const fullMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // Call OpenRouter
    const response = await client.chat.completions.create({
      model: process.env.MODEL_NAME, // or any model available on OpenRouter
      messages: fullMessages,
      stream: true,
    });

    // Stream back to frontend
    const stream = OpenAIStream(response);
    return new Response(stream);
  }
  else if(option && option==='create-description'){
    const systemPrompt = `Your task is to create a description for this blog post in a concise and engaging manner, suitable for sharing on social media platforms. It should capture the essence of the blog post and entice readers to read the full article. Here's the blog content for context:\n\n${context} \n\n [ IMPORTANT INSTRUCTIONs: The description should be around 50-100 words.Use a catchy and engaging tone.IT SHOULD BE IN PLAIN-TEXT (NOT IN MARKDOWN) FORMAT , DONT WRITE ANYTHING EXTRA OTHER THAN JUST THE SUMMARY.DONT DO ANY THINKING ]`;
    const fullMessages = [
      { role: "system", content: systemPrompt },
    ];
    // Call OpenRouter
    const response = await client.chat.completions.create({
      model: process.env.MODEL_NAME, // or any model available on OpenRouter
      messages: fullMessages,
      stream: true,
    });

    // Stream back to frontend
    const stream = OpenAIStream(response);
    return new Response(stream);
  }
  else if(option && option=='suggest-title'){
    const systemPrompt = `Based on the following blog content, generate a single, catchy, and SEO-friendly title. The title should be concise and compelling. Do not add any extra text, just the title itself:\n\n---\n\n${context} \n\n---\n\n [IMPORTANT INSTRUCTIONs: Title should be less than 90 characters. The title should be in plain-text (NOT IN MARKDOWN) FORMAT , DONT WRITE ANYTHING EXTRA OTHER THAN JUST THE TITLE.DONT DO ANY THINKING]`;
    const fullMessages = [
      { role: "system", content: systemPrompt },
    ];
    // Call OpenRouter
    const response = await client.chat.completions.create({
      model: process.env.MODEL_NAME, // or any model available on OpenRouter
      messages: fullMessages,
      stream: true,
    });

    // Stream back to frontend
    const stream = OpenAIStream(response);
    return new Response(stream);
  }
  else if(option && option=='enhance-content'){
    const systemPrompt = `
        Your task is to enhance the given blog content by improving its clarity, coherence, and overall quality. 
        You must:
        - Rephrase sentences for better readability and flow.
        - Correct grammatical errors.
        - Ensure smooth transitions between ideas.
        - Preserve the original meaning and intent while making the text more engaging and polished.

        STRICT FORMATTING RULES:
        1. The enhanced content must be formatted for React's "Tip-Tap editor".
        2. DO NOT use Markdown under any circumstances.
        3. DO NOT output escape characters or format specifiers such as \\n, \\t, \\r, or similar. 
          - Instead, use actual line breaks (press Enter) to separate paragraphs or elements.
          - Example: write <p>First paragraph.</p> <p>Second paragraph.</p> 
            NOT <p>First paragraph.</p>\\n<p>Second paragraph.</p>
        4. You ARE encouraged to use valid HTML tags for formatting (e.g., <h1>, <p>, <ul>, <li>, <a>, <strong>, <em>, etc.).
        5. Preserve any existing formatting such as headings, lists, links, and images.
        6. For images, keep them exactly as provided (e.g., <img src="https://assets.msn.com/staticsb/statics//latest/video-card-wc/icons/watch-more.svg" alt="View on Watch">).
        7. Do NOT add any extra commentary, explanations, or thinking steps—only return the enhanced content itself.

        Here is the blog content to enhance:

        ---

        ${context}

        ---
        `;
    const fullMessages = [
      { role: "system", content: systemPrompt },
    ];
    // Call OpenRouter
    const response = await client.chat.completions.create({
      model: process.env.MODEL_NAME_ENHANCE, // or any model available on OpenRouter
      messages: fullMessages,
      stream: true,
    });

    // Stream back to frontend
    const stream = OpenAIStream(response);
    return new Response(stream);
  }
  } catch (error) {
    console.error("API Chat route error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error in AI chat" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Fallback if option didn't match
  return new Response(
    JSON.stringify({ error: "Invalid or missing option parameter" }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}