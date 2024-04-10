interface CustomError extends Error {
  reason?: string;
  data?:any;
}
export function handleErrorMessagesFactory(
  setter: React.Dispatch<React.SetStateAction<string>>
) {
  return function handleErrorMessages(errorOptions: {
    err?: Error;
    customMessage?: string;
  }) {
    const { err, customMessage } = errorOptions;
    if (err) {
      const customError = err as CustomError; // Type assertion
      if (customError.reason ) {
        if(customError.reason.includes('user rejected transaction')) {
          setter("This transaction was cancelled. You can try again if you would like.")
        }
        else if(customError.reason.includes('Error: VM Exception while processing transaction: reverted with reason string \'Insufficient liquidity across pools\'')){
          setter("Not enough amount available to borrow. Please try borrowing a smaller amount or check back later")
        }
        else if(customError.reason.includes('Error: VM Exception while processing transaction: reverted with reason string \'Invalid pool\'')){
          setter("Pools are not initiated.")
        }
        else {
          setter(customError.reason);
        }

      }
      else if (customError.data) {
          setter(customError.data.message);
      }
      else if (customError.message) {
        setter(customError.message);
      }
    } else if (customMessage) {
     if(customMessage.includes('deployment `shrub-lend` does not exist')){
        setter("Unable to connect to Shrub's subgraph. Please check connection.")
      }
      else setter(customMessage);
    }
  };
}
