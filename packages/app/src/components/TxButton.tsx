import React from 'react';

interface TransactionButtonProps {
  txHash: string;
  chainId: number | undefined;
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

const TransactionButton: React.FC<TransactionButtonProps> = ({ txHash, chainId }) => (
  <button onClick={() => handleTxLink(txHash, chainId)} className="btn btn-block bg-white border text-shrub-grey-700 normal-case text-xl border-shrub-grey-50 mb-4 hover:bg-shrub-green hover:border-shrub-green hover:text-white">
    View Tx in Explorer
  </button>
);

export default TransactionButton;
