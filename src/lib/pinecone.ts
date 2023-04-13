import { PineconeClient } from '@pinecone-database/pinecone';
import { config } from 'dotenv';
import crypto from 'crypto';

config();

const { PINECONE_ENVIRONMENT, PINECONE_APIKEY } = process.env;

class PineconeDB {
  private pinecone = new PineconeClient();

  private clientPromise: Promise<void> | undefined;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (!this.clientPromise) {
      this.clientPromise = this.pinecone.init({
        environment: PINECONE_ENVIRONMENT || '',
        apiKey: PINECONE_APIKEY || '',
      });
    }

    return this.clientPromise;
  }

  public async getDB() {
    await this.initialize();
    return this.pinecone;
  }

  public async insertVector(vector: number[], content: string, user: string) {
    await this.initialize();
    const index = this.pinecone.Index('chatgpt-desktop');

    const upsertRequest = {
      vectors: [
        {
          id: crypto.randomUUID(),
          values: vector,
          metadata: {
            user,
            content,
          },
        },
      ],
      namespace: 'messages',
    };

    const upsertResponse = await index.upsert({ upsertRequest });

    return upsertResponse;
  }

  public async queryVector(vector: number[], user: string) {
    await this.initialize();
    const index = this.pinecone.Index('chatgpt-desktop');

    const queryRequest = {
      vector,
      topK: 5,
      includeValues: true,
      includeMetadata: true,
      filter: {
        user: { $eq: user },
      },
      namespace: 'messages',
    };
    const queryResponse = await index.query({ queryRequest });
    return queryResponse;
  }
}

export default new PineconeDB();
