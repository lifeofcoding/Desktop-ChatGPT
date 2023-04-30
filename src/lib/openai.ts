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

export { createEmbeddings, openai };
