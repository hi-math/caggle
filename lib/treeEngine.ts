// lib/treeEngine.ts — decision tree types, engine, and scoring

export const CLASSES = ['A', 'B', 'C', 'X', 'Y'] as const;
export type DrugClass = typeof CLASSES[number];

export const ATTRIBUTES = ['Age', 'Sex', 'BP', 'Cholesterol', 'Na_to_K'] as const;
export type Attribute = typeof ATTRIBUTES[number];

export const NUMERIC_ATTRS = new Set<string>(['Age', 'Na_to_K']);
export const CAT_VALUES: Record<string, string[]> = {
  Sex: ['F', 'M'],
  BP: ['HIGH', 'NORMAL', 'LOW'],
  Cholesterol: ['HIGH', 'NORMAL'],
};

export type Condition =
  | { kind: 'numeric'; operator: '>=' | '>' | '<=' | '<'; value: number }
  | { kind: 'categorical'; operator: '==' | '!='; value: string };

export interface SplitNode {
  id: string;
  type: 'split';
  attribute: string;
  condition: Condition;
  children: { true: TreeNode | null; false: TreeNode | null };
}

export interface LeafNode {
  id: string;
  type: 'leaf';
  prediction: string;
}

export type TreeNode = SplitNode | LeafNode;

export type Prediction = DrugClass | 'UNCLASSIFIED';

// ── predict ──────────────────────────────────────────────────────────────────
export function predict(node: TreeNode | null, row: DataRow): Prediction {
  if (!node) return 'UNCLASSIFIED';
  if (node.type === 'leaf') return node.prediction as Prediction;
  const branch = evalCondition(node, row);
  return predict(branch ? node.children.true : node.children.false, row);
}

function evalCondition(node: SplitNode, row: DataRow): boolean {
  const val = row[node.attribute as keyof DataRow];
  const { kind, operator, value } = node.condition;
  if (kind === 'numeric') {
    const v = Number(val), t = Number(value);
    return ({ '>=': v >= t, '>': v > t, '<=': v <= t, '<': v < t } as Record<string, boolean>)[operator];
  }
  return operator === '==' ? val === value : val !== value;
}

// ── scoring ───────────────────────────────────────────────────────────────────
export interface ScoredRow {
  Age: number; Sex: string; BP: string; Cholesterol: string; Na_to_K: number; Drug: string;
  pred: Prediction; ok: boolean;
  [key: string]: string | number | boolean;
}

export interface ScoreResult {
  accuracy: number;
  macroF1: number;
  correct: number;
  total: number;
  nodeCount: number;
  matrix: Record<string, Record<string, number>>;
  perClass: Record<string, { prec: number; rec: number; f1: number; support: number }>;
  scored: ScoredRow[];
}

export function scoreTree(
  root: TreeNode | null,
  dataset: DataRow[],
  targetClasses: readonly string[] = CLASSES
): ScoreResult {
  const mat: Record<string, Record<string, number>> = {};
  targetClasses.forEach(c => { mat[c] = {}; [...targetClasses, 'UNCLASSIFIED'].forEach(p => { mat[c][p] = 0; }); });

  let correct = 0;
  const scored: ScoredRow[] = dataset.map(row => {
    const pred = predict(root, row);
    const actual = row.Drug;
    if (!mat[actual]) { mat[actual] = {}; }
    mat[actual][pred] = (mat[actual][pred] ?? 0) + 1;
    const ok = pred === actual;
    if (ok) correct++;
    return { ...row, pred, ok };
  });

  const perClass: ScoreResult['perClass'] = {};
  targetClasses.forEach(c => {
    const tp = mat[c]?.[c] ?? 0;
    const fp = targetClasses.reduce((s, r) => s + (r !== c ? (mat[r]?.[c] ?? 0) : 0), 0);
    const fn = [...targetClasses, 'UNCLASSIFIED'].reduce((s, p) => s + (p !== c ? (mat[c]?.[p] ?? 0) : 0), 0);
    const prec = (tp + fp) > 0 ? tp / (tp + fp) : 0;
    const rec  = (tp + fn) > 0 ? tp / (tp + fn) : 0;
    const f1   = (prec + rec) > 0 ? 2 * prec * rec / (prec + rec) : 0;
    perClass[c] = { prec, rec, f1, support: tp + fn };
  });

  return {
    accuracy: correct / dataset.length,
    macroF1: targetClasses.reduce((s, c) => s + perClass[c].f1, 0) / targetClasses.length,
    correct,
    total: dataset.length,
    nodeCount: countNodes(root),
    matrix: mat,
    perClass,
    scored,
  };
}

export function countNodes(node: TreeNode | null): number {
  if (!node) return 0;
  if (node.type === 'leaf') return 1;
  return 1 + countNodes(node.children.true) + countNodes(node.children.false);
}

// ── Gini / InfoGain (for simulate page) ──────────────────────────────────────
export function gini(rows: DataRow[]): number {
  const n = rows.length;
  if (n === 0) return 0;
  const cnt: Record<string, number> = {};
  rows.forEach(r => { cnt[r.Drug] = (cnt[r.Drug] ?? 0) + 1; });
  return 1 - Object.values(cnt).reduce((s, c) => s + (c / n) ** 2, 0);
}

export function splitRows(rows: DataRow[], attr: string, op: string, value: string | number) {
  const trueRows: DataRow[] = [], falseRows: DataRow[] = [];
  rows.forEach(r => {
    const v = r[attr as keyof DataRow];
    let branch: boolean;
    if (NUMERIC_ATTRS.has(attr)) {
      const vn = Number(v), t = Number(value);
      branch = ({ '>=': vn >= t, '>': vn > t, '<=': vn <= t, '<': vn < t } as Record<string, boolean>)[op];
    } else {
      branch = op === '==' ? v === value : v !== value;
    }
    (branch ? trueRows : falseRows).push(r);
  });
  return { trueRows, falseRows };
}

export function infoGain(rows: DataRow[], attr: string, op: string, value: string | number): number {
  const n = rows.length;
  const { trueRows, falseRows } = splitRows(rows, attr, op, value);
  return gini(rows) - (trueRows.length / n) * gini(trueRows) - (falseRows.length / n) * gini(falseRows);
}

// ── node factories ────────────────────────────────────────────────────────────
export function makeSplitNode(attr = 'Na_to_K'): SplitNode {
  const isNum = NUMERIC_ATTRS.has(attr);
  return {
    id: crypto.randomUUID(),
    type: 'split',
    attribute: attr,
    condition: isNum
      ? { kind: 'numeric', operator: '>=', value: attr === 'Na_to_K' ? 15 : 45 }
      : { kind: 'categorical', operator: '==', value: (CAT_VALUES[attr] ?? [''])[0] },
    children: { true: null, false: null },
  };
}

export function makeLeafNode(pred = 'Y'): LeafNode {
  return { id: crypto.randomUUID(), type: 'leaf', prediction: pred };
}

export function changeAttr(node: SplitNode, attr: string): SplitNode {
  const isNum = NUMERIC_ATTRS.has(attr);
  return {
    ...node,
    attribute: attr,
    condition: isNum
      ? { kind: 'numeric', operator: '>=', value: attr === 'Na_to_K' ? 15 : 45 }
      : { kind: 'categorical', operator: '==', value: (CAT_VALUES[attr] ?? [''])[0] },
  };
}

// ── data type ─────────────────────────────────────────────────────────────────
export interface DataRow {
  Age: number;
  Sex: string;
  BP: string;
  Cholesterol: string;
  Na_to_K: number;
  Drug: string;
  [key: string]: string | number;
}
