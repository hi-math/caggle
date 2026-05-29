# 디시전 트리 학습 웹앱 — 빌드 하네스

> 사람이 직접 의사결정나무를 "손으로" 설계하고, 데이터셋에 대한 정확도로 채점받는 학습용 웹앱.
> 본 문서는 구현 사양(스펙)입니다. 프론트엔드 비주얼/인터랙션 지시는 별도 문서(`claude_design_prompt.md`)를 참조하세요.

---

## 1. 개요와 학습 목표

| 항목 | 내용 |
|---|---|
| 학습자 | 디시전 트리 개념을 익히는 학습자(교양/입문 수준) |
| 핵심 활동 | 속성·조건을 직접 입력해 트리를 짓고, 데이터 정확도로 즉시 피드백을 받음 |
| 학습 목표 | (1) 분할(split)·불순도 개념 이해 (2) 연속형/범주형 조건 설계 (3) 과적합 vs 단순성 감각 |
| 채점 철학 | "정답 모델"을 맞히는 게 아니라, **보이지 않는 데이터에 대한 일반화 성능**을 겨룸 |

페이지 구성: ①로그인 ②시뮬레이션 ③연습 ④실전 ⑤리더보드 ⑥어드민(로그인+대시보드).

---

## 2. 기술 스택 (권장)

- **프론트엔드**: Next.js(App Router) + React + TypeScript + Tailwind
- **백엔드/DB/인증**: Supabase (Auth + Postgres + RLS)
  - 리더보드·어드민 점수 확인은 다중 사용자 공유 저장소가 필요하므로 클라이언트 전용 저장(localStorage)으로는 부적합합니다.
- **트리 빌더 UI**: 재귀 카드(nested card) 방식이 기본. 그래프 시각화가 필요하면 `react-flow`를 선택적으로 추가.
- **트리 평가 엔진**: 순수 TypeScript 함수(클라이언트/서버 공용). 최종 채점은 서버(Route Handler 또는 Edge Function)에서 수행해 라벨 노출을 막음.

> 단일 PC 데모만 필요하다면 Supabase 없이 인메모리 + 정적 CSV로도 동작 가능하나, ⑤·⑥ 기능은 제한됩니다.

---

## 3. 데이터 명세

### 3.1 컬럼

| 컬럼 | 타입 | 값 / 범위 | 빌더에서의 조건 종류 |
|---|---|---|---|
| `Age` | numeric(int) | 15 ~ 74 | 임계값 비교 (`>=`, `>`, `<=`, `<`) |
| `Sex` | categorical | `F`, `M` | 일치/불일치 (`==`, `!=`) |
| `BP` | categorical | `HIGH`, `NORMAL`, `LOW` | 일치/불일치 |
| `Cholesterol` | categorical | `HIGH`, `NORMAL` | 일치/불일치 |
| `Na_to_K` | numeric(float) | 6.269 ~ 38.247 | 임계값 비교 |
| `Drug` | **타깃** | `A`, `B`, `C`, `X`, `Y` | 리프 노드의 예측값 |

클래스 분포(전체 200): `Y` 91, `X` 54, `A` 23, `C` 16, `B` 16 → 불균형. 채점 보조지표로 macro-F1 권장.

### 3.2 데이터 분할 규칙

- 200행을 **연습셋 A (100)** / **실전셋 B (100)** 로 분할.
- **층화(stratified) 50:50, 고정 seed=42**. (클래스 비율을 양쪽에 보존 — 불균형 데이터의 평가 안정성 확보)
- 연습셋 A: 라벨 **공개** (즉시 피드백).
- 실전셋 B: 라벨 **비공개**(서버 보관). 학생에게는 정확도/지표만 반환.

재현 가능한 분할 코드(파이썬):
```python
import pandas as pd
from sklearn.model_selection import train_test_split

df = pd.read_csv("drug200.csv")
A, B = train_test_split(df, test_size=0.5, stratify=df["Drug"], random_state=42)
A.to_csv("drug_practice.csv", index=False)   # 연습셋(라벨 공개)
B.to_csv("drug_final.csv",    index=False)   # 실전셋(라벨 서버 보관)
```
> 실전셋 B는 빌드 시 DB에 시드(seed)로 적재하고, 클라이언트로는 라벨 없는 피처만 내려보냅니다.

---

## 4. 데이터 모델 / 스키마

### 4.1 트리 노드 (JSON)

이진 분할로 통일합니다(범주 3수준 BP 등은 `==`/`!=` 중첩으로 표현 → 모델을 단순·균일하게 유지).

```jsonc
// 분할 노드
{
  "id": "uuid",
  "type": "split",
  "attribute": "Na_to_K",            // Age | Sex | BP | Cholesterol | Na_to_K
  "condition": {
    "kind": "numeric",               // numeric | categorical
    "operator": ">=",                // numeric: >=,>,<=,<  | categorical: ==,!=
    "value": 15.015                  // numeric=number, categorical=string
  },
  "children": {
    "true":  { /* 노드 또는 null */ },
    "false": { /* 노드 또는 null */ }
  }
}

// 리프 노드
{ "id": "uuid", "type": "leaf", "prediction": "Y" }   // A|B|C|X|Y
```

루트는 처음에 `null`이며, 사용자가 첫 노드를 추가하면서 트리가 시작됩니다.

### 4.2 DB 테이블 (Supabase / Postgres)

```sql
-- 사용자 프로필 (auth.users 와 1:1)
create table profiles (
  id uuid primary key references auth.users(id),
  username text unique not null,
  role text not null default 'student',   -- 'student' | 'admin'
  created_at timestamptz default now()
);

-- 제출 기록 (연습 저장 + 실전 채점 모두)
create table attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  mode text not null,                      -- 'practice' | 'final'
  tree_json jsonb not null,
  node_count int not null,
  accuracy numeric not null,               -- 0.0 ~ 1.0
  metrics jsonb,                           -- per-class precision/recall/f1, macro_f1, confusion
  submitted_at timestamptz default now()
);
```

RLS 요지:
- `profiles`: 본인 행 select/update. 모든 사용자 username·role은 리더보드용으로 select 허용(또는 뷰로 노출).
- `attempts`: 본인 행 insert/select. **admin은 전체 select**.
- 실전 채점 insert는 서버(Edge Function/서비스 롤)에서 수행 — 점수 위변조 방지.

---

## 5. 디시전 트리 엔진

### 5.1 단일 행 예측 (route)

```text
predict(node, row):
  if node is null        → return UNCLASSIFIED
  if node.type == leaf   → return node.prediction
  v = row[node.attribute]
  if condition(v) is true → predict(node.children.true,  row)
  else                    → predict(node.children.false, row)
```

조건 평가:
- numeric: `row[attr] <op> value` (op ∈ {>=,>,<=,<})
- categorical: `row[attr] <op> value` (op ∈ {==,!=})

### 5.2 채점

- 데이터셋의 모든 행을 route → 예측 vs 실제(`Drug`) 비교.
- `UNCLASSIFIED`(미완성 가지로 흘러간 행)는 **오답** 처리.
- **accuracy = 정답 수 / 전체 수(100)**.
- 보조지표(연습 페이지 기본 노출):
  - 5×5 혼동행렬
  - 클래스별 precision / recall / f1
  - macro-F1 (불균형 보정)
  - `node_count`(트리 크기, 단순성 지표)

### 5.3 검증 규칙

- numeric 임계값이 관측 범위 밖이면 경고(차단은 아님).
- categorical 값은 허용 집합 외 입력 불가(드롭다운).
- 미완성 가지(빈 child)는 시각적으로 표시하고, 채점 시 해당 경로 행을 오답 처리.
- 선택적 안전장치: 최대 깊이/노드 수 상한(예: 깊이 ≤ 8, 노드 ≤ 31)으로 비정상 트리 방지.

---

## 6. 페이지별 기능 명세

### ① 로그인 (`/login`)
- username + password 회원가입/로그인. (또는 익명 + 표시명 방식)
- 성공 시 홈/대시보드로 이동, ②~⑤ 네비 제공.
- 어드민은 동일 로그인 후 role로 분기하거나, 별도 ⑥ 경로 사용.

### ② 시뮬레이션 (`/simulate`) — 개념 이해, 채점 없음
- 연습셋 A(또는 데모 부분집합)를 로드.
- 컨트롤: 속성 선택 + (numeric)임계값 슬라이더/입력 또는 (categorical)값 선택.
- 시각화:
  - 분할 전/후 데이터 분포(클래스별 색).
  - 분할 전/후 **Gini 또는 Entropy** + **Information Gain** 수치.
  - (선택) "최적 분할 추천" 하이라이트, 그리디 1단계 시연.
- 목적: "왜 이 분할이 좋은가"를 수치로 체감.

### ③ 연습 (`/practice`) — 자유 반복
- **트리 빌더**(§7)로 트리 작성.
- 데이터: 연습셋 A(100), 라벨 공개.
- **라이브 피드백**: 편집할 때마다 accuracy, 혼동행렬, 오답 행 목록, 리프별 순도 갱신.
- 횟수 제한 없음. 트리 임시 저장(`attempts.mode='practice'`).
- "실전으로 가져가기" 버튼 → 현재 트리를 ④에 임포트.

### ④ 실전 (`/exam`) — 채점·랭킹
- 동일 트리 빌더.
- 데이터: 실전셋 B(100), **라벨 비공개**(피처만 클라이언트로).
- 제출 → **서버에서 채점** → `attempts.mode='final'` 기록 → 리더보드 반영.
- 결과 노출: accuracy(+선택적 클래스 지표). 행별 정답은 비공개(또는 제출 후 1회 공개 — 설정값).
- 제출 정책: `MAX_FINAL_ATTEMPTS`(기본값 설정). 리더보드는 **최고 점수** 사용.

### ⑤ 리더보드 (`/leaderboard`)
- 정렬: 실전 최고 accuracy 내림차순.
- 컬럼: 순위, username, accuracy, node_count, 제출시각.
- 동점 처리(§8). 본인 행 하이라이트.

### ⑥ 어드민 (`/admin-login` → `/admin`)
- 어드민 인증(role='admin' 확인).
- 전체 실전 제출 조회: 사용자·정확도·트리·지표·시각.
- 실전셋 B 원본(실제 라벨) 열람 + (드릴다운) 사용자별 예측 분포/혼동행렬.
- 코호트 분석(클래스별 평균 성능, 흔한 오답 패턴).
- CSV 내보내기.

---

## 7. 트리 빌더 사양 (③·④ 공용 핵심)

표현 방식: **재귀 카드(nested card)** 트리. 위에서 아래로 가지가 들여쓰기/연결선으로 펼쳐짐.

노드 카드 구성:
- **분할 노드**: 속성 드롭다운 → (자동으로 numeric/categorical 판별) → 연산자 드롭다운 → 값 입력(숫자 입력 또는 값 드롭다운). 아래에 **참(True) / 거짓(False)** 두 자식 슬롯. 삭제 버튼.
- **리프 노드**: 예측 클래스 드롭다운(A/B/C/X/Y). 삭제 버튼.
- **빈 슬롯**: "조건 추가" / "리프 추가" 버튼 노출.

조작:
- 노드 추가/삭제(서브트리 통째 삭제 시 확인).
- 조건 변경은 즉시 상태 반영 → ③에서는 즉시 재채점.
- (선택) 노드 접기/펼치기, 서브트리 복제.

상태 동기화: 트리 JSON이 단일 소스(single source of truth). 빌더 편집 → JSON 갱신 → 평가 엔진 호출 → 지표 패널 갱신.

---

## 8. 리더보드 규칙

- 1차 정렬: accuracy 내림차순.
- 동점 시 타이브레이크(권장 순서):
  1. **node_count 적은 순**(단순한 트리 우대 — 오컴의 면도날, 학습 포인트).
  2. 그래도 같으면 제출 시각 빠른 순.
- 사용자당 1행(최고 실전 점수 기준).

---

## 9. 환경설정 값 (config)

```jsonc
{
  "SPLIT_SEED": 42,
  "PRACTICE_SIZE": 100,
  "FINAL_SIZE": 100,
  "MAX_FINAL_ATTEMPTS": 3,        // null이면 무제한, 최고점 채택
  "REVEAL_FINAL_ROWS": false,     // 제출 후 실전 행별 정답 공개 여부
  "MAX_TREE_DEPTH": 8,
  "MAX_TREE_NODES": 31,
  "IMPURITY": "gini",             // gini | entropy (시뮬레이션 표시)
  "TIEBREAK_BY_NODE_COUNT": true
}
```

---

## 10. 빌드 순서 & 수용 기준

권장 구현 순서:
1. 데이터 분할 + DB 시드(연습/실전 CSV 적재).
2. 트리 평가 엔진(순수 함수) + 단위 테스트.
3. 트리 빌더 컴포넌트(③에서 단독 동작).
4. 인증 + 프로필.
5. 실전 채점(서버) + attempts 기록.
6. 리더보드 → 시뮬레이션 → 어드민.

수용 기준(체크리스트):
- [ ] 동일 트리 JSON에 대해 클라이언트/서버 채점 결과가 일치한다.
- [ ] 미완성 가지로 흘러간 행이 오답으로 집계된다.
- [ ] 실전셋 라벨이 클라이언트 네트워크 응답에 절대 포함되지 않는다.
- [ ] 리더보드가 사용자당 최고 실전 점수만 1행으로 표시한다.
- [ ] 어드민만 전체 attempts와 실전 라벨을 조회할 수 있다(RLS 검증).
- [ ] 연습 페이지 편집 시 accuracy/혼동행렬이 실시간 갱신된다.

---

## 부록 A. 강사용 참고 — 도달 가능 성능

이 데이터는 규칙성이 강해, 잘 설계하면 실전셋에서도 **90% 후반~100%** 도달이 가능합니다. 핵심 분할 감각:
- `Na_to_K` 가 약 15 이상이면 거의 `Y`.
- 그 외에는 `BP`로 가른 뒤, `HIGH`는 `Age`로(낮으면 A, 높으면 B 경향), `LOW`는 `Cholesterol`로(HIGH→C, NORMAL→X 경향), `NORMAL`은 `X` 경향.
> 정답 트리를 학생에게 직접 공개하기보다, 시뮬레이션의 Information Gain으로 스스로 발견하게 유도하는 편이 학습 효과가 큽니다.
