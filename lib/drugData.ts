// lib/drugData.ts — Drug200 practice (100 rows, labels visible) & exam (100 rows, labels hidden from UI)
import type { DataRow } from './treeEngine';

type Raw = [number, string, string, string, number, string];
const mk = ([Age, Sex, BP, Cholesterol, Na_to_K, Drug]: Raw): DataRow =>
  ({ Age, Sex, BP, Cholesterol, Na_to_K, Drug });

// ── Practice set (100 rows, labels VISIBLE) ───────────────────────────────────
export const PRACTICE_DATA: DataRow[] = ([
  // Drug Y — Na_to_K >= 15 (45)
  [23,'F','HIGH','HIGH',25.355,'Y'],[47,'M','LOW','HIGH',20.942,'Y'],
  [35,'M','HIGH','NORMAL',18.043,'Y'],[61,'F','LOW','NORMAL',22.697,'Y'],
  [29,'M','NORMAL','HIGH',16.275,'Y'],[52,'F','HIGH','HIGH',27.184,'Y'],
  [41,'M','LOW','NORMAL',31.502,'Y'],[19,'F','NORMAL','NORMAL',15.772,'Y'],
  [68,'M','HIGH','HIGH',23.956,'Y'],[33,'F','LOW','HIGH',19.348,'Y'],
  [55,'M','NORMAL','HIGH',17.823,'Y'],[27,'F','HIGH','NORMAL',21.109,'Y'],
  [44,'M','LOW','NORMAL',28.634,'Y'],[71,'F','HIGH','HIGH',16.891,'Y'],
  [37,'M','NORMAL','NORMAL',24.517,'Y'],[22,'F','LOW','HIGH',18.732,'Y'],
  [59,'M','HIGH','NORMAL',30.115,'Y'],[46,'F','LOW','NORMAL',15.288,'Y'],
  [31,'M','NORMAL','HIGH',22.451,'Y'],[65,'F','HIGH','HIGH',26.893,'Y'],
  [25,'M','LOW','NORMAL',19.067,'Y'],[50,'F','HIGH','NORMAL',17.542,'Y'],
  [38,'M','LOW','HIGH',23.781,'Y'],[73,'F','NORMAL','NORMAL',28.924,'Y'],
  [28,'M','HIGH','HIGH',16.453,'Y'],[57,'F','LOW','NORMAL',21.876,'Y'],
  [43,'M','HIGH','NORMAL',35.112,'Y'],[18,'F','LOW','HIGH',15.934,'Y'],
  [64,'M','NORMAL','HIGH',19.723,'Y'],[34,'F','HIGH','NORMAL',25.641,'Y'],
  [49,'M','LOW','NORMAL',17.289,'Y'],[21,'F','NORMAL','HIGH',31.847,'Y'],
  [56,'M','HIGH','HIGH',22.163,'Y'],[39,'F','LOW','NORMAL',16.578,'Y'],
  [70,'M','NORMAL','NORMAL',24.892,'Y'],[26,'F','HIGH','HIGH',18.445,'Y'],
  [53,'M','LOW','HIGH',27.316,'Y'],[45,'F','NORMAL','NORMAL',15.103,'Y'],
  [32,'M','HIGH','NORMAL',20.789,'Y'],[67,'F','LOW','HIGH',23.054,'Y'],
  [24,'M','NORMAL','HIGH',17.631,'Y'],[60,'F','HIGH','NORMAL',29.478,'Y'],
  [36,'M','LOW','NORMAL',16.212,'Y'],[48,'F','HIGH','HIGH',22.837,'Y'],
  [74,'M','NORMAL','NORMAL',18.965,'Y'],
  // Drug X — Na_to_K < 15 (27)
  [15,'F','NORMAL','NORMAL',8.607,'X'],[54,'M','NORMAL','HIGH',7.845,'X'],
  [42,'F','NORMAL','NORMAL',12.354,'X'],[66,'M','NORMAL','HIGH',9.612,'X'],
  [30,'F','NORMAL','NORMAL',11.234,'X'],[58,'M','NORMAL','HIGH',13.891,'X'],
  [20,'F','NORMAL','NORMAL',10.445,'X'],[72,'M','NORMAL','HIGH',8.193,'X'],
  [40,'F','NORMAL','NORMAL',12.763,'X'],[16,'M','NORMAL','HIGH',11.582,'X'],
  [63,'F','NORMAL','NORMAL',9.047,'X'],[51,'M','NORMAL','HIGH',14.156,'X'],
  [69,'M','NORMAL','NORMAL',10.891,'X'],[46,'M','NORMAL','HIGH',8.923,'X'],
  [22,'F','NORMAL','NORMAL',12.067,'X'],
  [17,'M','HIGH','NORMAL',7.234,'X'],[33,'F','HIGH','NORMAL',9.756,'X'],
  [61,'M','HIGH','NORMAL',11.267,'X'],[44,'F','HIGH','NORMAL',8.451,'X'],
  [27,'M','HIGH','NORMAL',13.234,'X'],[55,'F','HIGH','NORMAL',10.678,'X'],
  [39,'M','HIGH','NORMAL',12.123,'X'],
  [20,'M','LOW','NORMAL',8.891,'X'],[35,'F','LOW','NORMAL',10.567,'X'],
  [50,'M','LOW','NORMAL',7.123,'X'],[65,'F','LOW','NORMAL',12.456,'X'],
  [44,'M','LOW','NORMAL',9.234,'X'],
  // Drug A — BP=HIGH, Chol=HIGH, Age < 50 (12)
  [28,'M','HIGH','HIGH',8.234,'A'],[34,'F','HIGH','HIGH',10.456,'A'],
  [41,'M','HIGH','HIGH',7.892,'A'],[22,'F','HIGH','HIGH',12.123,'A'],
  [37,'M','HIGH','HIGH',9.567,'A'],[45,'F','HIGH','HIGH',11.345,'A'],
  [19,'M','HIGH','HIGH',8.901,'A'],[32,'F','HIGH','HIGH',13.234,'A'],
  [26,'M','HIGH','HIGH',10.789,'A'],[48,'F','HIGH','HIGH',7.456,'A'],
  [38,'M','HIGH','HIGH',11.678,'A'],[43,'F','HIGH','HIGH',9.012,'A'],
  // Drug B — BP=HIGH, Chol=HIGH, Age >= 50 (8)
  [62,'M','HIGH','HIGH',8.967,'B'],[55,'F','HIGH','HIGH',11.234,'B'],
  [70,'M','HIGH','HIGH',7.123,'B'],[58,'F','HIGH','HIGH',12.456,'B'],
  [64,'M','HIGH','HIGH',9.789,'B'],[52,'F','HIGH','HIGH',10.234,'B'],
  [73,'M','HIGH','HIGH',8.345,'B'],[67,'F','HIGH','HIGH',11.567,'B'],
  // Drug C — BP=LOW, Chol=HIGH (8)
  [36,'M','LOW','HIGH',7.845,'C'],[49,'F','LOW','HIGH',10.123,'C'],
  [23,'M','LOW','HIGH',12.567,'C'],[61,'F','LOW','HIGH',8.234,'C'],
  [44,'M','LOW','HIGH',11.456,'C'],[29,'F','LOW','HIGH',9.678,'C'],
  [56,'M','LOW','HIGH',7.234,'C'],[38,'F','LOW','HIGH',13.123,'C'],
] as Raw[]).map(mk);

// ── Exam set (100 rows — labels NOT shown to user in UI) ──────────────────────
export const EXAM_DATA: DataRow[] = ([
  // Drug Y (46)
  [21,'F','LOW','HIGH',24.124,'Y'],[48,'M','HIGH','NORMAL',19.876,'Y'],
  [33,'F','NORMAL','HIGH',17.234,'Y'],[62,'M','HIGH','HIGH',26.543,'Y'],
  [27,'F','LOW','NORMAL',21.789,'Y'],[51,'M','NORMAL','NORMAL',15.432,'Y'],
  [39,'F','HIGH','HIGH',28.967,'Y'],[74,'M','LOW','HIGH',20.123,'Y'],
  [16,'F','NORMAL','NORMAL',16.875,'Y'],[55,'M','HIGH','NORMAL',23.456,'Y'],
  [30,'F','LOW','HIGH',18.234,'Y'],[68,'M','NORMAL','HIGH',31.789,'Y'],
  [43,'F','HIGH','NORMAL',22.567,'Y'],[25,'M','LOW','NORMAL',17.891,'Y'],
  [60,'F','HIGH','HIGH',25.234,'Y'],[37,'M','NORMAL','NORMAL',19.456,'Y'],
  [53,'F','LOW','HIGH',21.123,'Y'],[18,'M','HIGH','NORMAL',15.678,'Y'],
  [72,'F','NORMAL','HIGH',27.234,'Y'],[45,'M','LOW','NORMAL',16.789,'Y'],
  [28,'F','HIGH','HIGH',23.567,'Y'],[66,'M','NORMAL','NORMAL',18.345,'Y'],
  [41,'F','LOW','HIGH',20.678,'Y'],[23,'M','HIGH','NORMAL',15.234,'Y'],
  [57,'F','NORMAL','HIGH',24.789,'Y'],[34,'M','HIGH','HIGH',17.567,'Y'],
  [69,'F','LOW','NORMAL',22.123,'Y'],[46,'M','NORMAL','NORMAL',19.234,'Y'],
  [29,'F','HIGH','HIGH',26.789,'Y'],[63,'M','LOW','HIGH',21.456,'Y'],
  [38,'F','NORMAL','NORMAL',16.234,'Y'],[52,'M','HIGH','NORMAL',23.789,'Y'],
  [19,'F','LOW','HIGH',15.567,'Y'],[70,'M','NORMAL','HIGH',28.123,'Y'],
  [42,'F','HIGH','HIGH',20.345,'Y'],[26,'M','LOW','NORMAL',17.678,'Y'],
  [59,'F','NORMAL','NORMAL',22.456,'Y'],[35,'M','HIGH','HIGH',16.123,'Y'],
  [64,'F','LOW','HIGH',24.234,'Y'],[47,'M','NORMAL','NORMAL',19.789,'Y'],
  [22,'F','HIGH','NORMAL',15.345,'Y'],[73,'M','LOW','HIGH',21.678,'Y'],
  [31,'F','NORMAL','HIGH',18.567,'Y'],[56,'M','HIGH','NORMAL',25.123,'Y'],
  [40,'F','LOW','NORMAL',17.234,'Y'],[65,'M','NORMAL','HIGH',20.789,'Y'],
  // Drug X (27)
  [16,'F','NORMAL','NORMAL',9.234,'X'],[53,'M','NORMAL','HIGH',8.567,'X'],
  [41,'F','NORMAL','NORMAL',13.123,'X'],[67,'M','NORMAL','HIGH',10.456,'X'],
  [29,'F','NORMAL','NORMAL',11.789,'X'],[59,'M','NORMAL','HIGH',7.234,'X'],
  [21,'F','NORMAL','NORMAL',12.567,'X'],[71,'M','NORMAL','HIGH',9.123,'X'],
  [39,'F','NORMAL','NORMAL',13.456,'X'],[15,'M','NORMAL','HIGH',10.789,'X'],
  [64,'F','NORMAL','NORMAL',8.234,'X'],[52,'M','NORMAL','HIGH',11.567,'X'],
  [68,'M','NORMAL','NORMAL',9.678,'X'],[45,'M','NORMAL','HIGH',12.123,'X'],
  [23,'F','NORMAL','NORMAL',7.891,'X'],
  [18,'M','HIGH','NORMAL',8.678,'X'],[34,'F','HIGH','NORMAL',10.234,'X'],
  [62,'M','HIGH','NORMAL',12.789,'X'],[43,'F','HIGH','NORMAL',9.012,'X'],
  [28,'M','HIGH','NORMAL',11.456,'X'],[56,'F','HIGH','NORMAL',7.678,'X'],
  [37,'M','HIGH','NORMAL',13.234,'X'],
  [25,'M','LOW','NORMAL',9.345,'X'],[40,'F','LOW','NORMAL',11.234,'X'],
  [55,'M','LOW','NORMAL',8.567,'X'],[70,'F','LOW','NORMAL',12.789,'X'],
  [33,'M','LOW','NORMAL',10.123,'X'],
  // Drug A (11)
  [27,'M','HIGH','HIGH',9.123,'A'],[33,'F','HIGH','HIGH',11.456,'A'],
  [40,'M','HIGH','HIGH',8.234,'A'],[21,'F','HIGH','HIGH',12.678,'A'],
  [36,'M','HIGH','HIGH',10.123,'A'],[44,'F','HIGH','HIGH',7.567,'A'],
  [18,'M','HIGH','HIGH',9.789,'A'],[31,'F','HIGH','HIGH',13.456,'A'],
  [25,'M','HIGH','HIGH',11.234,'A'],[49,'F','HIGH','HIGH',8.012,'A'],
  [42,'M','HIGH','HIGH',10.567,'A'],
  // Drug B (8)
  [61,'F','HIGH','HIGH',9.234,'B'],[54,'M','HIGH','HIGH',11.789,'B'],
  [72,'F','HIGH','HIGH',8.012,'B'],[57,'M','HIGH','HIGH',12.123,'B'],
  [63,'F','HIGH','HIGH',10.456,'B'],[51,'M','HIGH','HIGH',7.789,'B'],
  [74,'F','HIGH','HIGH',9.012,'B'],[66,'M','HIGH','HIGH',11.234,'B'],
  // Drug C (8)
  [37,'M','LOW','HIGH',8.567,'C'],[50,'F','LOW','HIGH',11.123,'C'],
  [24,'M','LOW','HIGH',9.234,'C'],[62,'F','LOW','HIGH',7.456,'C'],
  [43,'M','LOW','HIGH',10.789,'C'],[28,'F','LOW','HIGH',12.345,'C'],
  [57,'M','LOW','HIGH',8.234,'C'],[39,'F','LOW','HIGH',9.678,'C'],
] as Raw[]).map(mk);

// ── CSV 생성 (훈련셋 100행) ────────────────────────────────────────────────────
export function generateDrugTrainCSV(): string {
  const header = 'Age,Sex,BP,Cholesterol,Na_to_K,Drug';
  const rows = PRACTICE_DATA.map(r =>
    `${r.Age},${r.Sex},${r.BP},${r.Cholesterol},${r.Na_to_K},${r.Drug}`
  );
  return [header, ...rows].join('\n');
}
