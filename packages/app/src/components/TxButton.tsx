import React from 'react';

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
  <button onClick={() => handleTxLink(txHash, chainId)} className={`btn ${className}`}>
    {children || buttonText}
  </button>
);

export default TransactionButton;
