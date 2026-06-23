if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_PROD_SEED) {
  console.error('Cannot run seed in production!');
  process.exit(1);
}

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  TaskType,
  SkillCode,
  LessonSlot,
} from "../generated/prisma";

const isDryRun = process.argv.includes("--dry-run");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function parseGradeBand(raw: string): string[] {
  if (raw.includes("-")) return raw.split("-");
  return [raw];
}

function parseStringArray(raw: string, sep = ","): string[] {
  return raw
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Only S1â€“S8 are valid SkillCode enum values; drop stray tags.
function parseSkillTags(raw: string): string[] {
  const valid = new Set(["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"]);
  return parseStringArray(raw).filter((s) => valid.has(s));
}

const LEVEL_CODES = ["M0", "M1", "M2", "M3", "M4", "M5"];

function buildGradeLevels(gradeBand: string[], levelTarget: string): string[] {
  const rangeMatch = levelTarget.match(/^(M[0-5])-(M[0-5])$/);
  let levels: string[];
  if (rangeMatch) {
    const start = LEVEL_CODES.indexOf(rangeMatch[1]);
    const end = LEVEL_CODES.indexOf(rangeMatch[2]);
    levels = start >= 0 && end >= 0 ? LEVEL_CODES.slice(start, end + 1) : ["M0"];
  } else {
    levels = LEVEL_CODES.includes(levelTarget) ? [levelTarget] : ["M0"];
  }
  const cells: string[] = [];
  for (const g of gradeBand) {
    for (const l of levels) cells.push(`${g}:${l}`);
  }
  return cells;
}

// â”€â”€â”€ Word seed data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const wordRows = [
  ["W001","Ð½Ð¾Ð¼","ÐÑÑ€ Ò¯Ð³","G1","3","1","S1,S2","A2,B1","1","1","Ñ†Ð°Ð³Ð°Ð°Ð½ Ð´ÑÐ²ÑÐ³ÑÑ€ Ð´ÑÑÑ€ Ð³Ð°Ð½Ñ† Ð½Ð¾Ð¼, Ñ…Ò¯Ò¯Ñ…Ð´ÑÐ´ Ð¾Ð¹Ð»Ð³Ð¾Ð¼Ð¶Ñ‚Ð¾Ð¹ ÑÐ½Ð³Ð¸Ð¹Ð½ Ð·ÑƒÑ€Ð°Ð³","Ð½Ð¾Ð¼","Ð­Ð½Ñ Ð±Ð¾Ð» Ð½Ð¾Ð¼.","Ð½ÑƒÐ¼; Ð¼Ð¾Ð´","Ð½_Ð¼"],
  ["W002","Ð½ÑƒÐ¼","ÐÑÑ€ Ò¯Ð³","G1","3","1","S1,S2","A1,A2","1","1","Ñ†Ð°Ð³Ð°Ð°Ð½ Ð´ÑÐ²ÑÐ³ÑÑ€ Ð´ÑÑÑ€ Ð½ÑƒÐ¼ ÑÑƒÐ¼Ð³Ò¯Ð¹Ð³ÑÑÑ€, ÑÐ½Ð³Ð¸Ð¹Ð½ Ð´Ò¯Ñ€ÑÐ»ÑÐ»","Ð½ÑƒÐ¼","ÐÑƒÐ¼ Ó©Ð»Ð³Ó©Ó©Ñ‚ÑÐ¹ Ð±Ð°Ð¹Ð½Ð°.","Ð½Ð¾Ð¼; Ð½ÑƒÑƒÑ€","Ð½_Ð¼"],
  ["W003","Ð¼Ð¾Ð´","ÐÑÑ€ Ò¯Ð³","G1","3","1","S1,S2","A1,B1","1","1","Ð½Ð¾Ð³Ð¾Ð¾Ð½ Ð½Ð°Ð²Ñ‡Ñ‚Ð°Ð¹ Ð³Ð°Ð½Ñ† Ð¼Ð¾Ð´","Ð¼Ð¾Ð´","Ð¥Ð°ÑˆÐ°Ð°Ð½Ð´ Ð¼Ð¾Ð´ Ð±Ð°Ð¹Ð½Ð°.","Ð½Ð¾Ð¼; Ð¼Ð¾Ð»","Ð¼_Ð´"],
  ["W004","Ð³ÑÑ€","ÐÑÑ€ Ò¯Ð³","G1","4","1","S2,S7","B1,D5","1","1","Ð¼Ð¾Ð½Ð³Ð¾Ð» Ð³ÑÑ€Ð¸Ð¹Ð³ ÑƒÑ€Ð´Ð°Ð°Ñ Ñ…Ð°Ñ€ÑƒÑƒÐ»ÑÐ°Ð½ ÑÐ½Ð³Ð¸Ð¹Ð½ Ð·ÑƒÑ€Ð°Ð³","Ð³ÑÑ€","Ð”ÑƒÐ»Ð°Ð°Ñ…Ð°Ð½ Ð³ÑÑ€.","Ð³Ð°Ñ€; Ð³Ó©Ð»","Ð³Ñ_"],
  ["W005","Ð½Ð°Ñ€","ÐÑÑ€ Ò¯Ð³","G1","3","1","S1,S2","A1,D5","1","1","Ð¸Ð½ÑÑÐ¼ÑÑÐ³Ð»ÑÑÑÐ½ Ð±Ð¸Ñˆ, ÑÐ½Ð³Ð¸Ð¹Ð½ ÑˆÐ°Ñ€ Ð½Ð°Ñ€","Ð½Ð°Ñ€","ÐÐ°Ñ€ Ð¼Ð°Ð½Ð´Ð»Ð°Ð°.","ÑÐ°Ñ€; Ð½ÑƒÑ€","Ð½_Ñ€"],
  ["W006","ÑÐ°Ñ€","ÐÑÑ€ Ò¯Ð³","G1","3","1","S1,S2","A1,D5","1","1","ÑˆÓ©Ð½Ð¸Ð¹Ð½ Ñ‚ÑÐ½Ð³ÑÑ€Ð³Ò¯Ð¹Ð³ÑÑÑ€ Ð³Ð°Ð½Ñ† Ñ…Ð°Ð²Ð¸Ñ€Ð³Ð°Ð½ ÑÐ°Ñ€","ÑÐ°Ñ€","Ð¡Ð°Ñ€ Ñ‚Ð¾Ð´ Ð±Ð°Ð¹Ð½Ð°.","Ð½Ð°Ñ€; ÑÐ¾Ñ€","Ñ_Ñ€"],
  ["W007","ÑƒÑ","ÐÑÑ€ Ò¯Ð³","G1","2","1","S1,S2","A1","1","1","ÑƒÑÑ‚Ð°Ð¹ Ð°ÑÐ³Ð° ÑÑÐ²ÑÐ» ÑƒÑÐ½Ñ‹ Ð´ÑƒÑÐ°Ð»","ÑƒÑ","Ð£Ñ Ñ‚ÑƒÐ½Ð³Ð°Ð»Ð°Ð³.","Ò¯Ñ; Ò¯Ð½Ñ","_Ñ"],
  ["W008","Ñ†Ð°Ñ","ÐÑÑ€ Ò¯Ð³","G1","3","1","S2,S3","B1,C1","1","1","Ñ†Ð°Ð³Ð°Ð°Ð½ Ñ†Ð°ÑÐ°Ð½ Ð¾Ð²Ð¾Ð¾","Ñ†Ð°Ñ","Ð¦Ð°Ñ Ð¾Ñ€Ð»Ð¾Ð¾.","Ñ†ÑÑ†; Ñ‚Ð°Ñ","Ñ†_Ñ"],
  ["W009","Ð¼Ð°Ð»","ÐÑÑ€ Ò¯Ð³","G1","3","1","S2,S5","B1,E1","1","1","Ð¼Ð°Ð»Ñ‹Ð½ ÐµÑ€Ó©Ð½Ñ…Ð¸Ð¹ ÑÐ½Ð³Ð¸Ð¹Ð½ Ð´Ò¯Ñ€Ñ, Ð¾Ð»Ð¾Ð½ Ð°Ð¼ÑŒÑ‚Ð°Ð½ Ð±Ð¸Ñˆ","Ð¼Ð°Ð»","ÐœÐ°Ð» Ð±ÑÐ»Ñ‡Ð¸Ð½Ñ.","Ð¼Ð°Ð»Ð´; Ð¼Ð¾Ð»","Ð¼_Ð»"],
  ["W010","Ð³Ð°Ð»","ÐÑÑ€ Ò¯Ð³","G1","3","1","S1,S2","A1,B1","1","1","Ð°ÑŽÑƒÐ»Ð³Ò¯Ð¹, Ð¶Ð¸Ð¶Ð¸Ð³ Ð³Ð°Ð»Ñ‹Ð½ Ð´Ó©Ð»","Ð³Ð°Ð»","Ð“Ð°Ð» Ð´Ò¯Ñ€ÑÐ»Ð·ÑÐ².","Ð³Ð°Ñ€; Ð³Ð¾Ð»","Ð³_Ð»"],
  ["W011","Ñ‚Ð¾Ð³Ð¾Ð¾","ÐÑÑ€ Ò¯Ð³","G1-G2","5","2","S3,S2","C1,C2","1","1","Ð³Ð°Ð» Ð´ÑÑÑ€ Ð±Ð¸Ñˆ, Ð³Ð°Ð½Ñ† Ñ‚Ð¾Ð³Ð¾Ð¾","Ñ‚Ð¾Ð³Ð¾Ð¾","Ð¢Ð¾Ð³Ð¾Ð¾ Ñ‚Ð¾Ð¼.","Ñ‚Ð¾Ð³Ð¾; Ñ‚Ð¾Ð³ÑƒÑƒ","Ñ‚_Ð³_Ð¾"],
  ["W012","Ð±Ó©Ð¼Ð±Ó©Ð³","ÐÑÑ€ Ò¯Ð³","G1-G2","6","2","S2,S3","B1,C1","1","1","ÑƒÐ»Ð°Ð°Ð½ Ð±Ó©Ð¼Ð±Ó©Ð³, Ñ†Ð°Ð³Ð°Ð°Ð½ Ð´ÑÐ²ÑÐ³ÑÑ€Ñ‚ÑÐ¹","Ð±Ó©Ð¼Ð±Ó©Ð³","Ð‘Ð¸ Ð±Ó©Ð¼Ð±Ó©Ð³ ÑˆÐ¸Ð´ÑÐ².","Ð±Ó©Ð¼Ð±Ó©Ð³Ð³; Ð±Ó©Ð¼Ð±Ó©Ð³Ó©","Ð±Ó©Ð¼Ð±_Ð³"],
  ["W013","ÑˆÑƒÐ²ÑƒÑƒ","ÐÑÑ€ Ò¯Ð³","G1-G2","6","2","S3,S2","C1,C2","1","1","Ð³Ð°Ð½Ñ† Ð¶Ð¸Ð¶Ð¸Ð³ ÑˆÑƒÐ²ÑƒÑƒ","ÑˆÑƒÐ²ÑƒÑƒ","Ð¨ÑƒÐ²ÑƒÑƒ Ð½Ð¸ÑÑÐ².","ÑˆÑƒÐ²Ñƒ; ÑˆÑƒÐ²Ò¯Ò¯","ÑˆÑƒÐ²_Ñƒ"],
  ["W014","Ñ…Ò¯Ò¯Ñ…ÑÐ´","ÐÑÑ€ Ò¯Ð³","G1-G2","6","2","S2,S3","B3,C4","1","1","Ñ…Ò¯Ò¯Ñ…ÑÐ´ Ð³Ð°Ð½Ñ†Ð°Ð°Ñ€Ð°Ð° Ð·Ð¾Ð³ÑÐ¾Ð¶ Ð±ÑƒÐ¹ ÑÐ½Ð³Ð¸Ð¹Ð½ Ð·ÑƒÑ€Ð°Ð³","Ñ…Ò¯Ò¯Ñ…ÑÐ´","Ð¥Ò¯Ò¯Ñ…ÑÐ´ Ð¸Ð½ÑÑÐ².","Ñ…Ò¯Ò¯Ñ…ÑÐ´Ð´; Ñ…Ò¯Ò¯Ñ…Ð´","Ñ…Ò¯Ò¯_ÑÐ´"],
  ["W015","Ñ†ÑÑ†ÑÐ³","ÐÑÑ€ Ò¯Ð³","G1-G2","6","2","S2,S3","B1,C1","1","1","Ð³Ð°Ð½Ñ† Ñ†ÑÑ†ÑÐ³, ÑÐ½Ð³Ð¸Ð¹Ð½ Ð´Ò¯Ñ€Ñ","Ñ†ÑÑ†ÑÐ³","Ð¦ÑÑ†ÑÐ³ ÑƒÑ€Ð³Ð°Ð².","Ñ†ÑÑ†ÑÐ³Ð³; Ñ†ÑÑ†ÑÐ³Ó©","Ñ†ÑÑ†_Ð³"],
  ["W016","Ð°Ð²Ð´Ð°Ñ€","ÐÑÑ€ Ò¯Ð³","G2","6","2","S2,S3,S4","C4,D5","1","1","Ð¼Ð¾Ð´Ð¾Ð½ Ð°Ð²Ð´Ð°Ñ€, ÑƒÑ€Ð´Ð°Ð°Ñ Ñ…Ð°Ñ€ÑÐ°Ð½","Ð°Ð²Ð´Ð°Ñ€","ÐÐ²Ð´Ð°Ñ€ Ó©Ñ€Ó©Ó©Ð½Ð´ Ð±Ð°Ð¹Ð½Ð°.","Ð°Ð²Ð´Ñ€; Ð°Ð²Ñ‚Ð°Ñ€","Ð°Ð²Ð´_Ñ€"],
  ["W017","Ó©Ð½Ð´Ó©Ð³","ÐÑÑ€ Ò¯Ð³","G1-G2","5","2","S2,S3,S4","C1,D5","1","1","Ð³Ð°Ð½Ñ† Ó©Ð½Ð´Ó©Ð³ ÑÑÐ²ÑÐ» Ñ…Ð¾Ñ‘Ñ€ Ó©Ð½Ð´Ó©Ð³","Ó©Ð½Ð´Ó©Ð³","Ó¨Ð½Ð´Ó©Ð³ Ñ‡Ð°Ð½Ð°Ð².","Ó©Ð½Ð´Ó©Ð³Ð³; Ó©Ð½Ð´_Ð³","Ó©Ð½Ð´_Ð³"],
  ["W018","Ð´ÑÐ²Ñ‚ÑÑ€","ÐÑÑ€ Ò¯Ð³","G1-G2","7","2","S2,S3,S4","C4,D5","1","1","Ñ…Ð°Ð°Ð»Ñ‚Ñ‚Ð°Ð¹ Ð´ÑÐ²Ñ‚ÑÑ€","Ð´ÑÐ²Ñ‚ÑÑ€","Ð”ÑÐ²Ñ‚ÑÑ€ Ñ†ÑÐ²ÑÑ€.","Ð´ÑÐ²Ñ‚Ñ€; Ð´ÑÐ²Ñ‚ÑÑ€Ñ€","Ð´ÑÐ²Ñ‚_Ñ€"],
  ["W019","ÑÐ°Ð½Ð´Ð°Ð»","ÐÑÑ€ Ò¯Ð³","G1-G2","7","2","S2,S3,S4","C4,D5","1","1","Ð³Ð°Ð½Ñ† ÑÐ°Ð½Ð´Ð°Ð», Ñ…Ð°Ð¶ÑƒÑƒ Ñ‚Ð°Ð»Ð°Ð°Ñ","ÑÐ°Ð½Ð´Ð°Ð»","Ð¡Ð°Ð½Ð´Ð°Ð» Ð¼Ð¾Ð´Ð¾Ð½.","ÑÐ°Ð½Ð´Ð»; ÑÐ°Ð½Ð´Ð°Ð»Ð´","ÑÐ°Ð½Ð´_Ð»"],
  ["W020","Ñ†Ð¾Ð½Ñ…","ÐÑÑ€ Ò¯Ð³","G1-G2","4","1","S2,S3","B1,C4","1","1","Ð±Ð°Ð¹ÑˆÐ¸Ð½Ð³Ð¸Ð¹Ð½ Ð³Ð°Ð½Ñ† Ñ†Ð¾Ð½Ñ…","Ñ†Ð¾Ð½Ñ…","Ð¦Ð¾Ð½Ñ… Ð½ÑÑÐ»Ñ‚Ñ‚ÑÐ¹.","Ñ†Ð¾Ð½Ñ…Ñ…; Ñ†Ð¾Ð½_","Ñ†Ð¾Ð½_"],
  ["W021","Ñ…Ð°Ñ€Ð°Ð½Ð´Ð°Ð°","ÐÑÑ€ Ò¯Ð³","G2","8","3","S2,S3","C4,B3","1","1","ÑˆÐ°Ñ€ Ñ…Ð°Ñ€Ð°Ð½Ð´Ð°Ð° Ð³Ð°Ð½Ñ†Ð°Ð°Ñ€Ð°Ð°","Ñ…Ð°Ñ€Ð°Ð½Ð´Ð°Ð°","Ð¥Ð°Ñ€Ð°Ð½Ð´Ð°Ð° Ñ…ÑƒÑ€Ñ†.","Ñ…Ð°Ñ€Ð°Ð½Ð´Ð°; Ñ…Ð°Ñ€Ð°Ð½Ð´Ð°Ð°Ð°","Ñ…Ð°Ñ€Ð°Ð½Ð´_Ð°"],
  ["W022","ÑÒ¯Ò¯","ÐÑÑ€ Ò¯Ð³","G1-G2","3","1","S3,S7","C1,H1","1","1","ÑˆÐ¸Ð»ÑÐ½ Ð°ÑÐ³Ð°Ñ‚Ð°Ð¹ ÑÒ¯Ò¯","ÑÒ¯Ò¯","Ð¡Ò¯Ò¯ Ñ†Ð°Ð³Ð°Ð°Ð½.","ÑÑƒ; ÑÒ¯","Ñ_Ò¯"],
  ["W023","Ð°Ð»Ð¸Ð¼","ÐÑÑ€ Ò¯Ð³","G1-G2","4","2","S2,S7","B1,H1","1","1","ÑƒÐ»Ð°Ð°Ð½ Ð°Ð»Ð¸Ð¼ Ð³Ð°Ð½Ñ†Ð°Ð°Ñ€Ð°Ð°","Ð°Ð»Ð¸Ð¼","ÐÐ»Ð¸Ð¼ Ð°Ð¼Ñ‚Ñ‚Ð°Ð¹.","Ð°Ð»Ð¸Ð¼Ð¼; Ð°Ð»_Ð¼","Ð°Ð»_Ð¼"],
  ["W024","Ð³ÑƒÑ‚Ð°Ð»","ÐÑÑ€ Ò¯Ð³","G1-G2","5","2","S2,S7","B1,H1","1","1","Ñ…Ð¾Ñ Ð³ÑƒÑ‚Ð°Ð»","Ð³ÑƒÑ‚Ð°Ð»","Ð“ÑƒÑ‚Ð°Ð» Ñ†ÑÐ²ÑÑ€.","Ð³ÑƒÑ‚Ð»; Ð³ÑƒÑ‚Ð°Ð»Ð»","Ð³ÑƒÑ‚_Ð»"],
  ["W025","Ñ‚ÑƒÑƒÐ»Ð°Ð¹","ÐÑÑ€ Ò¯Ð³","G2","6","2","S3,S2","C1,B1","1","1","Ñ†Ð°Ð³Ð°Ð°Ð½ Ñ‚ÑƒÑƒÐ»Ð°Ð¹ Ð³Ð°Ð½Ñ†Ð°Ð°Ñ€Ð°Ð°","Ñ‚ÑƒÑƒÐ»Ð°Ð¹","Ð¢ÑƒÑƒÐ»Ð°Ð¹ Ñ…ÑƒÑ€Ð´Ð°Ð½.","Ñ‚ÑƒÑƒÐ»Ð°Ð¹Ð¹; Ñ‚ÑƒÐ»Ð°Ð¹","Ñ‚_ÑƒÐ»Ð°Ð¹"],
  ["W026","Ð±Ð°Ð³Ñˆ","ÐÑÑ€ Ò¯Ð³","G2","5","1","S2,S6","B1,G1","1","1","Ð±Ð°Ð³Ñˆ ÑÐ°Ð¼Ð±Ð°Ñ€Ñ‹Ð½ Ó©Ð¼Ð½Ó© Ð±Ð¸Ñˆ, ÑÐ½Ð³Ð¸Ð¹Ð½ Ñ…Ó©Ñ€Ó©Ð³ Ð¼Ð°ÑÐ³Ð°Ð°Ñ€","Ð±Ð°Ð³Ñˆ","Ð‘Ð°Ð³Ñˆ Ð¸Ñ€Ð»ÑÑ.","Ð±Ð°Ð³Ñˆ.","Ð±Ð°Ð³_"],
  ["W027","ÑÑƒÑ€Ð³ÑƒÑƒÐ»ÑŒ","ÐÑÑ€ Ò¯Ð³","G2","8","2","S5,S6","E1,G1","1","1","ÑÑƒÑ€Ð³ÑƒÑƒÐ»Ð¸Ð¹Ð½ Ð±Ð°Ñ€Ð¸Ð»Ð³Ñ‹Ð½ ÑÐ½Ð³Ð¸Ð¹Ð½ Ð·ÑƒÑ€Ð°Ð³","ÑÑƒÑ€Ð³ÑƒÑƒÐ»ÑŒ","Ð¡ÑƒÑ€Ð³ÑƒÑƒÐ»ÑŒ ÑÑ…ÑÐ»Ð»ÑÑ.","ÑÑƒÑ€Ð³ÑƒÑƒÐ»Ð¸; ÑÑƒÑ€Ð³ÑƒÐ»ÑŒ","ÑÑƒÑ€Ð³ÑƒÑƒ_ÑŒ"],
  ["W028","Ñ…Ð¾Ð¾Ð»","ÐÑÑ€ Ò¯Ð³","G1-G2","4","1","S3,S5","C1,E1","1","1","ÑƒÑƒÑ€ ÑÐ°Ð²ÑÑÐ°Ð½ Ð°ÑÐ³Ð° Ñ…Ð¾Ð¾Ð»","Ñ…Ð¾Ð¾Ð»","Ð¥Ð¾Ð¾Ð» Ñ…Ð°Ð»ÑƒÑƒÐ½.","Ñ…Ð¾Ð»; Ñ…Ð¾Ð¾Ð»Ð»","Ñ…_Ð¾Ð»"],
  ["W029","ÑÑÐ¶","ÐÑÑ€ Ò¯Ð³","G1-G2","3","1","S3,S6","C1,G1","1","1","ÑÑÐ¶ Ð¸Ð½ÑÑÐ¼ÑÑÐ³Ð»ÑÐ¶ Ð·Ð¾Ð³ÑÐ¾Ð¶ Ð±ÑƒÐ¹ ÑÐ½Ð³Ð¸Ð¹Ð½ Ð·ÑƒÑ€Ð°Ð³","ÑÑÐ¶","Ð­ÑÐ¶ Ð¸Ñ€ÑÐ².","ÑÐ¶; ÑÑÐ¶.","_ÑÐ¶"],
  ["W030","Ð°Ð°Ð²","ÐÑÑ€ Ò¯Ð³","G1-G2","3","1","S3,S6","C1,G1","1","1","Ð°Ð°Ð² ÑÐ½Ð³Ð¸Ð¹Ð½ Ñ…Ó©Ñ€Ó©Ð³","Ð°Ð°Ð²","ÐÐ°Ð² Ð°Ð¶Ð¸Ð»Ð»Ð°Ð².","Ð°Ð²; Ð°Ð°Ð².","_Ð°Ð²"],
  ["W031","Ð‘Ð°Ñ‚","ÐžÐ½Ð¾Ð¾ÑÐ¾Ð½ Ð½ÑÑ€","G2","3","1","S6","G1","0","1","Ð·ÑƒÑ€Ð°Ð³ Ñ…ÑÑ€ÑÐ³Ð»ÑÑ…Ð³Ò¯Ð¹","Ð‘Ð°Ñ‚","Ð‘Ð°Ñ‚ Ð¸Ñ€Ð»ÑÑ.","Ð±Ð°Ñ‚","Ð‘_Ñ‚"],
  ["W032","Ð±Ð¸ ÑÐ²Ð½Ð°","Ð‘Ð¾Ð³Ð¸Ð½Ð¾ Ó©Ð³Ò¯Ò¯Ð»Ð±ÑÑ€","G1-G2","7","3","S6","G1,G2","0","1","Ð·ÑƒÑ€Ð°Ð³ Ñ…ÑÑ€ÑÐ³Ð»ÑÑ…Ð³Ò¯Ð¹","Ð‘Ð¸ ÑÐ²Ð½Ð°.","Ð‘Ð¸ ÑÐ²Ð½Ð°.","Ð±Ð¸ ÑÐ²Ð½Ð°","Ð±Ð¸ ÑÐ²Ð½Ð°"],
  ["W033","Ñ‚ÑÑ€ Ð¸Ñ€ÑÐ²","Ð‘Ð¾Ð³Ð¸Ð½Ð¾ Ó©Ð³Ò¯Ò¯Ð»Ð±ÑÑ€","G1-G2","8","3","S6","G1,G2","0","1","Ð·ÑƒÑ€Ð°Ð³ Ñ…ÑÑ€ÑÐ³Ð»ÑÑ…Ð³Ò¯Ð¹","Ð¢ÑÑ€ Ð¸Ñ€ÑÐ².","Ð¢ÑÑ€ Ð¸Ñ€ÑÐ².","Ñ‚ÑÑ€ Ð¸Ñ€ÑÐ²","Ñ‚ÑÑ€ Ð¸Ñ€ÑÐ²"],
  ["W034","Ð½Ð¾Ð¼Ð¾Ð¾","Ð—Ð°Ð»Ð³Ð°Ð²Ð°Ñ€Ñ‚Ð°Ð¹ Ò¯Ð³","G2","5","2","S5","E1,E2","0","1","Ð·ÑƒÑ€Ð°Ð³ Ñ…ÑÑ€ÑÐ³Ð»ÑÑ…Ð³Ò¯Ð¹","Ð½Ð¾Ð¼Ð¾Ð¾","Ð‘Ð¸ Ð½Ð¾Ð¼Ð¾Ð¾ Ð°Ð²Ð»Ð°Ð°.","Ð½Ð¾Ð¼Ð¾; Ð½Ð¾Ð¼Ð°Ð°","Ð½Ð¾Ð¼_Ð¾"],
  ["W035","Ð³ÑÑ€Ñ‚","Ð—Ð°Ð»Ð³Ð°Ð²Ð°Ñ€Ñ‚Ð°Ð¹ Ò¯Ð³","G2","4","1","S5","E1,E2","0","1","Ð·ÑƒÑ€Ð°Ð³ Ñ…ÑÑ€ÑÐ³Ð»ÑÑ…Ð³Ò¯Ð¹","Ð³ÑÑ€Ñ‚","Ð‘Ð¸ Ð³ÑÑ€Ñ‚ÑÑ Ð±Ð°Ð¹Ð½Ð°.","Ð³ÑÑ€Ð´; Ð³ÑÑ€","Ð³ÑÑ€_"],
  ["W036","Ð¼Ð¾Ñ€ÑŒ","ÐÑÑ€ Ò¯Ð³","G1-G2","4","1","S2","B1,D5","1","1","Ð³Ð°Ð½Ñ† Ð¼Ð¾Ñ€ÑŒ, Ñ…Ð°Ð¶ÑƒÑƒ Ñ‚Ð°Ð»Ð°Ð°Ñ","Ð¼Ð¾Ñ€ÑŒ","ÐœÐ¾Ñ€ÑŒ Ñ…ÑƒÑ€Ð´Ð°Ð½.","Ð¼Ð¾Ñ€; Ð¼Ð¾Ñ€Ð¹","Ð¼Ð¾Ñ€_"],
  ["W037","Ñ‚Ð¾Ð½Ð¾Ð³","ÐÑÑ€ Ò¯Ð³","G2","5","2","S2","D5","0","1","Ð·ÑƒÑ€Ð°Ð³ ÑˆÐ°Ð°Ñ€Ð´Ð»Ð°Ð³Ð°Ð³Ò¯Ð¹","Ñ‚Ð¾Ð½Ð¾Ð³","Ð¢Ð¾Ð½Ð¾Ð³ Ð±ÑÐ»ÑÐ½.","Ñ‚Ð¾Ð½Ð¾Ð´; Ñ‚Ð¾Ð½Ð¾Ð³Ð³","Ñ‚Ð¾Ð½Ð¾_"],
  ["W038","Ñ…Ð¸Ð²Ñ","ÐÑÑ€ Ò¯Ð³","G2","5","1","S2","D5","1","1","Ð³Ð°Ð½Ñ† Ñ…Ð¸Ð²Ñ Ð´ÑÑÑ€ÑÑÑ Ð±Ð¸Ñˆ, Ð±Ð°Ð³Ð° Ó©Ð½Ñ†Ð³Ó©Ó©Ñ€","Ñ…Ð¸Ð²Ñ","Ð¥Ð¸Ð²Ñ Ñ†ÑÐ²ÑÑ€.","Ñ…Ð¸Ð²; Ñ…Ð¸Ð²ÑÑ","Ñ…Ð¸Ð²_"],
  ["W039","Ð·ÑƒÑ€Ð°Ð³","ÐÑÑ€ Ò¯Ð³","G1-G2","5","2","S2","B1,D5","1","1","Ñ…Ð°Ð½Ð°Ð½Ð´ Ó©Ð»Ð³Ó©ÑÓ©Ð½ Ð³Ð°Ð½Ñ† Ð·ÑƒÑ€Ð°Ð³","Ð·ÑƒÑ€Ð°Ð³","Ð—ÑƒÑ€Ð°Ð³ Ð³Ð¾Ñ‘.","Ð·ÑƒÑ€Ð°Ðº; Ð·ÑƒÑ€Ð°","Ð·ÑƒÑ€Ð°_"],
  ["W040","ÑÐ°Ð²","ÐÑÑ€ Ò¯Ð³","G1","3","1","S1,S2","A1,B1","1","1","Ð³Ð°Ð½Ñ† ÑÐ°Ð²","ÑÐ°Ð²","Ð¡Ð°Ð² Ñ…Ð¾Ð¾ÑÐ¾Ð½.","ÑÐ°Ñ€; ÑÐ¾Ð²","Ñ_Ð²"],
] as const;

// â”€â”€â”€ Task seed data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Tasks come exclusively from content-pipeline/validated/*.json via loadValidatedTasks().

// â”€â”€â”€ Load validated task variants from content-pipeline/validated/*.json â”€â”€â”€â”€â”€â”€

interface ValidatedVariant {
  id: string;
  task_type: string;
  prompt_text: string;
  correct_answer: string;
  options: object;
  audio_url: string | null;
  image_url: string | null;
  primary_skill: string;
  secondary_skill: string | null;
  level_target: string;
  error_targets: string[];
  grade_band: string[];
  difficulty: number;
  estimated_time_seconds: number;
  lesson_slot_fit: string;
  feedback_text: string;
  is_diagnostic?: boolean;
}

function loadValidatedTasks(): ValidatedVariant[] {
  const validatedDir = path.join(__dirname, "../content-pipeline/validated");
  const variants: ValidatedVariant[] = [];
  if (!fs.existsSync(validatedDir)) return variants;
  const files = fs.readdirSync(validatedDir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(validatedDir, file), "utf-8"));
    if (Array.isArray(raw.variants)) {
      variants.push(...raw.variants);
    }
  }
  return variants;
}

// â”€â”€â”€ Load words from content-pipeline/generated/seed-words.json â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface SeedWordEntry {
  id: string;
  word: string;
  category: string;
  grade_band: string;
  letter_count: number;
  word_count: number;
  skills: string[];
  errors: string[];
  image_ok: boolean;
  audio_ok: boolean;
  image_prompt: string | null;
  audio_text: string | null;
  sentence: string | null;
  distractors: string[];
  blank_template: string | null;
}

function loadSeedWords(): SeedWordEntry[] {
  const seedFile = path.join(__dirname, "../content-pipeline/generated/seed-words.json");
  if (!fs.existsSync(seedFile)) return [];
  const raw = JSON.parse(fs.readFileSync(seedFile, "utf-8"));
  return Array.isArray(raw.words) ? raw.words : [];
}


// â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function main() {
  if (isDryRun) console.log("[DRY RUN] No writes will be made.\n");

  // â”€â”€ Words from hardcoded wordRows â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let wordCreated = 0;
  let wordUpdated = 0;
  let wordErrored = 0;

  for (const row of wordRows) {
    const [id, word, category, gradeBandRaw, charCount, syllableCount, skillTagsRaw, errorTagsRaw, imageOk, audioOk, imagePrompt, audioText, sampleSentence, distractorsRaw, blankHint] = row;
    const data = {
      word,
      category: category.trim(),
      grade_band: parseGradeBand(gradeBandRaw),
      char_count: parseInt(charCount),
      syllable_count: parseInt(syllableCount),
      skill_tags: parseSkillTags(skillTagsRaw),
      error_tags: parseStringArray(errorTagsRaw),
      image_ok: imageOk === "1",
      audio_ok: audioOk === "1",
      image_prompt: imagePrompt || null,
      audio_text: audioText || null,
      sample_sentence: sampleSentence || null,
      distractors: parseStringArray(distractorsRaw, ";"),
      blank_hint: blankHint || null,
    };
    try {
      if (isDryRun) {
        const exists = await prisma.word.findUnique({ where: { id } });
        console.log(`[DRY RUN] Word ${id} (${word}): ${exists ? "UPDATE" : "CREATE"}`);
        exists ? wordUpdated++ : wordCreated++;
      } else {
        const exists = await prisma.word.findUnique({ where: { id } });
        await prisma.word.upsert({ where: { id }, update: data, create: { id, ...data } });
        exists ? wordUpdated++ : wordCreated++;
      }
    } catch (e) {
      console.error(`  ERROR word ${id}:`, (e as Error).message);
      wordErrored++;
    }
  }

  // â”€â”€ Words from seed-words.json (upsert by id; skip duplicates already covered above) â”€â”€
  const seedWords = loadSeedWords();
  const hardcodedWordIds = new Set(wordRows.map((r) => r[0] as string));
  for (const w of seedWords) {
    if (hardcodedWordIds.has(w.id)) continue; // already handled above
    const data = {
      word: w.word,
      category: w.category,
      grade_band: parseGradeBand(w.grade_band),
      char_count: w.letter_count,
      syllable_count: w.word_count,
      skill_tags: w.skills,
      error_tags: w.errors,
      image_ok: w.image_ok,
      audio_ok: w.audio_ok,
      image_prompt: w.image_prompt ?? null,
      audio_text: w.audio_text ?? null,
      sample_sentence: w.sentence ?? null,
      distractors: w.distractors,
      blank_hint: w.blank_template ?? null,
    };
    try {
      if (isDryRun) {
        const exists = await prisma.word.findUnique({ where: { id: w.id } });
        console.log(`[DRY RUN] Word ${w.id} (${w.word}): ${exists ? "UPDATE" : "CREATE"}`);
        exists ? wordUpdated++ : wordCreated++;
      } else {
        const exists = await prisma.word.findUnique({ where: { id: w.id } });
        await prisma.word.upsert({ where: { id: w.id }, update: data, create: { id: w.id, ...data } });
        exists ? wordUpdated++ : wordCreated++;
      }
    } catch (e) {
      console.error(`  ERROR word ${w.id}:`, (e as Error).message);
      wordErrored++;
    }
  }

  const wordTotal = wordCreated + wordUpdated;

  // â”€â”€ Task variants from content-pipeline/validated/*.json â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let taskCreated = 0;
  let taskUpdated = 0;
  let taskErrored = 0;

  const validatedVariants = loadValidatedTasks();

  for (const v of validatedVariants) {
    const data = {
      task_type: v.task_type as TaskType,
      prompt_text: v.prompt_text,
      correct_answer: v.correct_answer,
      options: v.options,
      audio_url: v.audio_url,
      image_url: v.image_url,
      primary_skill: v.primary_skill as SkillCode,
      secondary_skill: v.secondary_skill ? (v.secondary_skill as SkillCode) : undefined,
      level_target: v.level_target,
      error_targets: v.error_targets,
      grade_band: v.grade_band,
      grade_levels: buildGradeLevels(v.grade_band, v.level_target),
      difficulty: v.difficulty,
      estimated_time_seconds: v.estimated_time_seconds,
      lesson_slot_fit: v.lesson_slot_fit as LessonSlot,
      feedback_text: v.feedback_text,
      is_diagnostic: v.is_diagnostic ?? false,
    };
    try {
      if (isDryRun) {
        const exists = await prisma.task.findUnique({ where: { id: v.id } });
        console.log(`[DRY RUN] ValidatedTask ${v.id}: ${exists ? "UPDATE" : "CREATE"}`);
        exists ? taskUpdated++ : taskCreated++;
      } else {
        const exists = await prisma.task.findUnique({ where: { id: v.id } });
        await prisma.task.upsert({ where: { id: v.id }, update: data, create: { id: v.id, ...data } });
        exists ? taskUpdated++ : taskCreated++;
      }
    } catch (e) {
      console.error(`  ERROR validated task ${v.id}:`, (e as Error).message);
      taskErrored++;
    }
  }

  const taskTotal = taskCreated + taskUpdated;

  // â”€â”€ Test accounts (development only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (process.env.NODE_ENV === 'development') {
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('password123', 12);

    const parent = await prisma.parent.upsert({
      where: { email: 'test@local.dev' },
      update: {},
      create: { email: 'test@local.dev', password_hash: passwordHash, name: 'Test Parent' },
    });

    await prisma.learner.upsert({
      where: { id: 'test-learner-a' },
      update: {},
      create: { id: 'test-learner-a', parent_id: parent.id, name: 'Test A', grade: 1, variant: 'A' },
    });

    await prisma.learner.upsert({
      where: { id: 'test-learner-b' },
      update: {},
      create: { id: 'test-learner-b', parent_id: parent.id, name: 'Test B', grade: 3, variant: 'B' },
    });

    console.log('Test accounts seeded (test@local.dev / password123)');
  }

  // â”€â”€ Coverage analysis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  console.log("\nâ”€â”€â”€ Seed Summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€");
  console.log(`Words upserted:  ${wordTotal} (${wordCreated} created, ${wordUpdated} updated, ${wordErrored} errors)`);
  console.log(`Tasks upserted:  ${taskTotal} (${taskCreated} created, ${taskUpdated} updated, ${taskErrored} errors)`);

  if (!isDryRun) {
    // Compute coverage from DB
    const allTasks = await prisma.task.findMany({ select: { primary_skill: true, level_target: true, error_targets: true } });

    const skillCounts = new Map<string, number>();
    const levelCounts = new Map<string, number>();
    const errorCounts = new Map<string, number>();

    for (const t of allTasks) {
      skillCounts.set(t.primary_skill, (skillCounts.get(t.primary_skill) ?? 0) + 1);
      levelCounts.set(t.level_target, (levelCounts.get(t.level_target) ?? 0) + 1);
      for (const e of t.error_targets) {
        errorCounts.set(e, (errorCounts.get(e) ?? 0) + 1);
      }
    }

    console.log("\nâ”€â”€â”€ Coverage Warnings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€");

    const skillsUnder10 = [...skillCounts.entries()].filter(([, n]) => n < 10).map(([s]) => s);
    if (skillsUnder10.length) console.log(`  Skills < 10 tasks: ${skillsUnder10.join(", ")}`);
    else console.log("  Skills < 10 tasks: none");

    const levelsUnder15 = [...levelCounts.entries()].filter(([, n]) => n < 15).map(([l]) => l);
    if (levelsUnder15.length) console.log(`  Levels < 15 tasks: ${levelsUnder15.join(", ")}`);
    else console.log("  Levels < 15 tasks: none");

    const mvpErrors = ["B1","B3","C1","C2","C4","D3","E1","E2","E7","G1","G2","H4"];
    const errorsUnder5 = mvpErrors.filter((e) => (errorCounts.get(e) ?? 0) < 5);
    if (errorsUnder5.length) console.log(`  Error codes < 5 tasks: ${errorsUnder5.join(", ")}`);
    else console.log("  Error codes < 5 tasks: none");
  }

  console.log("â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());


