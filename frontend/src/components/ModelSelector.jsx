function ModelSelector({ model, setModel }) {
  return (
    <select value={model} onChange={(e) => setModel(e.target.value)}>
      <option value="qwen3:latest">Qwen3</option>

      <option value="phi:latest">Phi</option>

      <option value="gemma:2b">Gemma</option>

      <option value="llama3.2:1b">Llama</option>
    </select>
  );
}

export default ModelSelector;
