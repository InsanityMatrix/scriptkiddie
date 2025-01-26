import { Llamapi } from "@/utils/Llamapi";
import OpenAI from 'openai';




function iteratorToStream(iterator) {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) {
        controller.close();
        return;
      }
      if (value) {
        // Extract whatever you need from value
        const textChunk = value.choices?.[0]?.delta?.content || '';
        controller.enqueue(new TextEncoder().encode(textChunk));
      }
    }
  });
}
/*
export async function POST(request) {
  const llamapi = new Llamapi(process.env.LOCAL_LLAMA);
  const { prompt, stream } = await request.json();

  const iterator = llamapi.generateDataStream(prompt, stream);
  const responseStream = iteratorToStream(iterator);

  return new Response(responseStream, {
    headers: { 'Content-Type': 'text/plain' }
  });
}
*/
export async function POST(request) {
  const openai = new OpenAI({
    baseURL: process.env.LOCAL_LLAMA + '/v1/',
    apiKey: 'ollama',
  })
  const { messages, stream } = await request.json();
  const chatStream = await openai.chat.completions.create({
    messages: messages,
    model: 'deepseek-r1:8b-llama-distill-q8_0',
    stream: true
  })
  

  return new Response(chatStream.toReadableStream(), {
    headers: {
      'Content-Type': 'text/plain'
    }
  });
}