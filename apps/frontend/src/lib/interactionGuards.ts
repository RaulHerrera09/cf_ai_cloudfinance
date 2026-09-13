export function createMutationGate() {
  let pending = false;
  return {
    begin() {
      if (pending) return false;
      pending = true;
      return true;
    },
    end() { pending = false; },
    isPending() { return pending; },
  };
}

export type DeleteDecision = 'cancel' | 'confirm';
export function shouldSendDeleteRequest(decision: DeleteDecision): boolean {
  return decision === 'confirm';
}
