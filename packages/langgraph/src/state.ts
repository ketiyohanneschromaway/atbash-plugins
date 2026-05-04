import { Annotation, MessagesAnnotation } from "@langchain/langgraph";

export const AtbashStateAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  atbashVerdict: Annotation<string | null>({
    reducer: (_current, update) => update,
    default: () => null,
  }),
  atbashReason: Annotation<string | null>({
    reducer: (_current, update) => update,
    default: () => null,
  }),
  atbashToolCallId: Annotation<string | null>({
    reducer: (_current, update) => update,
    default: () => null,
  }),
  atbashConfidence: Annotation<number | null>({
    reducer: (_current, update) => update,
    default: () => null,
  }),
});

export type AtbashState = typeof AtbashStateAnnotation.State;
