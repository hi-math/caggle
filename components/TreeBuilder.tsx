'use client';

import { TreeNode, SplitNode, LeafNode, ATTRIBUTES, CAT_VALUES, NUMERIC_ATTRS, CLASSES, makeSplitNode, makeLeafNode } from '@/lib/treeEngine';

// ── Builder config ─────────────────────────────────────────────────────────────
export interface BuilderConfig {
  attributes: readonly string[];
  numericAttrs: Set<string>;
  catValues: Record<string, string[]>;
  classes: readonly string[];
  defaultAttr: string;
  classLabels?: Record<string, string>;
  attrLabels?: Record<string, string>;
  valueLabels?: Record<string, Record<string, string>>;
  defaultNumericValue?: number; // 수치형 속성의 기본값 (기본 0)
}

const DEFAULT_CONFIG: BuilderConfig = {
  attributes: ATTRIBUTES,
  numericAttrs: NUMERIC_ATTRS,
  catValues: CAT_VALUES,
  classes: CLASSES,
  defaultAttr: 'Na_to_K',
};

function makeDefaultSplit(config: BuilderConfig): SplitNode {
  const attr = config.defaultAttr;
  const isNum = config.numericAttrs.has(attr);
  return {
    id: crypto.randomUUID(),
    type: 'split',
    attribute: attr,
    condition: isNum
      ? { kind: 'numeric', operator: '>=', value: config.defaultNumericValue ?? 0 }
      : { kind: 'categorical', operator: '==', value: (config.catValues[attr] ?? [''])[0] },
    children: { true: null, false: null },
  };
}

function changeAttrConfig(node: SplitNode, attr: string, config: BuilderConfig): SplitNode {
  const isNum = config.numericAttrs.has(attr);
  return {
    ...node,
    attribute: attr,
    condition: isNum
      ? { kind: 'numeric', operator: '>=', value: config.defaultNumericValue ?? 0 }
      : { kind: 'categorical', operator: '==', value: (config.catValues[attr] ?? [''])[0] },
  };
}

// ── Colors ────────────────────────────────────────────────────────────────────
const CLS_COLOR: Record<string, string> = {
  A: 'oklch(0.62 0.20 25)',  B: 'oklch(0.62 0.18 50)',
  C: 'oklch(0.62 0.14 150)', X: 'oklch(0.62 0.13 250)',
  Y: 'oklch(0.62 0.12 80)',
  e: 'oklch(0.55 0.16 150)', p: 'oklch(0.55 0.19 25)',
};

export { CLS_COLOR };

// ── Sub-components ────────────────────────────────────────────────────────────
interface NodeProps {
  node: TreeNode | null;
  onChange: (n: TreeNode | null) => void;
  isRoot?: boolean;
  disabled?: boolean;
  config: BuilderConfig;
}

function EmptySlot({ onChange, disabled, config }: { onChange: (n: TreeNode | null) => void; disabled?: boolean; config: BuilderConfig }) {
  return (
    <div className="t-slot">
      <button className="btn btn-ghost btn-sm" disabled={disabled} onClick={() => onChange(makeDefaultSplit(config))}>+ 조건</button>
      <button className="btn btn-soft btn-sm" disabled={disabled} onClick={() => onChange(makeLeafNode(config.classes[0]))}>+ 리프</button>
    </div>
  );
}

// 클래스별 리프 배경/테두리 색상
function getLeafStyle(cls: string): { background: string; borderColor: string } {
  if (cls === 'e') return { background: 'oklch(0.94 0.06 150)', borderColor: 'oklch(0.72 0.13 150)' };
  if (cls === 'p') return { background: 'oklch(0.95 0.05 25)',  borderColor: 'oklch(0.76 0.13 25)'  };
  // drug200 classes
  const baseHue: Record<string, number> = { A:25, B:50, C:150, X:250, Y:80 };
  const h = baseHue[cls] ?? 250;
  return { background: `oklch(0.95 0.04 ${h})`, borderColor: `oklch(0.80 0.09 ${h})` };
}

function LeafCard({ node, onChange, isRoot, disabled, config }: NodeProps & { node: LeafNode }) {
  const pred = node.prediction;
  const leafStyle = getLeafStyle(pred);
  const displayLabel = (cls: string) => config.classLabels?.[cls] ?? cls;

  return (
    <div className="t-node">
      <div
        className={`t-card is-leaf${isRoot ? ' is-root' : ''}`}
        style={{ background: leafStyle.background, borderColor: leafStyle.borderColor }}
      >
        <div className="t-card-head">
          <span className="tag">리프</span>
          <span className="mono muted3" style={{ fontSize: 12 }}>예측</span>
          <button className="t-del" disabled={disabled} onClick={() => onChange(null)}>✕</button>
        </div>
        <select
          className="t-leaf-sel"
          value={pred}
          style={{ color: CLS_COLOR[pred] ?? 'var(--ink)', borderColor: leafStyle.borderColor }}
          disabled={disabled}
          onChange={e => onChange({ ...node, prediction: e.target.value })}
        >
          {config.classes.map(c => (
            <option key={c} value={c}>{displayLabel(c)}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function SplitCard({ node, onChange, isRoot, disabled, config }: NodeProps & { node: SplitNode }) {
  const attr = node.attribute;
  const isNum = config.numericAttrs.has(attr);
  const ops = isNum ? ['>=', '>', '<=', '<'] : ['==', '!='];

  const setAttr = (a: string) => onChange(changeAttrConfig(node, a, config));
  const setOp   = (op: string) => onChange({ ...node, condition: { ...node.condition, operator: op as never } });
  const setVal  = (v: string)  => onChange({
    ...node,
    condition: { ...node.condition, value: isNum ? parseFloat(v) || 0 : v } as never,
  });
  const setChild = (side: 'true' | 'false') => (child: TreeNode | null) =>
    onChange({ ...node, children: { ...node.children, [side]: child } });

  return (
    <div className="t-node">
      <div className={`t-card${isRoot ? ' is-root' : ''}`}>
        <div className="t-card-head">
          <span className="tag accent">분할</span>
          <button className="t-del" disabled={disabled} onClick={() => onChange(null)}>✕</button>
        </div>
        <div className="t-cond">
          <select
            value={attr}
            disabled={disabled}
            onChange={e => setAttr(e.target.value)}
            title={
              (config.catValues[attr] ?? [])
                .map(v => config.valueLabels?.[attr]?.[v] ?? v)
                .join(' · ')
            }
          >
            {config.attributes.map(a => (
              <option key={a} value={a}>{config.attrLabels?.[a] ?? a}</option>
            ))}
          </select>
          <select value={node.condition.operator} disabled={disabled} onChange={e => setOp(e.target.value)}>
            {ops.map(o => <option key={o}>{o}</option>)}
          </select>
          {isNum ? (
            <input type="number" value={node.condition.value as number}
              step={1} disabled={disabled} onChange={e => setVal(e.target.value)} />
          ) : (
            <select value={node.condition.value as string} disabled={disabled} onChange={e => setVal(e.target.value)}>
              {(config.catValues[attr] ?? []).map(v => (
                <option key={v} value={v}>{config.valueLabels?.[attr]?.[v] ?? v}</option>
              ))}
            </select>
          )}
        </div>
      </div>
      {/* 카드 → 수평 연결선 수직 드롭 */}
      <div style={{ width: 2, height: 18, background: 'var(--border-2)', flexShrink: 0 }} />
      <div className="t-children">
        <div className="t-branch">
          <div className="branch-label bl-true">True ✓</div>
          <NodeRenderer node={node.children.true} onChange={setChild('true')} disabled={disabled} config={config} />
        </div>
        <div className="t-branch">
          <div className="branch-label bl-false">False ✗</div>
          <NodeRenderer node={node.children.false} onChange={setChild('false')} disabled={disabled} config={config} />
        </div>
      </div>
    </div>
  );
}

function NodeRenderer({ node, onChange, isRoot, disabled, config }: NodeProps) {
  if (!node) return <EmptySlot onChange={onChange} disabled={disabled} config={config} />;
  if (node.type === 'leaf') return <LeafCard node={node} onChange={onChange} isRoot={isRoot} disabled={disabled} config={config} />;
  return <SplitCard node={node} onChange={onChange} isRoot={isRoot} disabled={disabled} config={config} />;
}

// ── Public component ──────────────────────────────────────────────────────────
interface TreeBuilderProps {
  value: TreeNode | null;
  onChange: (tree: TreeNode | null) => void;
  disabled?: boolean;
  config?: BuilderConfig;
}

export default function TreeBuilder({ value, onChange, disabled, config = DEFAULT_CONFIG }: TreeBuilderProps) {
  return (
    <div style={{ overflowX: 'auto', padding: '4px', minHeight: '120px' }}>
      <NodeRenderer node={value} onChange={onChange} isRoot disabled={disabled} config={config} />
    </div>
  );
}
