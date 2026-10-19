import type { Grade } from "@/generated/prisma/enums";

/** Google Meet room of every class (ห้อง ม.x/y). */
const MEET: Record<Grade, string[]> = {
  M1: ["g4aanyvb3g", "di3syzisbz", "cdmzm2c4lf", "db5t5ym6fi", "eaqtukpota", "frrkbfxskt", "fw2ck7vfcn", "b4jxt2hiy5", "hcllw7ojz7"],
  M2: ["dc2pxx6hyf", "dba37rk6kt", "enilslluhp", "cypm5ora5e", "ftidhytsqo", "h74wep7clq", "fdtrmdlpfq", "fs3mg7tckh", "d2qgsskbpc"],
  M3: ["b4yqix5lqg", "ep5vcggvab", "ghppn7wsaj", "b3yvn3b6zg", "fji3c2enkc", "hzg7wi6h3z", "b536i4sqym", "cqry4uv2pb", "fnizpzqubl"],
  M4: ["hxdbvrna4v", "cqp3cs7z6o", "efm6ym6jpj", "ccabtwvcgw", "hgc2hleufq", "c4jwmc24hc", "c7kjtczqm7", "hg2nhpt4fo", "f2rluy6xx7"],
  M5: ["bycndqypsv", "gm6677wgxh", "cn6ltn5gkf", "csiq6aasqe", "c7zqlm2yfl", "gcsu3a6w52", "hugb7q5zeg", "esgzqw7vwq", "dzcowsrj2b"],
  M6: ["aofk7uvei2", "aqbai52c3i", "fruyjlu2l3", "b5yhwbe7ar", "c4ofyltofj", "gy2kqj3xnn", "hdy57li5bz", "ddtxakhnwc", "hhm3gp3pcp"],
};

export type Classroom = { room: string; url: string };

export function classroomsOf(grade: Grade): Classroom[] {
  const level = grade.slice(1);
  return MEET[grade].map((code, i) => ({
    room: `${level}/${i + 1}`,
    url: `https://meet.google.com/lookup/${code}`,
  }));
}
