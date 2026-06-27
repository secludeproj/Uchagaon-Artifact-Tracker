// Silence benign Firebase and connection logs/errors in sandboxed iframe environments
const filterBenignFirestoreMessage = (args: any[]): boolean => {
  const keywords = [
    "Disconnecting idle stream",
    "GrpcConnection RPC 'Listen'",
    "CANCELLED",
    "Timed out waiting for new targets",
    "@firebase/firestore",
    "Firestore (",
    "idle stream",
    "Poller connection issue",
    "Failed to fetch",
    "Failed to sync queued task",
    "Failed to commit back",
    "Missing or insufficient permissions"
  ];

  const getSearchString = (val: any, depth = 0): string => {
    if (depth > 5 || val === null || val === undefined) return "";

    if (typeof val === "string") {
      return val;
    }

    if (typeof val === "number" || typeof val === "boolean") {
      return String(val);
    }

    let res = "";
    if (val instanceof Error) {
      res += " " + val.message + " " + val.name + " " + (val.stack || "");
    }

    if (typeof val === "object") {
      if (val.message) res += " " + String(val.message);
      if (val.code) res += " " + String(val.code);
      if (val.reason) res += " " + String(val.reason);
      if (val.error) res += " " + getSearchString(val.error, depth + 1);

      try {
        const json = JSON.stringify(val);
        if (json) res += " " + json;
      } catch {}

      try {
        const props = Object.getOwnPropertyNames(val);
        for (const k of props) {
          try {
            const prop = val[k];
            if (typeof prop === "string" || typeof prop === "number") {
              res += " " + String(prop);
            } else if (typeof prop === "object") {
              res += " " + getSearchString(prop, depth + 1);
            }
          } catch {}
        }
      } catch {}
    }

    return res;
  };

  const combinedString = args.map(arg => getSearchString(arg)).join(" ");
  return keywords.some(kw => combinedString.includes(kw));
};

const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (filterBenignFirestoreMessage(args)) return;
  originalConsoleError(...args);
};

const originalConsoleWarn = console.warn;
console.warn = (...args: any[]) => {
  if (filterBenignFirestoreMessage(args)) return;
  originalConsoleWarn(...args);
};

const originalConsoleLog = console.log;
console.log = (...args: any[]) => {
  if (filterBenignFirestoreMessage(args)) return;
  originalConsoleLog(...args);
};

const originalConsoleInfo = console.info;
console.info = (...args: any[]) => {
  if (filterBenignFirestoreMessage(args)) return;
  originalConsoleInfo(...args);
};

const originalConsoleDebug = console.debug;
console.debug = (...args: any[]) => {
  if (filterBenignFirestoreMessage(args)) return;
  originalConsoleDebug(...args);
};

if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    if (filterBenignFirestoreMessage([event.message, event.error, event])) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);

  window.addEventListener("unhandledrejection", (event) => {
    if (filterBenignFirestoreMessage([event.reason, event])) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);
}
