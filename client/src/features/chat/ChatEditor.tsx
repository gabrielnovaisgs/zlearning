interface Props {
  sessionId: string;
}

export function ChatEditor({ sessionId }: Props) {
  return <div>{sessionId}</div>;
}
