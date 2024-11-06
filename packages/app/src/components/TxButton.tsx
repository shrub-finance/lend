import React from 'react';
import { Button } from 'components/Button';

interface TransactionButtonProps {
  txHash: string;
  chainId: number | undefined;
  className?: string;
  buttonText?: string;
  children?: React.ReactNode;
}

const handleTxLink = (txHash: string, chainId: number | undefined) => {
  if (!txHash || chainId === undefined) return;

  let baseUrl: string;
  switch (chainId) {
    case 11155111: // Sepolia
      baseUrl = 'https://sepolia.etherscan.io/tx/';
      break;
    case 17000: // Holesky
      baseUrl = 'https://holesky.etherscan.io/tx/';
      break;
    default:
      baseUrl = 'https://etherscan.io/tx/';
      break;
  }

  const url = `${baseUrl}${txHash}`;
  window.open(url, '_blank');
};

const TransactionButton: React.FC<TransactionButtonProps> = ({ txHash, chainId, className = '', buttonText = 'View Tx in Explorer', children }) => (
  <Button
    text={buttonText}
    type='info'
    onClick={() => handleTxLink(txHash, chainId)}
    additionalClasses="mb-4"
  />
);

export default TransactionButton;
