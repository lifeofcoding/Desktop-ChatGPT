import { Configuration, OpenAIApi } from 'openai';
import { config } from 'dotenv';

config();

const { OPENAI_API_KEY } = process.env;

console.log('OPENAI_API_KEY', OPENAI_API_KEY);

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

export { createEmbeddings, openai };
