import { useEffect, useRef, useState } from "react";
import { invoke } from "../lib/tauri";
import { useRecipe } from "../store/recipe";


export default function RecipeEditor({ initialInput }: { initialInput: string }) {
  const recipes = useRecipe((s) => s.recipes);
  const operations = useRecipe((s) => s.operations);
  const active = useRecipe((s) => s.active);
  const ops = useRecipe((s) => s.ops);
  const input = useRecipe((s) => s.input);
  const output = useRecipe((s) => s.output);
  const error = useRecipe((s) => s.error);
  const running = useRecipe((s) => s.running);
  const load = useRecipe((s) => s.load);
  const select = useRecipe((s) => s.select);
  const setInput = useRecipe((s) => s.setInput);
  const setOps = useRecipe((s) => s.setOps);
  const run = useRecipe((s) => s.run);

  const [newOp, setNewOp] = useState("From Base64");
  const [opQuery, setOpQuery] = useState("");
  const dragIndex = useRef<number | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (initialInput) setInput(initialInput);
  }, [initialInput, setInput]);

  const reorder = (target: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === target) return;
    const next = [...ops];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    setOps(next);
  };

  const remove = (index: number) => setOps(ops.filter((_, i) => i !== index));

  const exportRecipe = async () => {
    const json = JSON.stringify(ops, null, 2);
    await invoke("clipboard_copy", { text: json });
  };

  return (
    <div className="grid h-full grid-cols-[220px_minmax(260px,1fr)_minmax(280px,1fr)] gap-4 p-5">
      <section className="flex min-h-0 flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          内置配方
        </h2>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {recipes.map((recipe, index) => (
            <button
              key={recipe.name}
              onClick={() => select(index)}
              className={`w-full rounded-lg border p-2 text-left ${
                active === index
                  ? "border-sky-500/60 bg-sky-500/10"
                  : "border-transparent hover:border-slate-700"
              }`}
            >
              <div className="text-sm text-slate-200">{recipe.name}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-slate-500">
                {recipe.description}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="flex min-h-0 flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">配方 Pipeline</h2>
          <button
            onClick={exportRecipe}
            className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-400 hover:border-slate-500"
          >
            导出 JSON
          </button>
        </div>
        <p className="text-[11px] text-slate-500">拖拽操作卡片调整执行顺序</p>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {ops.map((op, index) => (
            <div
              key={`${op.op}-${index}`}
              draggable
              onDragStart={() => {
                dragIndex.current = index;
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => reorder(index)}
              className="cursor-grab rounded-lg border border-slate-700 bg-slate-950/60 p-3 active:cursor-grabbing"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-sky-300">
                  {index + 1}. {op.op}
                </span>
                <button
                  onClick={() => remove(index)}
                  className="text-xs text-slate-500 hover:text-red-400"
                >
                  ✕
                </button>
              </div>
              <div className="mt-1 break-all font-mono text-[11px] text-slate-500">
                args: {JSON.stringify(op.args)}
              </div>
            </div>
          ))}
          {ops.length === 0 && (
            <p className="rounded border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
              从下方添加一个操作
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            value={opQuery}
            onChange={(e) => setOpQuery(e.target.value)}
            placeholder={`搜索 ${operations.length} 个 CyberChef 操作`}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs"
          />
          <div className="flex gap-2">
            <select
              value={newOp}
              onChange={(e) => setNewOp(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-xs"
            >
              {operations
                .filter((name) => name.toLowerCase().includes(opQuery.toLowerCase()))
                .slice(0, 200)
                .map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
            </select>
            <button
              onClick={() => {
                const args = newOp === "From Base64" ? ["A-Za-z0-9+/=", true] : [];
                setOps([...ops, { op: newOp, args }]);
              }}
              className="rounded-lg border border-slate-700 px-3 text-xs text-slate-300 hover:border-slate-500"
            >
              添加
            </button>
          </div>
        </div>
      </section>

      <section className="flex min-h-0 flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="text-sm font-semibold text-slate-200">输入 / 输出</h2>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="点击历史中的「用配方解码」，或粘贴内容"
          className="min-h-0 flex-1 resize-none rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-300 focus:border-slate-500"
        />
        <button
          onClick={run}
          disabled={running}
          className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {running ? "执行中…" : "运行配方"}
        </button>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <textarea
          readOnly
          value={output}
          placeholder="输出"
          className="min-h-0 flex-1 resize-none rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-emerald-300"
        />
      </section>
    </div>
  );
}
