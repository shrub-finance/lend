import ReactGA from "react-ga4";

// Constants
const navigation = "Navigation";
const key = "Key";
const select = "Select";
const copy = "Copy";
const custom = "Custom";

function gaEventFactory(
  action: string,
  category: string,
  label?: string,
  value?: number,
) {
  const eventObject: {
    category: string;
    action: string;
    label?: string;
    value?: number;
  } = { category, action };

  // Conditionally add optional parameters
  if (label !== undefined) {
    eventObject.label = label;
  }

  if (value !== undefined) {
    eventObject.value = value;
  }

  // Send the event to GA
  ReactGA.event(eventObject);
}

export const ga4events = {
  topNavLogo: () => gaEventFactory("TopNav_Logo", navigation, custom),
  topNavBorrow: () => gaEventFactory("TopNav_Borrow", navigation, custom),
  topNavDashboard: () => gaEventFactory("TopNav_Dashboard", navigation, custom),
  topNavConnectWallet: () =>
    gaEventFactory("TopNav_ConnectWallet", key, custom),
  walletConnected: () => gaEventFactory("TopNav_Wallet_Connected", key, custom),
  walletLogin: () => gaEventFactory("TopNav_Wallet_Login", "Key", "Custom"),
  walletLogout: () => gaEventFactory("TopNav_Wallet_Logout", "Key", "Custom"),
  depositInterest: (interestAmount: number) =>
    gaEventFactory("Deposit_Interest", select, custom, interestAmount),
  depositConfirm: () => gaEventFactory("Deposit_Confirm", key, custom),
  summaryBack: () => gaEventFactory("Summary_Back", navigation, custom),
  summaryConnectWallet: () =>
    gaEventFactory("Summary_ConnectWallet", key, custom),
  summaryCancel: () => gaEventFactory("Summary_Cancel", key, custom),
  summaryWalletAddressCopy: () =>
    gaEventFactory("Summary_WalletAddress_Copy", copy, custom),
  summaryContractAddressCopy: () =>
    gaEventFactory("Summary_ContractAddress_Copy", copy, custom),
  summaryBorrow: () => gaEventFactory("Summary_Borrow", key, custom),
};
