# AI Orchestration — Setup & Concepts

## 1. Configure OpenAI API key

- Create a key at [OpenAI API keys](https://platform.openai.com/api-keys).
- In the project root, set in `.env`:
  - `OPENAI_API_KEY=sk-...`
- Optional: `OPENAI_MODEL=gpt-4o` (default) or `gpt-4-turbo`, etc.

The app reads these via NestJS `ConfigModule` (already `isGlobal: true`). Never commit the key; use env in production.

## 2. Create the OpenAI client

In `AiService` we create a single `ChatOpenAI` instance:

- `openAIApiKey`: from `ConfigService.get('OPENAI_API_KEY')`.
- `modelName`: from `ConfigService.get('OPENAI_MODEL', 'gpt-4o')`.
- `temperature: 0` for more deterministic structured outputs.

The client is created in the constructor and reused for all graph nodes.

## 3. Token usage

- LangChain’s OpenAI integration can expose usage in response metadata (e.g. `usage_metadata` on the message).
- For a first version we don’t aggregate it; the `ConversationState` has an optional `tokenUsage` field.
- To track usage: use LangChain callbacks (e.g. `handleLLMEnd`) and sum `usage_metadata.input_tokens` / `usage_metadata.output_tokens` across node invocations, then set `state.tokenUsage` in the graph.

## 4. Streaming (if you add it later)

- LangGraph supports streaming: `graph.stream(initialState)` yields chunks per node.
- You can stream token-by-token by using the model’s `stream()` in a node and forwarding chunks.
- For the foundation we only use `graph.invoke()` (no streaming). To add it: add a second endpoint (e.g. `POST /ai/chat/stream`) that uses `graph.stream()` and sends SSE (or similar) to the client.

## 5. How this differs from fine-tuning

- **We are not training the model.** We use the base model (e.g. GPT-4) as-is.
- **Orchestration** = multiple prompts + a state graph. Each node is a small, focused prompt; the graph passes structured state between steps. The model’s weights do not change.
- **Fine-tuning** = updating model weights on your data. It’s useful for style or domain-specific phrasing, but it’s heavier (data, training, versioning). Here we get structure and control by design (prompts + graph), not by training.

## 6. Where to store memory (later)

- **Conversation state** = the `ConversationState` object (goal, skills, constraints, structured project, roadmap).
- Store it in the DB (e.g. a `conversations` or `ai_sessions` table) keyed by `userId` and `conversationId`.
- On each turn:
  - Load the last state for that conversation (or start with `{ rawInput: userMessage }`).
  - Optionally append the new message to a “messages” history in state (and trim to a window) for context.
  - Run the graph (full run or resume from a node if you add branching).
  - Save the updated state back.
- This gives you persistence, resume, and the option to show “your project so far” in the UI.
