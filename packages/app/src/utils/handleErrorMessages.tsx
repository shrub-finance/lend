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
        // @ts-ignore
        setter(err.reason);
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
