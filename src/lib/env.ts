import { z } from 'zod';

const environment = {
  PINECONE_ENVIRONMENT: process.env.PINECONE_ENVIRONMENT,
  PINECONE_APIKEY: process.env.PINECONE_APIKEY,
  PINECONE_INDEX: process.env.PINECONE_INDEX,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  START_MINIMIZED: process.env.START_MINIMIZED,
};

const envSchema = z.object({
  PINECONE_ENVIRONMENT: z
    .string({ required_error: 'PINECONE_ENVIRONMENT required' })
    .nonempty("PINECONE_ENVIRONMENT can't be empty"),
  PINECONE_APIKEY: z
    .string({ required_error: 'PINECONE_APIKEY required' })
    .nonempty("PINECONE_APIKEY can't be empty"),
  PINECONE_INDEX: z
    .string({ required_error: 'PINECONE_INDEX required' })
    .nonempty("PINECONE_INDEX can't be empty"),
  START_MINIMIZED: z
    .string({
      required_error: "START_MINIMIZED can't be empty",
    })
    .nonempty("START_MINIMIZED can't be empty")
    .transform((val) => val === 'true'),
  OPENAI_API_KEY: z
    .string({ required_error: 'OPENAI_API_KEY required' })
    .nonempty("OPENAI_API_KEY can't be empty"),
});

const env = envSchema.parse(environment);

export default env;
