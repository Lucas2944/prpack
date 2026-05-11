export const log = {
  debug: (msg: string, ctx?: Record<string, unknown>) => {
    if (process.env.DEBUG) console.error(`[debug] ${msg}`, ctx ?? "");
  },
  info: (msg: string, ctx?: Record<string, unknown>) => {
    console.error(`[info] ${msg}`, ctx ?? "");
  },
};
