import YaneuraOu_HalfKP from "@mizarjp/yaneuraou.halfkp";

let engine = null;

self.onmessage = async (e) => {
  const m = e.data;

  if (m.type === "init") {
    try {
engine = await YaneuraOu_HalfKP({
  locateFile: (path) => {
    if (path.endsWith(".wasm")) {
      return new URL("../yaneuraou.halfkp.wasm", import.meta.url).href;
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
        error: err?.message || String(err),
        stack: err?.stack || "",
        name: err?.name || ""
      });
    }
    return;
  }

  if (engine && m.type === "command") {
    engine.postMessage(m.command);
  }
};
