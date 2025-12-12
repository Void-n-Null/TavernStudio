## Streaming message flow (create-real-first)

```mermaid
flowchart TD
  A[User clicks Start] --> B[useStreaming.start()]
  B --> C[Pick parentId + speakerId]
  B --> D[Generate nodeClientId (__temp_…)]
  B --> E[streamingStore.start(meta + reset buffer)]
  B --> F[addMessage(parentId, content="", clientId=nodeClientId)]

  F --> G[TanStack onMutate\nInsert temp ChatNode into cache\nnode.id = nodeClientId\nnode.client_id = nodeClientId]
  G --> H[UI renders MessageItem\nkey = node.client_id (stable)]

  H --> I{Is this the streaming node?\nnode.client_id == streamingMeta.nodeClientId}
  I -- yes --> J[MessageContent renders StreamingMarkdown\n(reads streamingStore buffer)]
  I -- no --> K[MessageContent renders static markdown\n(from node.message)]

  L[Chunks arrive] --> M[useStreaming.append(chunk)]
  M --> N[streamingStore.append\nupdate buffer + notify subscribers]
  N --> J

  F --> S1[POST /api/chats/:id/messages\n(content="")] --> S2[DB: INSERT chat_nodes]
  S2 --> S3[Server returns {id, created_at}]
  S3 --> S4[TanStack onSuccess\nReplace node.id (temp -> real)\nKeep node.client_id stable]
  S4 --> H

  O[User clicks Finalize] --> P[await createPromise -> realId]
  P --> Q[editMessage(realId, fullContent)]
  Q --> R[PATCH /api/chats/:id/messages/:nodeId\n(content=full)] --> S5[DB: UPDATE chat_nodes.message]
  Q --> T[streamingStore.cancel()\n(stop streaming mode)]
  T --> K

  U[User clicks Cancel] --> V[streamingStore.cancel()]
  V --> W[deleteMessage(tempId or realId)\n(clean up placeholder)]
  W --> X[DELETE /api/chats/:id/messages/:nodeId\n(if real id exists)]
```
