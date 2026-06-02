import { submitOrderProposal } from "@/lib/services/order-proposal-service";
import { setBrokerOrderConnectionActive } from "@/lib/services/trading-profile-service";
import type { AppState } from "@/lib/types";

export function connectBrokerSandboxOrderApi(state: AppState): AppState {
  return setBrokerOrderConnectionActive(state, true);
}

export function disconnectBrokerSandboxOrderApi(state: AppState): AppState {
  return setBrokerOrderConnectionActive(state, false);
}

export function submitBrokerSandboxOrder(
  state: AppState,
  proposalId: string
): AppState {
  const proposal = state.orderProposals.find((item) => item.id === proposalId);
  if (!proposal || proposal.executionMode !== "sandbox") return state;

  return submitOrderProposal(state, proposalId);
}
