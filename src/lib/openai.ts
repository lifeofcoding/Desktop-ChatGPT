import endent from 'endent';
import { Configuration, OpenAIApi } from 'openai';
import env from './env';

const { OPENAI_API_KEY } = env;

const configuration = new Configuration({
  apiKey: OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const createEmbeddings = async (text: string) => {
  const response = await openai.createEmbedding({
    model: 'text-embedding-ada-002',
    input: text,
  });
  return response.data.data[0];
};

type AgentResponse = Promise<{
  text?: string;
  search?: string;
}>;

const agent = async (text: string): AgentResponse => {
  try {
    const response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: endent`
      I will give you a user query. Your job is to decide when the query requires internet access and what search
      terms to use. If the query does not require internet access you respond with, just the users query.

      User query: What is in the news today?
      { "search": "news today" }

      User query: What is the weather like in New York?
      { "search": "weather New York" }

      User query: Who won the Lakers game last night?
      { "search": "who won the Lakers game last night" }

      User query: What is the best way to make a pizza?
      { "search": "best way to make a pizza" }

      User query: Explain physics to me in simple terms.
      { "text": "Explain physics to me in simple terms." }

      User query: Who was the first president of the United States?
      { "text": "Who was the first president of the United States?" }

      User query: What happened to the dinosaurs?
      { "text": "What happened to the dinosaurs?" }

      User query: What date does Taylor Swift's new album come out?
      { "search": "What date does Taylor Swift's new album come out?" }

      User query: Can you explain further?
      { "text": "Can you explain further?" }

      User query: What is the new Talyor Swift album called?
      { "search": "What is the new Talyor Swift album called?" }

      User query: What does that mean?
      { "text": "What does that mean?" }

      User query: How tall is that building?
      { "text": "How tall is that building?" }

      User query: What is the tallest building in the world?
      { "search": "What is the tallest building in the world?" }

      User query: Best chicken recipe?
      { "search": "Best chicken recipe?" }

      User query: Can you elaborate?
      { "text": "Can you elaborate?" }

      User query: Can you help me with this math problem: 100 * 82726
      { "text": "Can you help me with this math problem: 100 * 82726" }

      User query: Can you summarize that for me?
      { "text": "Can you summarize that for me?" }

      User query: Best resturant in Jacksonville, Florida?
      { "search": "Best resturant in Jacksonville, Florida?" }

      User query: Generate a random number between 1 and 100.
      { "text": "Generate a random number between 1 and 100." }

      User query: ${text}
    `,
      max_tokens: 50,
      temperature: 0,
    });

    if (response.data.choices[0].text) {
      return JSON.parse(response.data.choices[0].text);
    }
    return { text };
  } catch (error) {
    return { text };
  }
};

export { createEmbeddings, openai, agent };
