
function formatMessage(
  level: string,
  message: string,
  data?: unknown,
): string {
  const timestamp = new Date().toISOString();
  const dataStr = data
    ? `\n${JSON.stringify(data, null, 2)}`
    : "";
  return `[${timestamp}] [${level}] ${message}${dataStr}`;
}

export const logger = {
  info(message: string, data?: unknown) {
    const logMessage = formatMessage(
      "INFO",
      message,
      data,
    );
    console.log(logMessage);
  },

  error(message: string, error?: unknown) {
    const logMessage = formatMessage(
      "ERROR",
      message,
      error,
    );
    console.error(logMessage);
  },
};