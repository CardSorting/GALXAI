'use client';
import { WalletTopUpModal, type WalletTopUpModalProps } from '@/components/wallet/WalletTopUpModal';
export function KeyActivationPaywallModal(props: WalletTopUpModalProps & { keyLabel?: string }) {
  return <WalletTopUpModal {...props} />;
}
