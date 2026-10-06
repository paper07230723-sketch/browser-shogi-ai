import YaneuraOu_HalfKP from "@mizarjp/yaneuraou.halfkp.noeval";

let engine = null;

self.onmessage = async (e) => {
  const m = e.data;

  if (m.type === "init") {
    try {
engine = await YaneuraOu_HalfKP({
  locateFile: (path) => {
    if (path.endsWith(".wasm")) {
  return `${import.meta.env.BASE_URL}yaneuraou.halfkp.noeval.wasm`;
    }
    return path;
  }
});

      engine.addMessageListener(line =>
        self.postMessage({ type: "line", line })
      );

      engine.postMessage("usi");
} catch (err) {
  self.postMessage({
    type: "error",
    error: String(err),
    stack: err?.stack || "",
    name: err?.name || "",
    detail: JSON.stringify(err, Object.getOwnPropertyNames(err))
  });
}
    return;
  }

  if (engine && m.type === "command") {
    engine.postMessage(m.command);
  }
};
