// lib/mushroomData.ts
// UCI Mushrooms 데이터셋 서브셋 — 4 속성 (odor, spore_print_color, gill_size, gill_color)
// 훈련셋: 200행 (라벨 공개 / CSV 다운로드 가능)
// 테스트셋: 100행 (라벨 비공개 / 실전용)
import type { DataRow } from './treeEngine';

// ── 속성 설정 ─────────────────────────────────────────────────────────────────
export const MUSH_ATTRS = ['odor', 'spore_print_color', 'gill_size', 'gill_color'] as const;
export const MUSH_NUMERIC_ATTRS = new Set<string>(); // 전부 범주형
export const MUSH_CAT_VALUES: Record<string, string[]> = {
  odor: ['none','almond','anise','foul','fishy','spicy','pungent','musty','creosote'],
  spore_print_color: ['black','brown','white','green','chocolate','buff','orange','purple','yellow'],
  gill_size: ['broad','narrow'],
  gill_color: ['buff','pink','white','brown','gray','black','chocolate','orange','green','purple','red','yellow'],
};
export const MUSH_CLASSES = ['e', 'p'] as const; // e=식용, p=독버섯
export const MUSH_CLASS_LABEL: Record<string, string> = { e:'식용', p:'독버섯' };

// ── 클래스 결정 규칙 ───────────────────────────────────────────────────────────
const BAD_ODORS = new Set(['foul','fishy','creosote','spicy','pungent','musty']);
function cls(odor: string, spore: string, gillSize: string): 'e' | 'p' {
  if (BAD_ODORS.has(odor)) return 'p';
  if (odor === 'none' && spore === 'green') return 'p';
  if (odor === 'none' && gillSize === 'narrow') return 'p';
  return 'e';
}

type R = [string, string, string, string]; // [odor, spore, gill_size, gill_color]

function mkRow([odor, spore_print_color, gill_size, gill_color]: R): DataRow {
  return {
    odor, spore_print_color, gill_size, gill_color,
    Drug: cls(odor, spore_print_color, gill_size), // 'e' or 'p'
    Age: 0, Sex: '', BP: '', Cholesterol: '', Na_to_K: 0,
  };
}

// ── 훈련셋 (200행) ────────────────────────────────────────────────────────────
const _TRAIN: R[] = [
  // === 독버섯: 나쁜 냄새 (60) ===
  // foul(20)
  ['foul','black','broad','pink'],['foul','black','narrow','buff'],['foul','brown','broad','pink'],
  ['foul','brown','narrow','buff'],['foul','white','broad','gray'],['foul','white','narrow','white'],
  ['foul','chocolate','broad','brown'],['foul','chocolate','narrow','gray'],['foul','black','broad','gray'],
  ['foul','brown','broad','gray'],['foul','buff','broad','pink'],['foul','black','narrow','brown'],
  ['foul','brown','narrow','pink'],['foul','white','broad','brown'],['foul','purple','narrow','buff'],
  ['foul','black','broad','brown'],['foul','white','narrow','gray'],['foul','buff','narrow','brown'],
  ['foul','orange','broad','pink'],['foul','brown','broad','white'],
  // fishy(10)
  ['fishy','white','narrow','buff'],['fishy','black','broad','pink'],['fishy','brown','narrow','buff'],
  ['fishy','white','broad','gray'],['fishy','brown','broad','brown'],['fishy','black','narrow','brown'],
  ['fishy','white','narrow','pink'],['fishy','chocolate','broad','buff'],['fishy','buff','narrow','gray'],
  ['fishy','purple','broad','pink'],
  // spicy(10)
  ['spicy','black','broad','pink'],['spicy','brown','narrow','buff'],['spicy','white','broad','gray'],
  ['spicy','chocolate','narrow','pink'],['spicy','black','narrow','buff'],['spicy','brown','broad','pink'],
  ['spicy','white','narrow','brown'],['spicy','black','broad','brown'],['spicy','purple','broad','buff'],
  ['spicy','buff','narrow','gray'],
  // pungent(10)
  ['pungent','black','broad','pink'],['pungent','white','narrow','buff'],['pungent','brown','broad','gray'],
  ['pungent','chocolate','narrow','pink'],['pungent','black','narrow','white'],['pungent','brown','broad','brown'],
  ['pungent','white','broad','pink'],['pungent','buff','narrow','brown'],['pungent','black','broad','buff'],
  ['pungent','brown','narrow','gray'],
  // musty(5)
  ['musty','white','broad','pink'],['musty','brown','narrow','buff'],['musty','black','broad','gray'],
  ['musty','white','narrow','pink'],['musty','brown','broad','brown'],
  // creosote(5)
  ['creosote','black','broad','pink'],['creosote','brown','narrow','buff'],['creosote','white','broad','gray'],
  ['creosote','chocolate','narrow','pink'],['creosote','black','broad','brown'],

  // === 독버섯: none 냄새 + 초록 포자 (16) ===
  ['none','green','broad','white'],['none','green','broad','gray'],['none','green','narrow','white'],
  ['none','green','broad','pink'],['none','green','narrow','gray'],['none','green','broad','brown'],
  ['none','green','narrow','pink'],['none','green','broad','buff'],['none','green','narrow','brown'],
  ['none','green','broad','black'],['none','green','narrow','buff'],['none','green','broad','orange'],
  ['none','green','narrow','orange'],['none','green','broad','green'],['none','green','narrow','purple'],
  ['none','green','broad','yellow'],

  // === 독버섯: none 냄새 + 비초록 포자 + 좁은 아가미 (20) ===
  ['none','white','narrow','buff'],['none','brown','narrow','buff'],['none','black','narrow','buff'],
  ['none','chocolate','narrow','gray'],['none','white','narrow','gray'],['none','brown','narrow','pink'],
  ['none','black','narrow','brown'],['none','buff','narrow','buff'],['none','white','narrow','brown'],
  ['none','black','narrow','pink'],['none','brown','narrow','brown'],['none','purple','narrow','buff'],
  ['none','white','narrow','pink'],['none','brown','narrow','gray'],['none','chocolate','narrow','pink'],
  ['none','buff','narrow','gray'],['none','black','narrow','gray'],['none','yellow','narrow','buff'],
  ['none','orange','narrow','pink'],['none','chocolate','narrow','buff'],

  // === 식용: almond 냄새 (35) ===
  ['almond','brown','broad','pink'],['almond','white','broad','pink'],['almond','black','broad','pink'],
  ['almond','brown','narrow','pink'],['almond','chocolate','broad','pink'],['almond','brown','broad','gray'],
  ['almond','white','broad','gray'],['almond','black','broad','gray'],['almond','brown','narrow','gray'],
  ['almond','purple','broad','pink'],['almond','brown','broad','brown'],['almond','white','broad','brown'],
  ['almond','black','broad','brown'],['almond','brown','narrow','brown'],['almond','buff','broad','pink'],
  ['almond','brown','broad','white'],['almond','white','broad','white'],['almond','black','narrow','white'],
  ['almond','brown','broad','buff'],['almond','white','narrow','pink'],['almond','brown','broad','orange'],
  ['almond','black','broad','buff'],['almond','white','narrow','gray'],['almond','brown','broad','green'],
  ['almond','chocolate','narrow','pink'],['almond','brown','broad','red'],['almond','purple','narrow','gray'],
  ['almond','buff','broad','gray'],['almond','brown','broad','yellow'],['almond','black','narrow','buff'],
  ['almond','orange','broad','pink'],['almond','white','narrow','brown'],['almond','black','broad','buff'],
  ['almond','yellow','broad','gray'],['almond','brown','narrow','buff'],

  // === 식용: anise 냄새 (35) ===
  ['anise','brown','broad','pink'],['anise','white','broad','pink'],['anise','black','broad','pink'],
  ['anise','brown','narrow','pink'],['anise','brown','broad','gray'],['anise','white','broad','gray'],
  ['anise','chocolate','broad','gray'],['anise','brown','narrow','gray'],['anise','purple','broad','pink'],
  ['anise','brown','broad','brown'],['anise','white','broad','brown'],['anise','black','broad','brown'],
  ['anise','brown','narrow','brown'],['anise','buff','broad','pink'],['anise','brown','broad','white'],
  ['anise','white','narrow','white'],['anise','black','broad','buff'],['anise','brown','broad','buff'],
  ['anise','brown','narrow','buff'],['anise','white','broad','orange'],['anise','brown','broad','red'],
  ['anise','chocolate','broad','pink'],['anise','black','narrow','pink'],['anise','purple','broad','gray'],
  ['anise','brown','broad','green'],['anise','buff','narrow','gray'],['anise','orange','broad','pink'],
  ['anise','brown','broad','yellow'],['anise','white','narrow','gray'],['anise','brown','broad','purple'],
  ['anise','yellow','broad','pink'],['anise','black','broad','gray'],['anise','brown','broad','pink'],
  ['anise','white','broad','brown'],['anise','brown','narrow','white'],

  // === 식용: none 냄새 + 비초록 + 넓은 아가미 (34) ===
  ['none','white','broad','pink'],['none','brown','broad','pink'],['none','black','broad','pink'],
  ['none','chocolate','broad','pink'],['none','white','broad','gray'],['none','brown','broad','gray'],
  ['none','black','broad','gray'],['none','buff','broad','pink'],['none','white','broad','brown'],
  ['none','brown','broad','brown'],['none','black','broad','brown'],['none','chocolate','broad','gray'],
  ['none','white','broad','white'],['none','brown','broad','white'],['none','black','broad','white'],
  ['none','purple','broad','pink'],['none','white','broad','buff'],['none','brown','broad','buff'],
  ['none','black','broad','buff'],['none','orange','broad','pink'],['none','white','broad','orange'],
  ['none','brown','broad','orange'],['none','yellow','broad','pink'],['none','buff','broad','gray'],
  ['none','white','broad','red'],['none','brown','broad','green'],['none','chocolate','broad','brown'],
  ['none','purple','broad','gray'],['none','white','broad','yellow'],['none','brown','broad','yellow'],
  ['none','black','broad','yellow'],['none','buff','broad','brown'],['none','orange','broad','gray'],
  ['none','yellow','broad','brown'],
];

// ── 테스트셋 (100행, 라벨 비공개) ─────────────────────────────────────────────
const _TEST: R[] = [
  // 독버섯: 나쁜 냄새 (30)
  ['foul','yellow','broad','pink'],['foul','yellow','narrow','buff'],['foul','orange','broad','gray'],
  ['foul','orange','narrow','brown'],['foul','buff','broad','white'],['foul','purple','narrow','pink'],
  ['foul','white','broad','black'],['foul','brown','narrow','white'],['foul','chocolate','broad','red'],
  ['foul','black','narrow','yellow'],
  ['fishy','yellow','broad','pink'],['fishy','orange','narrow','buff'],['fishy','buff','broad','gray'],
  ['fishy','purple','narrow','brown'],['fishy','yellow','broad','white'],
  ['spicy','yellow','broad','pink'],['spicy','orange','narrow','buff'],['spicy','buff','broad','gray'],
  ['spicy','yellow','narrow','brown'],['spicy','orange','broad','white'],
  ['pungent','yellow','broad','pink'],['pungent','orange','narrow','buff'],['pungent','buff','broad','gray'],
  ['pungent','purple','narrow','brown'],['pungent','yellow','narrow','white'],
  ['musty','yellow','broad','pink'],['musty','orange','narrow','buff'],['musty','buff','broad','gray'],
  ['creosote','yellow','broad','pink'],['creosote','orange','narrow','buff'],
  // 독버섯: none + green (10)
  ['none','green','broad','red'],['none','green','narrow','yellow'],['none','green','broad','purple'],
  ['none','green','narrow','red'],['none','green','broad','yellow'],['none','green','narrow','black'],
  ['none','green','broad','chocolate'],['none','green','narrow','green'],['none','green','broad','white'],
  ['none','green','narrow','pink'],
  // 독버섯: none + 비초록 + narrow (8)
  ['none','yellow','narrow','pink'],['none','orange','narrow','gray'],['none','purple','narrow','buff'],
  ['none','buff','narrow','brown'],['none','yellow','narrow','gray'],['none','orange','narrow','pink'],
  ['none','purple','narrow','brown'],['none','yellow','narrow','white'],
  // 식용: almond (18)
  ['almond','yellow','broad','pink'],['almond','orange','broad','gray'],['almond','purple','broad','brown'],
  ['almond','buff','broad','pink'],['almond','yellow','narrow','pink'],['almond','orange','narrow','gray'],
  ['almond','yellow','broad','gray'],['almond','purple','narrow','pink'],['almond','buff','broad','gray'],
  ['almond','yellow','broad','brown'],['almond','orange','broad','pink'],['almond','purple','broad','gray'],
  ['almond','yellow','narrow','gray'],['almond','buff','narrow','pink'],['almond','orange','broad','brown'],
  ['almond','yellow','broad','buff'],['almond','purple','broad','pink'],['almond','orange','narrow','brown'],
  // 식용: anise (18)
  ['anise','yellow','broad','pink'],['anise','orange','broad','gray'],['anise','purple','broad','brown'],
  ['anise','buff','broad','pink'],['anise','yellow','narrow','pink'],['anise','orange','narrow','gray'],
  ['anise','yellow','broad','gray'],['anise','purple','narrow','pink'],['anise','buff','broad','gray'],
  ['anise','yellow','broad','brown'],['anise','orange','broad','pink'],['anise','purple','broad','gray'],
  ['anise','yellow','narrow','gray'],['anise','buff','narrow','pink'],['anise','orange','broad','brown'],
  ['anise','yellow','broad','buff'],['anise','purple','broad','pink'],['anise','orange','narrow','brown'],
  // 식용: none + 비초록 + broad (16)
  ['none','yellow','broad','pink'],['none','orange','broad','gray'],['none','purple','broad','brown'],
  ['none','buff','broad','pink'],['none','yellow','broad','gray'],['none','orange','broad','pink'],
  ['none','purple','broad','pink'],['none','buff','broad','gray'],['none','yellow','broad','brown'],
  ['none','orange','broad','brown'],['none','purple','broad','buff'],['none','buff','broad','brown'],
  ['none','yellow','broad','buff'],['none','orange','broad','buff'],['none','purple','broad','white'],
  ['none','yellow','broad','white'],
];

export const MUSH_TRAIN: DataRow[] = _TRAIN.map(mkRow);
export const MUSH_TEST:  DataRow[] = _TEST.map(mkRow);

// ── CSV 생성 ──────────────────────────────────────────────────────────────────
export function generateTrainCSV(): string {
  const header = 'odor,spore_print_color,gill_size,gill_color,class';
  const rows = _TRAIN.map(([odor, spore, gill_size, gill_color]) =>
    `${odor},${spore},${gill_size},${gill_color},${cls(odor, spore, gill_size)}`
  );
  return [header, ...rows].join('\n');
}
