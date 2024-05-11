import { Llamapi } from "@/utils/Llamapi";

function iteratorToStream(iterator) {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    }
  });
}

export async function POST(request) {
  const llamapi = new Llamapi(process.env.LOCAL_LLAMA);
  const { prompt, stream } = await request.json();

  const iterator = llamapi.generateDataStream(prompt, stream);
  const responseStream = iteratorToStream(iterator);

  return new Response(responseStream, {
    headers: { 'Content-Type': 'text/plain' }
  });
}
