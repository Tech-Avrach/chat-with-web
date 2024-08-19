import { ChatWrapper } from "@/components/ChatWrapper"
import { ragChat } from "@/lib/rag-chat"
import { redis } from "@/lib/redis"
import { cookies } from "next/headers"

interface PageProps {

    params: {
        url: string | string[] | undefined
    }
}

// function reconstructUrl({ url }: { url: string[] }) {
//     const decodedComponents = url.map((component) =>
//       decodeURIComponent(component)
//     );
  
//     // If the first component is a protocol (e.g., 'https:'), handle it separately
//     if (decodedComponents[0].endsWith(':')) {
//       return `${decodedComponents[0]}//${decodedComponents.slice(1).join("/")}`;
//     }
  
//     // If there's no protocol, just join with '/'
//     return decodedComponents.join("/");
//   }

function reconstructUrl({ url }: { url: string[] }) {
    const decodedComponents = url.map((component) => decodeURIComponent(component));
  
    return decodedComponents.join("/");
  }

const page = async ({ params }: PageProps) => {

    const sessionCookie = cookies().get("sessionId")?.value

    const reconstructedUrl = reconstructUrl({url: params.url as string[]})

    const sessionId = (reconstructedUrl + "--" + sessionCookie).replaceAll(/\//g, "")

    console.log("sessionId", sessionId)

    const initialMessages = await ragChat.history.getMessages({ amount: 10, sessionId });

    const isAlreadyIndexed = await redis.sismember("indexed-urls", reconstructedUrl)


    if(!isAlreadyIndexed) {
        try {
            await ragChat.context.add({
              type: "html",
              source: reconstructedUrl,
              config: { chunkOverlap: 50, chunkSize: 200 },
            });
            console.log("URL indexed:", reconstructedUrl);
          } catch (error) {
            console.error("Error indexing URL:", error);
            // Handle the error appropriately, like logging it or retrying
          }

        console.log(params.url)
        console.log(reconstructedUrl)

        await redis.sadd("indexed-urls", reconstructedUrl)
    }


    return <ChatWrapper sessionId={sessionId} initialMessages={initialMessages} />
}

export default page