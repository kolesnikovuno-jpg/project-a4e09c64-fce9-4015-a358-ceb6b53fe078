import {createPublicDialogue} from "./public-dialogue.mjs";
import {createStudioKnowledgeLoader} from "./supabase-adapter.mjs";
import {createOpenAIAdapter} from "./openai-adapter.mjs";
export function createStudioButler({env,authorizeBudget,fetchImpl=fetch}) {
 return createPublicDialogue({
  loadRecords:createStudioKnowledgeLoader({url:env.SUPABASE_URL,key:env.BUTLER_SUPABASE_PUBLISHABLE_KEY,fetchImpl}),
  complete:createOpenAIAdapter({apiKey:env.OPENAI_API_KEY,model:env.BUTLER_MODEL,fetchImpl}),
  authorizeBudget
 });
}
