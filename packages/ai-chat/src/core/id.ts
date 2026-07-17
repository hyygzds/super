let seq = 0;

export function createMessageId(): string {
  seq += 1;
  return `msg_${seq}`;
}

/** @internal test helper */
export function resetMessageIdSeq(): void {
  seq = 0;
}
