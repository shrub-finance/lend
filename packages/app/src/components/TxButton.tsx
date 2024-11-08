import React from "react";
import { Button } from "components/Button";

interface TransactionButtonProps {
  txHash: string;
  chainId: number | undefined;
  className?: string;
  buttonText?: string;
  children?: React.ReactNode;
}

const handleTxLink = (txHash: string, chainId: number | undefined) => {
  if (!txHash || chainId === undefined) return;

  const baseUrls: { [key: number]: string } = {
    11155111: "https://sepolia.etherscan.io/tx/", // Sepolia
    17000: "https://holesky.etherscan.io/tx/", // Holesky
  };

  const baseUrl = baseUrls[chainId] || "https://etherscan.io/tx/";
  const url = `${baseUrl}${txHash}`;
  window.open(url, "_blank");
};

const TransactionButton: React.FC<TransactionButtonProps> = ({
  txHash,
  chainId,
  className = "",
  buttonText = "View Tx in Explorer",
  children,
}) => (
  <Button
    text={buttonText}
    type="info"
    onClick={() => handleTxLink(txHash, chainId)}
    additionalClasses="mb-4"
  />
);

export default TransactionButton;
