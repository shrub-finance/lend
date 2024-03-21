export function handleErrorMessagesFactory(
  setter: React.Dispatch<React.SetStateAction<string>>
) {
  return function handleErrorMessages(errorOptions: {
    err?: Error;
    customMessage?: string;
  }) {
    const { err, customMessage } = errorOptions;
    if (err) {
      // @ts-ignore
      if (err.reason ) {
        if(err.reason.includes('user rejected transaction')) {
          setter("This transaction was cancelled. You can try again if you would like.")
        }
        else {
          // @ts-ignore
          setter(err.reason);
        }

      }
      // @ts-ignore
      else if (err.data) {
          // @ts-ignore
          setter(err.data.message);
      }
    } else if (customMessage) {
      setter(customMessage);
    }
  };
}
