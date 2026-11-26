import { useEffect, useRef, useState } from "react";
import Icon from "../components/Icon";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  IconButton,
  PageHeader,
  Select,
  TextArea,
  TextInput,
} from "../components/ui";
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
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader
        eyebrow="Workbench / Recipes"
        title="配方工作台"
        description="组合 CyberChef 操作，构建可复用的编解码流水线"
        action={<Badge tone="accent" mono>{operations.length} ops 可用</Badge>}
      />

      <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(280px,1fr)_minmax(300px,1fr)] gap-4 p-5">
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <CardTitle icon="recipe" title="内置配方" hint={`${recipes.length} 个`} />
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {recipes.map((recipe, index) => {
              const isActive = active === index;
              return (
                <button
                  key={recipe.name}
                  onClick={() => select(index)}
                  className={`group relative w-full rounded-[9px] border px-3 py-2.5 text-left transition-all duration-150 ${
                    isActive
                      ? "border-accent/40 bg-accent-soft"
                      : "border-transparent hover:border-line hover:bg-surface-2"
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-accent" />
                  )}
                  <div className={`truncate text-[12px] font-medium ${isActive ? "text-accent-text" : "text-ink"}`}>
                    {recipe.name}
                  </div>
                  <div className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-dim">
                    {recipe.description}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden">
          <CardTitle
            icon="terminal"
            title="配方 Pipeline"
            hint="拖拽排序"
            action={
              <Button size="sm" icon="download" onClick={() => void exportRecipe()}>
                导出 JSON
              </Button>
            }
          />
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {ops.map((op, index) => (
              <div
                key={`${op.op}-${index}`}
                draggable
                onDragStart={() => {
                  dragIndex.current = index;
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => reorder(index)}
                className="group cursor-grab rounded-[10px] border border-line bg-surface-2/70 p-3 transition-all duration-150 hover:border-line-strong active:cursor-grabbing"
              >
                <div className="flex items-center gap-2">
                  <Icon name="grip" size={14} className="shrink-0 text-dim" />
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent-soft font-mono text-[10px] text-accent-text">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-accent-text">
                    {op.op}
                  </span>
                  <IconButton
                    icon="close"
                    label="移除操作"
                    danger
                    onClick={() => remove(index)}
                    className="h-6 w-6 border-transparent bg-transparent"
                  />
                </div>
                {op.args.length > 0 && (
                  <div className="mt-2 break-all pl-[52px] font-mono text-[10px] leading-relaxed text-dim">
                    {JSON.stringify(op.args)}
                  </div>
                )}
              </div>
            ))}
            {ops.length === 0 && (
              <div className="flex h-full min-h-[140px] items-center justify-center rounded-[10px] border border-dashed border-line px-4 text-center text-[11px] text-dim">
                从下方添加一个操作开始编排
              </div>
            )}
          </div>

          <div className="shrink-0 space-y-2 border-t border-line bg-surface/50 p-3">
            <div className="relative">
              <Icon
                name="search"
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-dim"
              />
              <TextInput
                value={opQuery}
                onChange={(e) => setOpQuery(e.target.value)}
                placeholder={`从 ${operations.length} 个操作中筛选…`}
                className="h-8 pl-8 text-[11px]"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={newOp}
                onChange={(e) => setNewOp(e.target.value)}
                className="h-8 min-w-0 flex-1 text-[11px]"
              >
                {operations
                  .filter((name) => name.toLowerCase().includes(opQuery.toLowerCase()))
                  .slice(0, 200)
                  .map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
              </Select>
              <Button
                size="sm"
                icon="plus"
                onClick={() => {
                  const args = newOp === "From Base64" ? ["A-Za-z0-9+/=", true] : [];
                  setOps([...ops, { op: newOp, args }]);
                }}
              >
                添加
              </Button>
            </div>
          </div>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden">
          <CardTitle icon="file" title="输入 / 输出" hint="本地执行" />
          <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">输入</span>
                <span className="text-[10px] text-dim/70">{input.length} 字符</span>
              </div>
              <TextArea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="从历史记录点「用配方解码」，或直接粘贴内容…"
                className="min-h-0 flex-1"
              />
            </div>

            <Button
              variant="primary"
              icon="play"
              onClick={() => void run()}
              disabled={running}
              className="w-full"
            >
              {running ? "执行中…" : "运行配方"}
            </Button>
            {error && (
              <div className="flex items-start gap-2 rounded-[9px] border border-danger/30 bg-danger-soft px-3 py-2 text-[11px] leading-snug text-danger">
                <Icon name="alert" size={13} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">输出</span>
                <span className="text-[10px] text-dim/70">{output.length} 字符</span>
              </div>
              <TextArea
                readOnly
                value={output}
                placeholder="运行结果"
                className="min-h-0 flex-1 !text-accent-text"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
