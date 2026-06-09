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
  ["W016","Ð°Ð²Ð´Ð°Ñ€","ÐÑÑ€ Ò¯Ð³","G2","6","2","S4,S2","C4,D5","1","1","Ð¼Ð¾Ð´Ð¾Ð½ Ð°Ð²Ð´Ð°Ñ€, ÑƒÑ€Ð´Ð°Ð°Ñ Ñ…Ð°Ñ€ÑÐ°Ð½","Ð°Ð²Ð´Ð°Ñ€","ÐÐ²Ð´Ð°Ñ€ Ó©Ñ€Ó©Ó©Ð½Ð´ Ð±Ð°Ð¹Ð½Ð°.","Ð°Ð²Ð´Ñ€; Ð°Ð²Ñ‚Ð°Ñ€","Ð°Ð²Ð´_Ñ€"],
  ["W017","Ó©Ð½Ð´Ó©Ð³","ÐÑÑ€ Ò¯Ð³","G1-G2","5","2","S3,S2","C1,D5","1","1","Ð³Ð°Ð½Ñ† Ó©Ð½Ð´Ó©Ð³ ÑÑÐ²ÑÐ» Ñ…Ð¾Ñ‘Ñ€ Ó©Ð½Ð´Ó©Ð³","Ó©Ð½Ð´Ó©Ð³","Ó¨Ð½Ð´Ó©Ð³ Ñ‡Ð°Ð½Ð°Ð².","Ó©Ð½Ð´Ó©Ð³Ð³; Ó©Ð½Ð´_Ð³","Ó©Ð½Ð´_Ð³"],
  ["W018","Ð´ÑÐ²Ñ‚ÑÑ€","ÐÑÑ€ Ò¯Ð³","G1-G2","7","2","S4,S2","C4,D5","1","1","Ñ…Ð°Ð°Ð»Ñ‚Ñ‚Ð°Ð¹ Ð´ÑÐ²Ñ‚ÑÑ€","Ð´ÑÐ²Ñ‚ÑÑ€","Ð”ÑÐ²Ñ‚ÑÑ€ Ñ†ÑÐ²ÑÑ€.","Ð´ÑÐ²Ñ‚Ñ€; Ð´ÑÐ²Ñ‚ÑÑ€Ñ€","Ð´ÑÐ²Ñ‚_Ñ€"],
  ["W019","ÑÐ°Ð½Ð´Ð°Ð»","ÐÑÑ€ Ò¯Ð³","G1-G2","7","2","S4,S2","C4,D5","1","1","Ð³Ð°Ð½Ñ† ÑÐ°Ð½Ð´Ð°Ð», Ñ…Ð°Ð¶ÑƒÑƒ Ñ‚Ð°Ð»Ð°Ð°Ñ","ÑÐ°Ð½Ð´Ð°Ð»","Ð¡Ð°Ð½Ð´Ð°Ð» Ð¼Ð¾Ð´Ð¾Ð½.","ÑÐ°Ð½Ð´Ð»; ÑÐ°Ð½Ð´Ð°Ð»Ð´","ÑÐ°Ð½Ð´_Ð»"],
  ["W020","Ñ†Ð¾Ð½Ñ…","ÐÑÑ€ Ò¯Ð³","G1-G2","4","1","S2,S4","B1,C4","1","1","Ð±Ð°Ð¹ÑˆÐ¸Ð½Ð³Ð¸Ð¹Ð½ Ð³Ð°Ð½Ñ† Ñ†Ð¾Ð½Ñ…","Ñ†Ð¾Ð½Ñ…","Ð¦Ð¾Ð½Ñ… Ð½ÑÑÐ»Ñ‚Ñ‚ÑÐ¹.","Ñ†Ð¾Ð½Ñ…Ñ…; Ñ†Ð¾Ð½_","Ñ†Ð¾Ð½_"],
  ["W021","Ñ…Ð°Ñ€Ð°Ð½Ð´Ð°Ð°","ÐÑÑ€ Ò¯Ð³","G2","8","3","S4,S2","C4,B3","1","1","ÑˆÐ°Ñ€ Ñ…Ð°Ñ€Ð°Ð½Ð´Ð°Ð° Ð³Ð°Ð½Ñ†Ð°Ð°Ñ€Ð°Ð°","Ñ…Ð°Ñ€Ð°Ð½Ð´Ð°Ð°","Ð¥Ð°Ñ€Ð°Ð½Ð´Ð°Ð° Ñ…ÑƒÑ€Ñ†.","Ñ…Ð°Ñ€Ð°Ð½Ð´Ð°; Ñ…Ð°Ñ€Ð°Ð½Ð´Ð°Ð°Ð°","Ñ…Ð°Ñ€Ð°Ð½Ð´_Ð°"],
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

interface TaskSeed {
  id: string;
  task_type: TaskType;
  prompt_text: string;
  correct_answer: string;
  options: object;
  audio_url: string | null;
  image_url: string | null;
  primary_skill: SkillCode;
  secondary_skill: SkillCode | null;
  level_target: string;
  error_targets: string[];
  grade_band: string[];
  difficulty: number;
  estimated_time_seconds: number;
  lesson_slot_fit: LessonSlot;
  feedback_text: string;
  is_diagnostic?: boolean;
}

const readyTasks: TaskSeed[] = [
  {
    id: "G12-001",
    task_type: TaskType.TT_1_1,
    prompt_text: "Ð¡Ð¾Ð½ÑÐ»Ð¾Ð¾. ÐÐ»ÑŒ Ò¯Ð³ Ð²Ñ?",
    correct_answer: "Ð½Ð¾Ð¼",
    options: { choices: [{ text: "Ð½Ð¾Ð¼", is_correct: true }, { text: "Ð½ÑƒÐ¼", is_correct: false }, { text: "Ð¼Ð¾Ð´", is_correct: false }], audio_trigger: true },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S1, secondary_skill: SkillCode.S2,
    level_target: "M0", error_targets: ["A1", "A2"], grade_band: ["G1"],
    difficulty: 1, estimated_time_seconds: 30,    lesson_slot_fit: LessonSlot.WARM_UP, feedback_text: "'Ð½Ð¾Ð¼' Ð³ÑÐ´ÑÐ³ Ò¯Ð³ÑÐ½Ð´ Ð¾ Ð°Ð²Ð¸Ð°Ð³ ÑÐ¾Ð½ÑÐ»Ð¾Ð¾.",
  },
  {
    id: "G12-001v2",
    task_type: TaskType.TT_1_1,
    prompt_text: "Ð¡Ð¾Ð½ÑÐ»Ð¾Ð¾. ÐÐ»ÑŒ Ò¯Ð³ Ð²Ñ?",
    correct_answer: "ÑÐ°Ñ€",
    options: { choices: [{ text: "ÑÐ°Ñ€", is_correct: true }, { text: "Ð½Ð°Ñ€", is_correct: false }, { text: "ÑÐ°Ð²", is_correct: false }], audio_trigger: true },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S1, secondary_skill: SkillCode.S2,
    level_target: "M0", error_targets: ["A1"], grade_band: ["G1"],
    difficulty: 1, estimated_time_seconds: 30,    lesson_slot_fit: LessonSlot.WARM_UP, feedback_text: "Ð—Ó©Ð² ÑÐ¾Ð½ÑÐ»Ð¾Ð¾.",
  },
  {
    id: "G12-002",
    task_type: TaskType.TT_2_1,
    prompt_text: "Ð”ÑƒÑ‚ÑƒÑƒ Ò¯ÑÐ³Ð¸Ð¹Ð³ Ð½Ó©Ñ…Ó©Ð¶ Ð±Ð¸Ñ‡.",
    correct_answer: "Ð¾",
    options: { display_text: "Ð½_Ð¼", blank_position: 1, blank_answer: "Ð¾", context_word: "Ð½Ð¾Ð¼" },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S1, secondary_skill: SkillCode.S2,
    level_target: "M0", error_targets: ["A2", "B1"], grade_band: ["G1"],
    difficulty: 1, estimated_time_seconds: 45,    lesson_slot_fit: LessonSlot.CORE, feedback_text: "'Ð½Ð¾Ð¼' Ð³ÑÐ¶ Ð±Ò¯Ñ‚ÑÐ½ ÑƒÐ½ÑˆÐ°Ð°Ð´ ÑˆÐ°Ð»Ð³Ð°.",
  },
  {
    id: "G12-003",
    task_type: TaskType.TT_1_2,
    prompt_text: "Ð—ÑƒÑ€Ð°Ð³Ñ‚ Ñ‚Ð¾Ñ…Ð¸Ñ€Ð¾Ñ… Ò¯Ð³Ð¸Ð¹Ð³ ÑÐ¾Ð½Ð³Ð¾.",
    correct_answer: "Ð°Ð»Ð¸Ð¼",
    options: { choices: [{ text: "Ð°Ð»Ð¸Ð¼", is_correct: true }, { text: "Ð³ÑƒÑ‚Ð°Ð»", is_correct: false }, { text: "Ñ†Ð°Ñ", is_correct: false }], audio_trigger: false },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S2, secondary_skill: null,
    level_target: "M0", error_targets: ["B1"], grade_band: ["G1", "G2"],
    difficulty: 1, estimated_time_seconds: 30,    lesson_slot_fit: LessonSlot.WARM_UP, feedback_text: "Ð—ÑƒÑ€Ð°Ð³Ñ‚Ð°Ð¹ Ò¯Ð³Ð¸Ð¹Ð³ Ð·Ó©Ð² Ñ‚Ð°Ð°Ñ€ÑƒÑƒÐ»Ð»Ð°Ð°.",
  },
  {
    id: "G12-003v2",
    task_type: TaskType.TT_1_2,
    prompt_text: "Ð—ÑƒÑ€Ð°Ð³Ñ‚ Ñ‚Ð¾Ñ…Ð¸Ñ€Ð¾Ñ… Ò¯Ð³Ð¸Ð¹Ð³ ÑÐ¾Ð½Ð³Ð¾.",
    correct_answer: "Ð³ÑÑ€",
    options: { choices: [{ text: "Ð³ÑÑ€", is_correct: true }, { text: "Ð¼Ð¾Ñ€ÑŒ", is_correct: false }, { text: "Ð½Ð¾Ð¼", is_correct: false }], audio_trigger: false },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S2, secondary_skill: null,
    level_target: "M0", error_targets: ["B1"], grade_band: ["G1"],
    difficulty: 1, estimated_time_seconds: 30,    lesson_slot_fit: LessonSlot.WARM_UP, feedback_text: "Ð—ÑƒÑ€Ð°Ð³ Ð½ÑŒ Ð¼Ð¾Ð½Ð³Ð¾Ð» Ð³ÑÑ€ Ð±Ð°Ð¹Ð½Ð°.",
  },
  {
    id: "G12-004",
    task_type: TaskType.TT_7_1,
    prompt_text: "Ð”Ð¾Ð¾Ñ€Ñ… Ó©Ð³Ò¯Ò¯Ð»Ð±ÑÑ€Ð¸Ð¹Ð³ Ñ…ÑƒÑƒÐ»Ð¶ Ð±Ð¸Ñ‡.",
    correct_answer: "Ð­Ð½Ñ Ð±Ð¾Ð» Ð½Ð¾Ð¼.",
    options: { incorrect_text: "Ð­Ð½Ñ Ð±Ð¾Ð» Ð½Ð¾Ð¼.", correct_text: "Ð­Ð½Ñ Ð±Ð¾Ð» Ð½Ð¾Ð¼.", error_type: "B3", hint: "Ò®ÑÐ³Ð¸Ð¹Ð½ Ð´Ð°Ñ€Ð°Ð°Ð»Ð°Ð», Ñ†ÑÐ³ÑÑ ÑˆÐ°Ð»Ð³Ð°." },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S2, secondary_skill: null,
    level_target: "M0", error_targets: ["B3"], grade_band: ["G1"],
    difficulty: 1, estimated_time_seconds: 45,    lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ò®ÑÐ³Ð¸Ð¹Ð½ Ð´Ð°Ñ€Ð°Ð°Ð»Ð°Ð», Ñ†ÑÐ³ÑÑ ÑˆÐ°Ð»Ð³Ð°.",
  },
  {
    id: "G12-005",
    task_type: TaskType.TT_2_3,
    prompt_text: "ÐÐ»ÑŒ Ð½ÑŒ Ð·Ó©Ð² Ð±Ñ?",
    correct_answer: "Ñ‚Ð¾Ð³Ð¾Ð¾",
    options: { choices: [{ text: "Ñ‚Ð¾Ð³Ð¾Ð¾", is_correct: true }, { text: "Ñ‚Ð¾Ð³Ð¾", is_correct: false }, { text: "Ñ‚Ð¾Ð³ÑƒÑƒ", is_correct: false }], audio_trigger: false },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S3, secondary_skill: SkillCode.S2,
    level_target: "M1", error_targets: ["C1", "C2"], grade_band: ["G1", "G2"],
    difficulty: 2, estimated_time_seconds: 30,    lesson_slot_fit: LessonSlot.WARM_UP, feedback_text: "Ð£Ñ€Ñ‚ ÑÐ³ÑˆÐ³Ð¸Ð¹Ð³ Ð°Ð½Ð·Ð°Ð°Ñ€.",
  },
  {
    id: "G12-005v2",
    task_type: TaskType.TT_2_3,
    prompt_text: "ÐÐ»ÑŒ Ð½ÑŒ Ð·Ó©Ð² Ð±Ñ?",
    correct_answer: "ÑÒ¯Ò¯",
    options: { choices: [{ text: "ÑÒ¯Ò¯", is_correct: true }, { text: "ÑÑƒ", is_correct: false }, { text: "ÑÒ¯", is_correct: false }], audio_trigger: false },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S3, secondary_skill: SkillCode.S2,
    level_target: "M1", error_targets: ["C1"], grade_band: ["G1", "G2"],
    difficulty: 2, estimated_time_seconds: 30,    lesson_slot_fit: LessonSlot.WARM_UP, feedback_text: "Ð£Ñ€Ñ‚ ÑÐ³ÑˆÐ¸Ð³Ñ‚ÑÐ¹ Ñ…ÑÐ»Ð±ÑÑ€Ð¸Ð¹Ð³ ÑÐ¾Ð½Ð³Ð¾.",
  },
  {
    id: "G12-006",
    task_type: TaskType.TT_2_4,
    prompt_text: "Ð”ÑƒÑ‚ÑƒÑƒ Ò¯ÑÐ³Ð¸Ð¹Ð³ Ð½Ó©Ñ…Ó©Ð¶ Ð±Ð¸Ñ‡.",
    correct_answer: "Ó©",
    options: { display_text: "Ð±Ó©Ð¼Ð±_Ð³", blank_position: 4, blank_answer: "Ó©", context_word: "Ð±Ó©Ð¼Ð±Ó©Ð³" },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S3, secondary_skill: SkillCode.S2,
    level_target: "M1", error_targets: ["C1", "C2"], grade_band: ["G1", "G2"],
    difficulty: 2, estimated_time_seconds: 45,    lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ð”ÑƒÐ½Ð´Ð°Ñ… ÑÐ³ÑˆÐ³Ð¸Ð¹Ð³ Ð·Ó©Ð² Ð½Ó©Ñ….",
  },
  {
    id: "G12-006v2",
    task_type: TaskType.TT_2_4,
    prompt_text: "Ð”ÑƒÑ‚ÑƒÑƒ Ò¯ÑÐ³Ð¸Ð¹Ð³ Ð½Ó©Ñ…Ó©Ð¶ Ð±Ð¸Ñ‡.",
    correct_answer: "Ñƒ",
    options: { display_text: "ÑˆÑƒÐ²_Ñƒ", blank_position: 3, blank_answer: "Ñƒ", context_word: "ÑˆÑƒÐ²ÑƒÑƒ" },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S3, secondary_skill: SkillCode.S2,
    level_target: "M1", error_targets: ["C1"], grade_band: ["G1", "G2"],
    difficulty: 2, estimated_time_seconds: 45,    lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ð”Ð°Ð²Ñ…Ð°Ñ€ ÑÐ³ÑˆÐ³Ð¸Ð¹Ð½ Ñ…ÑÐ»Ð±ÑÑ€Ð¸Ð¹Ð³ Ð°Ð½Ð·Ð°Ð°Ñ€.",
  },
  {
    id: "G12-007",
    task_type: TaskType.TT_4_4,
    prompt_text: "ÐÑƒÐ´Ð¸Ð¾ ÑÐ¾Ð½ÑÐ¾Ð¾Ð´ Ð´ÑƒÑ‚ÑƒÑƒ Ò¯ÑÐ³Ð¸Ð¹Ð³ Ð½Ó©Ñ…Ó©Ð¶ Ð±Ð¸Ñ‡.",
    correct_answer: "Ñ",
    options: { display_text: "Ð´ÑÐ²Ñ‚_Ñ€", blank_position: 4, blank_answer: "Ñ", context_word: "Ð´ÑÐ²Ñ‚ÑÑ€" },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S4, secondary_skill: SkillCode.S2,
    level_target: "M1", error_targets: ["C4"], grade_band: ["G1", "G2"],
    difficulty: 2, estimated_time_seconds: 45,    lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ð‘Ð°Ð»Ð°Ñ€Ñ…Ð°Ð¹ ÑÐ³ÑˆÐ³Ð¸Ð¹Ð³ Ð½Ó©Ñ…Ó©Ð¶ Ð±Ð¸Ñ‡.",
  },
  {
    id: "G12-008",
    task_type: TaskType.TT_7_3,
    prompt_text: "Ð¡Ð¾Ð½ÑÑÐ¾Ð½ Ð´Ð°Ñ€Ð°Ð°Ð»Ð»Ð°Ð°Ñ€ Ð±Ð¸Ñ‡ÑÑÑ€ÑÐ¹.",
    correct_answer: "Ð½Ð¾Ð¼; Ð³ÑÑ€; Ð½Ð°Ñ€",
    options: { audio_text: "Ð½Ð¾Ð¼, Ð³ÑÑ€, Ð½Ð°Ñ€", word_count: 3, expected_answers: ["Ð½Ð¾Ð¼", "Ð³ÑÑ€", "Ð½Ð°Ñ€"], allow_partial: true },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S7, secondary_skill: SkillCode.S1,
    level_target: "M1", error_targets: ["H1", "B1"], grade_band: ["G1"],
    difficulty: 2, estimated_time_seconds: 180,    lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ð¡Ð¾Ð½ÑÑÐ¾Ð½ Ð´Ð°Ñ€Ð°Ð°Ð»Ð»Ð°Ð°Ñ€ Ð±Ð¸Ñ‡ÑÑÑ€ÑÐ¹.",
  },
  {
    id: "G12-009",
    task_type: TaskType.TT_6_1,
    prompt_text: "ÐÐ»Ð´Ð°Ð°Ð³ Ð·Ð°ÑÐ°Ð¶ Ð·Ó©Ð² Ð±Ð¸Ñ‡.",
    correct_answer: "Ð‘Ð¸ ÑÐ²Ð½Ð°.",
    options: { incorrect_text: "Ð±Ð¸ ÑÐ²Ð½Ð°", correct_text: "Ð‘Ð¸ ÑÐ²Ð½Ð°.", error_type: "G1", hint: "Ð­Ñ…Ð½Ð¸Ð¹ Ò¯ÑÑÐ³ Ñ‚Ð¾Ð¼, Ñ‚Ó©Ð³ÑÐ³Ó©Ð»Ð´ Ñ†ÑÐ³." },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S6, secondary_skill: null,
    level_target: "M1", error_targets: ["G1", "G2"], grade_band: ["G1", "G2"],
    difficulty: 2, estimated_time_seconds: 45,    lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ð­Ñ…Ð½Ð¸Ð¹ Ò¯ÑÑÐ³ Ñ‚Ð¾Ð¼, Ñ‚Ó©Ð³ÑÐ³Ó©Ð»Ð´ Ñ†ÑÐ³.",
  },
  {
    id: "G12-009v2",
    task_type: TaskType.TT_6_1,
    prompt_text: "ÐÐ»Ð´Ð°Ð°Ð³ Ð·Ð°ÑÐ°Ð¶ Ð·Ó©Ð² Ð±Ð¸Ñ‡.",
    correct_answer: "Ð‘Ð°Ñ‚ Ð¸Ñ€Ð»ÑÑ.",
    options: { incorrect_text: "Ð±Ð°Ñ‚ Ð¸Ñ€Ð»ÑÑ", correct_text: "Ð‘Ð°Ñ‚ Ð¸Ñ€Ð»ÑÑ.", error_type: "G1", hint: "ÐÑÑ€Ð½Ð¸Ð¹ ÑÑ…Ð½Ð¸Ð¹ Ò¯ÑÑÐ³ Ñ‚Ð¾Ð¼." },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S6, secondary_skill: null,
    level_target: "M1", error_targets: ["G1"], grade_band: ["G2"],
    difficulty: 2, estimated_time_seconds: 45,    lesson_slot_fit: LessonSlot.CORE, feedback_text: "ÐÑÑ€Ð½Ð¸Ð¹ ÑÑ…Ð½Ð¸Ð¹ Ò¯ÑÑÐ³ Ñ‚Ð¾Ð¼.",
  },
  {
    id: "G12-010",
    task_type: TaskType.TT_5_1,
    prompt_text: "ÐÐ»ÑŒ Ð½ÑŒ Ð·Ó©Ð² Ð±Ñ?",
    correct_answer: "Ð³ÑÑ€Ñ‚",
    options: { choices: [{ text: "Ð³ÑÑ€Ñ‚", is_correct: true }, { text: "Ð³ÑÑ€Ð´", is_correct: false }, { text: "Ð³ÑÑ€", is_correct: false }], audio_trigger: false },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S5, secondary_skill: null,
    level_target: "M1", error_targets: ["E1", "E2"], grade_band: ["G2"],
    difficulty: 2, estimated_time_seconds: 30,    lesson_slot_fit: LessonSlot.WARM_UP, feedback_text: "Ð¢Ò¯Ð³ÑÑÐ¼ÑÐ» Ð·Ð°Ð»Ð³Ð°Ð²Ñ€Ñ‹Ð½ Ñ…ÑÐ»Ð±ÑÑ€Ð¸Ð¹Ð³ Ñ‚Ð°Ð½ÑŒ.",
  },
  {
    id: "G12-011",
    task_type: TaskType.TT_8_2,
    prompt_text: "ÐÐ»Ð´Ð°Ð°Ð³ Ð¾Ð», Ð·Ð°ÑÐ°Ð¶ Ð±Ð¸Ñ‡.",
    correct_answer: "Ð½Ð¾Ð¼",
    options: { incorrect_text: "Ð½Ð¾Ð¼Ð¼", correct_text: "Ð½Ð¾Ð¼", error_type: "H4", hint: "Ð˜Ð»Ò¯Ò¯ Ò¯ÑÐ³Ð¸Ð¹Ð³ Ñ…Ð°Ñ." },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S8, secondary_skill: SkillCode.S2,
    level_target: "M1", error_targets: ["B2", "H4"], grade_band: ["G1"],
    difficulty: 2, estimated_time_seconds: 45,    lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ð˜Ð»Ò¯Ò¯ Ò¯ÑÐ³Ð¸Ð¹Ð³ Ñ…Ð°Ñ.",
  },
  {
    id: "G12-011v2",
    task_type: TaskType.TT_8_2,
    prompt_text: "ÐÐ»Ð´Ð°Ð°Ð³ Ð¾Ð», Ð·Ð°ÑÐ°Ð¶ Ð±Ð¸Ñ‡.",
    correct_answer: "Ñ‚Ð¾Ð³Ð¾Ð¾",
    options: { incorrect_text: "Ñ‚Ð¾Ð³Ð¾", correct_text: "Ñ‚Ð¾Ð³Ð¾Ð¾", error_type: "C1", hint: "Ð£Ñ€Ñ‚ ÑÐ³ÑˆÐ³Ð¸Ð¹Ð³ Ð´ÑƒÑ‚ÑƒÑƒ Ð±Ð¸Ñ‡ÑÑÐ½ Ð±Ð°Ð¹Ð½Ð°." },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S8, secondary_skill: SkillCode.S3,
    level_target: "M1", error_targets: ["C1", "H4"], grade_band: ["G1", "G2"],
    difficulty: 2, estimated_time_seconds: 45,    lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ð£Ñ€Ñ‚ ÑÐ³ÑˆÐ³Ð¸Ð¹Ð³ Ð´ÑƒÑ‚ÑƒÑƒ Ð±Ð¸Ñ‡ÑÑÐ½ Ð±Ð°Ð¹Ð½Ð°.",
  },
  {
    id: "G12-012",
    task_type: TaskType.TT_8_4,
    prompt_text: "Ð§Ð¸ Ð±Ð¸Ñ‡ÑÑÐ½ Ð±Ð¾Ð»Ð¾Ð½ Ð·Ð°Ð³Ð²Ð°Ñ€Ñ‹Ð³ Ñ…Ð°Ñ€ÑŒÑ†ÑƒÑƒÐ».",
    correct_answer: "ÑÒ¯Ò¯",
    options: { original_attempt: "ÑÒ¯", model_answer: "ÑÒ¯Ò¯", comparison_mode: "side_by_side" },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S8, secondary_skill: SkillCode.S3,
    level_target: "M1", error_targets: ["C1", "H4"], grade_band: ["G1", "G2"],
    difficulty: 2, estimated_time_seconds: 60,    lesson_slot_fit: LessonSlot.END, feedback_text: "Ð¥Ð¾Ñ‘Ñ€ Ò¯ÑÐ³Ð¸Ð¹Ð½ ÑÐ»Ð³Ð°Ð°Ð³ Ó©Ó©Ñ€Ó©Ó© Ð¾Ð».",
  },
  {
    id: "G12-013",
    task_type: TaskType.TT_7_3,
    prompt_text: "Ð¡Ð¾Ð½ÑÑÐ¾Ð½ Ð´Ð°Ñ€Ð°Ð°Ð»Ð»Ð°Ð°Ñ€ Ð±Ð¸Ñ‡Ð½Ñ Ò¯Ò¯.",
    correct_answer: "Ð½Ð¾Ð¼; ÑÐ°Ñ€",
    options: { audio_text: "Ð½Ð¾Ð¼, ÑÐ°Ñ€", word_count: 2, expected_answers: ["Ð½Ð¾Ð¼", "ÑÐ°Ñ€"], allow_partial: true },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S7, secondary_skill: SkillCode.S1,
    level_target: "M1", error_targets: ["H1"], grade_band: ["G1"],
    difficulty: 2, estimated_time_seconds: 120,    lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ð¥Ð¾Ñ‘Ñ€ Ò¯Ð³Ð¸Ð¹Ð³ Ð´Ð°Ñ€Ð°Ð°Ð»Ð»Ð°Ð°Ñ€ Ð½ÑŒ Ð±Ð¸Ñ‡.",
  },
  {
    id: "G12-014",
    task_type: TaskType.TT_2_1,
    prompt_text: "Ð”ÑƒÑ‚ÑƒÑƒ Ò¯ÑÐ³Ð¸Ð¹Ð³ Ð½Ó©Ñ…Ó©Ð¶ Ð±Ð¸Ñ‡.",
    correct_answer: "Ñ€",
    options: { display_text: "Ð³Ñ_", blank_position: 2, blank_answer: "Ñ€", context_word: "Ð³ÑÑ€" },
    audio_url: null, image_url: null,
    primary_skill: SkillCode.S2, secondary_skill: null,
    level_target: "M1", error_targets: ["D5"], grade_band: ["G1"],
    difficulty: 2, estimated_time_seconds: 45,    lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ð¢Ó©Ð³ÑÐ³Ó©Ð»Ð¸Ð¹Ð½ Ò¯ÑÐ³Ð¸Ð¹Ð³ Ð·Ó©Ð² Ð±Ð¸Ñ‡.",
  },
];

const placeholderTasks: TaskSeed[] = [
  { id: "G12-015", task_type: TaskType.TT_5_2, prompt_text: "Ó¨Ð³Ò¯Ò¯Ð»Ð±ÑÑ€Ð¸Ð¹Ð³ Ð±Ò¯Ñ‚ÑÐ½ Ð±Ð¾Ð»Ð³Ð¾Ð½ Ð½Ó©Ñ…Ó©Ð¶ Ð±Ð¸Ñ‡.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S6, secondary_skill: null, level_target: "M1", error_targets: ["G2"], grade_band: ["G1", "G2"], difficulty: 2, estimated_time_seconds: 45, lesson_slot_fit: LessonSlot.CORE, feedback_text: "ÐÑÐ³ Ó©Ð³Ò¯Ò¯Ð»Ð±ÑÑ€Ð¸Ð¹Ð³ Ð±Ò¯Ñ‚ÑÐ½ Ð±Ð¾Ð»Ð³Ð¾Ñ…." },
  { id: "G12-016", task_type: TaskType.TT_2_3, prompt_text: "ÐÐ»ÑŒ Ð½ÑŒ Ð·Ó©Ð² Ð±Ñ?", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S2, secondary_skill: SkillCode.S3, level_target: "M1", error_targets: ["B1", "C1"], grade_band: ["G1", "G2"], difficulty: 2, estimated_time_seconds: 30, lesson_slot_fit: LessonSlot.WARM_UP, feedback_text: "Ò®Ð³ Ð±Ð° ÑÐ³ÑˆÐ³Ð¸Ð¹Ð³ Ñ…Ð°Ð¼Ñ‚ ÑˆÐ°Ð»Ð³Ð°Ñ…." },
  { id: "G24-001", task_type: TaskType.TT_5_1, prompt_text: "Ð¡ÑƒÑƒÑ€ÑŒ Ð·Ó©Ð² Ð±Ð¸Ñ‡Ð»ÑÐ³Ð¸Ð¹Ð½ Ñ…ÑÐ»Ð±ÑÑ€Ð¸Ð¹Ð³ ÑÐ¾Ð½Ð³Ð¾.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S2, secondary_skill: null, level_target: "M1", error_targets: ["B1", "B3"], grade_band: ["G2", "G3", "G4"], difficulty: 2, estimated_time_seconds: 30, lesson_slot_fit: LessonSlot.WARM_UP, feedback_text: "Ð¡ÑƒÑƒÑ€ÑŒ Ð·Ó©Ð² Ð±Ð¸Ñ‡Ð»ÑÐ³." },
  { id: "G24-002", task_type: TaskType.TT_3_2, prompt_text: "Ð£Ñ€Ñ‚ ÑÐ³ÑˆÐ³Ð¸Ð¹Ð³ Ð·Ó©Ð² Ð½Ó©Ñ…Ó©Ð¶ Ð±Ð¸Ñ‡.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S3, secondary_skill: null, level_target: "M1", error_targets: ["C1"], grade_band: ["G2", "G3", "G4"], difficulty: 2, estimated_time_seconds: 45, lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ð£Ñ€Ñ‚/Ð±Ð¾Ð³Ð¸Ð½Ð¾ ÑÐ³ÑˆÐ³Ð¸Ð¹Ð½ ÑÑƒÑƒÑ€ÑŒ." },
  { id: "G24-003", task_type: TaskType.TT_3_2, prompt_text: "Ð‘Ð°Ð»Ð°Ñ€Ñ…Ð°Ð¹ ÑÐ³ÑˆÐ³Ð¸Ð¹Ð³ Ð·Ó©Ð² Ð½Ó©Ñ…Ó©Ð¶ Ð±Ð¸Ñ‡.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S4, secondary_skill: null, level_target: "M1", error_targets: ["C4"], grade_band: ["G2", "G3", "G4"], difficulty: 2, estimated_time_seconds: 45, lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ð”ÑƒÑ‚ÑƒÑƒ ÑÐ³ÑˆÐ¸Ð³ Ð½Ó©Ñ…Ó©Ñ…." },
  { id: "G24-004", task_type: TaskType.TT_5_1, prompt_text: "Ð—Ð¾Ñ…Ð¸Ñ… Ð·Ð°Ð»Ð³Ð°Ð²Ñ€Ñ‹Ð³ ÑÐ¾Ð½Ð³Ð¾.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S5, secondary_skill: null, level_target: "M2", error_targets: ["E2"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 30, lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ð­Ð½Ð³Ð¸Ð¹Ð½ Ð·Ð°Ð»Ð³Ð°Ð²Ð°Ñ€ Ñ…ÑÑ€ÑÐ³Ð»ÑÑ…." },
  { id: "G24-005", task_type: TaskType.TT_6_1, prompt_text: "Ó¨Ð³Ò¯Ò¯Ð»Ð±ÑÑ€Ð¸Ð¹Ð½ Ñ‚Ð¾Ð¼ Ò¯ÑÑÐ³, Ñ†ÑÐ³Ð¸Ð¹Ð³ Ð·Ó©Ð² Ð±Ð¸Ñ‡.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S6, secondary_skill: null, level_target: "M1", error_targets: ["G1", "G2"], grade_band: ["G2", "G3", "G4"], difficulty: 2, estimated_time_seconds: 45, lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ó¨Ð³Ò¯Ò¯Ð»Ð±ÑÑ€Ð¸Ð¹Ð½ Ñ‚ÑÐ¼Ð´ÑÐ³Ð»ÑÐ³ÑÑ." },
  { id: "G24-006", task_type: TaskType.TT_7_4, prompt_text: "Ð‘Ð¾Ð³Ð¸Ð½Ð¾ Ó©Ð³Ò¯Ò¯Ð»Ð±ÑÑ€Ð¸Ð¹Ð³ ÑÐ¾Ð½ÑÐ¾Ð¾Ð´ Ð±Ð¸Ñ‡.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S7, secondary_skill: null, level_target: "M2", error_targets: ["H1", "B4"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 60, lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ð¡Ð¾Ð½ÑÐ³Ð¾Ð»Ð¾Ð¾Ñ€ Ð±ÑƒÑƒÐ»Ð³Ð°Ñ…." },
  { id: "G24-007", task_type: TaskType.TT_8_2, prompt_text: "ÐÐ»Ð´Ð°Ð°Ñ‚Ð°Ð¹ Ò¯Ð³Ð¸Ð¹Ð³ Ð·Ð°ÑÐ°Ð¶ Ð±Ð¸Ñ‡.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S8, secondary_skill: null, level_target: "M2", error_targets: ["H4"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 45, lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ó¨Ó©Ñ€Ó©Ó© Ð·Ð°ÑÐ°Ñ… Ñ‡Ð°Ð´Ð²Ð°Ñ€." },
  { id: "G24-008", task_type: TaskType.TT_4_1, prompt_text: "Ð˜Ð¶Ð¸Ð» Ñ‚Ó©ÑÑ‚ÑÐ¹ Ð°Ð²Ð¸Ð°Ð³ ÑÐ»Ð³Ð°Ð¶ ÑÐ¾Ð½Ð³Ð¾.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S1, secondary_skill: null, level_target: "M1", error_targets: ["D3"], grade_band: ["G2", "G3", "G4"], difficulty: 2, estimated_time_seconds: 30, lesson_slot_fit: LessonSlot.WARM_UP, feedback_text: "Ð¢Ó©ÑÑ‚ÑÐ¹ Ð°Ð²Ð¸Ð° ÑÐ»Ð³Ð°Ñ…." },
  { id: "G24-009", task_type: TaskType.TT_2_5, prompt_text: "Ò®Ð³Ð¸Ð¹Ð½ Ð·Ó©Ð² Ñ…ÑÐ»Ð±ÑÑ€Ð¸Ð¹Ð³ Ð·Ð°ÑÐ°Ð¶ Ð±Ð¸Ñ‡.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S2, secondary_skill: null, level_target: "M2", error_targets: ["F1"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 45, lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ð¯Ð·Ð³ÑƒÑƒÑ€ Ñ…ÑÐ»Ð±ÑÑ€Ð¸Ð¹Ð³ Ñ‚Ð°Ð½Ð¸Ñ…." },
  { id: "G24-010", task_type: TaskType.TT_7_5, prompt_text: "Ð£Ñ€Ñ‚ ÑÐ³ÑˆÐ³Ð¸Ð¹Ð³ Ó©Ð³Ò¯Ò¯Ð»Ð±ÑÑ€Ñ‚ ÑÐ»Ð³Ð°.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S3, secondary_skill: null, level_target: "M2", error_targets: ["C1", "C2"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 30, lesson_slot_fit: LessonSlot.CORE, feedback_text: "ÐšÐ¾Ð½Ñ‚ÐµÐºÑÑ‚ Ð´Ð¾Ñ‚Ð¾Ñ€ ÑÐ»Ð³Ð°Ñ…." },
  { id: "G24-011", task_type: TaskType.TT_7_5, prompt_text: "Ð‘Ð°Ð»Ð°Ñ€Ñ…Ð°Ð¹ ÑÐ³ÑˆÐ³Ð¸Ð¹Ð³ Ó©Ð³Ò¯Ò¯Ð»Ð±ÑÑ€Ñ‚ Ð½Ó©Ñ…Ó©Ð¶ Ð±Ð¸Ñ‡.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S4, secondary_skill: null, level_target: "M2", error_targets: ["C4", "C5"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 45, lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ó¨Ð³Ò¯Ò¯Ð»Ð±ÑÑ€Ñ‚ Ð·Ó©Ð² Ð½Ó©Ñ…Ó©Ñ…." },
  { id: "G24-012", task_type: TaskType.TT_5_1, prompt_text: "Ð¢Ð¸Ð¹Ð½ ÑÐ»Ð³Ð°Ð»Ñ‹Ð½ Ð·Ó©Ð² Ñ…ÑÐ»Ð±ÑÑ€Ð¸Ð¹Ð³ ÑÐ¾Ð½Ð³Ð¾.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S5, secondary_skill: null, level_target: "M2", error_targets: ["E4"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 30, lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ó¨Ð³Ò¯Ò¯Ð»Ð±ÑÑ€Ð¸Ð¹Ð½ Ò¯Ò¯Ñ€ÑÐ³Ñ‚ Ñ‚Ð¾Ñ…Ð¸Ñ€ÑƒÑƒÐ»Ð°Ñ…." },
  { id: "G24-013", task_type: TaskType.TT_6_4, prompt_text: "Ð¢Ð°ÑÐ»Ð°Ð»Ñ‹Ð³ Ð·Ó©Ð² Ð±Ð°Ð¹Ñ€Ð»ÑƒÑƒÐ»Ð¶ Ð±Ð¸Ñ‡.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S6, secondary_skill: null, level_target: "M2", error_targets: ["G4"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 45, lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ð­Ð½Ð³Ð¸Ð¹Ð½ Ð·Ð°Ð²ÑÐ°Ñ€ Ñ‚ÑÐ¼Ð´ÑÐ³." },
  { id: "G24-014", task_type: TaskType.TT_7_4, prompt_text: "Ð¥Ð¾Ñ‘Ñ€ Ó©Ð³Ò¯Ò¯Ð»Ð±ÑÑ€Ð¸Ð¹Ð³ ÑÐ¾Ð½ÑÐ¾Ð¾Ð´ Ð±Ð¸Ñ‡Ð½Ñ Ò¯Ò¯.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S7, secondary_skill: null, level_target: "M2", error_targets: ["H1", "H2"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 120, lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ð¥ÑƒÑ€Ð´ Ð±Ð° Ð¾Ð¹." },
  { id: "G24-015", task_type: TaskType.TT_8_2, prompt_text: "ÐžÑ€Ñ…Ð¸Ð³Ð´ÑÐ¾Ð½ Ò¯ÑÐ³Ð¸Ð¹Ð³ Ð¾Ð», Ð·Ð°ÑÐ°Ð¶ Ð±Ð¸Ñ‡.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S8, secondary_skill: null, level_target: "M2", error_targets: ["B1"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 45, lesson_slot_fit: LessonSlot.CORE, feedback_text: "ÐÐ¸Ð¹Ñ‚Ð»ÑÐ³ Ð°Ð»Ð´Ð°Ð°Ð³ Ð·Ð°ÑÐ°Ñ…." },
  { id: "G24-016", task_type: TaskType.TT_2_3, prompt_text: "Ð—Ó©Ð² Ò¯Ð³Ð¸Ð¹Ð½ Ñ…ÑÐ»Ð±ÑÑ€Ð¸Ð¹Ð³ ÑÐ¾Ð½Ð³Ð¾.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S2, secondary_skill: SkillCode.S3, level_target: "M2", error_targets: ["B1", "C1"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 30, lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ò®Ð³+ÑÐ³ÑˆÐ³Ð¸Ð¹Ð½ Ð±Ð°Ñ‚Ð°Ñ‚Ð³Ð°Ð»." },
  { id: "G24-017", task_type: TaskType.TT_5_5, prompt_text: "Ð—Ð°Ð»Ð³Ð°Ð²Ñ€Ñ‹Ð³ Ð·Ó©Ð² Ð½Ó©Ñ…Ó©Ð¶ Ð±Ð¸Ñ‡.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S5, secondary_skill: null, level_target: "M2", error_targets: ["E7"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 45, lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ð¡Ð¾Ð½Ð³Ð¾ÑÐ¾Ð½ Ñ…ÑÐ»Ð±ÑÑ€ÑÑ Ð·Ó©Ð² Ð±Ð¸Ñ‡Ð¸Ñ…." },
  { id: "G24-018", task_type: TaskType.TT_6_3, prompt_text: "Ó¨Ð³Ò¯Ò¯Ð»Ð±ÑÑ€Ò¯Ò¯Ð´Ð¸Ð¹Ð³ Ð·Ó©Ð² ÑÐ°Ð»Ð³Ð°Ð¶ Ð±Ð¸Ñ‡.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S6, secondary_skill: null, level_target: "M2", error_targets: ["G5"], grade_band: ["G2", "G3", "G4"], difficulty: 3, estimated_time_seconds: 45, lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ó¨Ð³Ò¯Ò¯Ð»Ð±ÑÑ€ ÑÐ°Ð»Ð³Ð°Ñ…." },
  { id: "G24-019", task_type: TaskType.TT_7_6, prompt_text: "Ð‘Ð¾Ð³Ð¸Ð½Ð¾ ÑÑ…Ð¸Ð¹Ð³ ÑÐ¾Ð½ÑÐ¾Ð¾Ð´ Ð±Ð¸Ñ‡Ð½Ñ Ò¯Ò¯.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S7, secondary_skill: null, level_target: "M3", error_targets: ["H1", "B4"], grade_band: ["G2", "G3", "G4"], difficulty: 4, estimated_time_seconds: 120, lesson_slot_fit: LessonSlot.MIXED, feedback_text: "2â€“3 Ó©Ð³Ò¯Ò¯Ð»Ð±ÑÑ€Ñ‚ÑÐ¹ ÑÑ…." },
  { id: "G24-020", task_type: TaskType.TT_8_4, prompt_text: "Ó¨Ó©Ñ€Ð¸Ð¹Ð½ Ð±Ð¸Ñ‡Ð²ÑÑ€Ð¸Ð¹Ð³ ÑˆÐ°Ð»Ð³Ð°Ð¶ Ð·Ð°ÑÐ°Ð°Ñ€Ð°Ð¹.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S8, secondary_skill: null, level_target: "M3", error_targets: ["H4"], grade_band: ["G2", "G3", "G4"], difficulty: 4, estimated_time_seconds: 60, lesson_slot_fit: LessonSlot.END, feedback_text: "Ð”Ð°Ñ…Ð¸Ð½ ÑˆÐ°Ð»Ð³Ð°Ð»Ñ‚ Ð±Ð° self-correction." },
  { id: "G24-021", task_type: TaskType.TT_3_1, prompt_text: "Ð£Ñ€Ñ‚ ÑÐ³ÑˆÐ³Ð¸Ð¹Ð½ Ñ…ÑÐ»Ð±ÑÑ€Ð¸Ð¹Ð³ ÑÐ¾Ð½Ð³Ð¾.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S3, secondary_skill: null, level_target: "M3", error_targets: ["C1", "C2"], grade_band: ["G2", "G3", "G4"], difficulty: 4, estimated_time_seconds: 30, lesson_slot_fit: LessonSlot.CORE, feedback_text: "ÐÑ…Ð¸ÑÐ°Ð½ ÑÐ»Ð³Ð°Ð»Ñ‚." },
  { id: "G24-022", task_type: TaskType.TT_5_5, prompt_text: "ÐÐ¸Ð¹Ð»Ð¼ÑÐ» Ð·Ð°Ð»Ð³Ð°Ð²Ñ€Ñ‹Ð³ Ð·Ó©Ð² Ð½Ó©Ñ…Ó©Ð¶ Ð±Ð¸Ñ‡.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S5, secondary_skill: null, level_target: "M3", error_targets: ["E2", "E7"], grade_band: ["G2", "G3", "G4"], difficulty: 4, estimated_time_seconds: 45, lesson_slot_fit: LessonSlot.CORE, feedback_text: "ÐžÐ»Ð¾Ð½ Ð´Ò¯Ñ€ÑÐ¼ Ð´Ð°Ð²Ñ…Ñ†Ð°Ñ…." },
  { id: "G24-023", task_type: TaskType.TT_2_3, prompt_text: "Ð¥Ð¾Ð»Ð¸Ð¼Ð¾Ð³ Ñ…ÑÐ»Ð±ÑÑ€Ð¸Ð¹Ð½ Ð´Ð°Ð°Ð»Ð³Ð°Ð²Ñ€Ñ‹Ð³ Ð³Ò¯Ð¹Ñ†ÑÑ‚Ð³Ñ.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S2, secondary_skill: SkillCode.S5, level_target: "M2-M3", error_targets: ["Mixed"], grade_band: ["G2", "G3", "G4"], difficulty: 4, estimated_time_seconds: 30, lesson_slot_fit: LessonSlot.MIXED, feedback_text: "Ð”Ð¾Ð»Ð¾Ð¾ Ñ…Ð¾Ð½Ð¾Ð³Ð¸Ð¹Ð½ ÑˆÐ°Ð»Ð³Ð°Ð»Ñ‚." },
  { id: "G24-024", task_type: TaskType.TT_8_2, prompt_text: "ÐÐ»Ð´Ð°Ð°Ð½Ñ‹ ÑˆÐ°Ð»Ñ‚Ð³Ð°Ð°Ð½Ñ‹Ð³ Ñ‚Ð°Ð¹Ð»Ð±Ð°Ñ€Ð»Ð°Ð¶ Ð·Ð°ÑÐ°Ð°Ñ€Ð°Ð¹.", correct_answer: "PLACEHOLDER", options: {}, audio_url: null, image_url: null, primary_skill: SkillCode.S8, secondary_skill: null, level_target: "M3", error_targets: ["Mixed"], grade_band: ["G2", "G3", "G4"], difficulty: 4, estimated_time_seconds: 45, lesson_slot_fit: LessonSlot.CORE, feedback_text: "Ð¯Ð°Ð³Ð°Ð°Ð´ Ð±ÑƒÑ€ÑƒÑƒ Ð³ÑÐ´Ð³Ð¸Ð¹Ð³ Ñ…ÑÐ»ÑÑ…." },
];

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

// readyTasks G12-001 through G12-009 (including v2 variants) are the Phase A/B diagnostic pool.
const DIAGNOSTIC_TASK_IDS = new Set([
  "G12-001", "G12-001v2",
  "G12-002",
  "G12-003", "G12-003v2",
  "G12-004",
  "G12-005", "G12-005v2",
  "G12-006", "G12-006v2",
  "G12-007",
  "G12-008",
  "G12-009", "G12-009v2",
]);

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

  // â”€â”€ Hardcoded tasks (readyTasks + placeholderTasks) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let taskCreated = 0;
  let taskUpdated = 0;
  let taskErrored = 0;

  for (const t of [...readyTasks, ...placeholderTasks]) {
    const data = {
      task_type: t.task_type,
      prompt_text: t.prompt_text,
      correct_answer: t.correct_answer,
      options: t.options,
      audio_url: t.audio_url,
      image_url: t.image_url,
      primary_skill: t.primary_skill,
      secondary_skill: t.secondary_skill ?? undefined,
      level_target: t.level_target,
      error_targets: t.error_targets,
      grade_band: t.grade_band,
      difficulty: t.difficulty,
      estimated_time_seconds: t.estimated_time_seconds,
      lesson_slot_fit: t.lesson_slot_fit,
      feedback_text: t.feedback_text,
      is_diagnostic: DIAGNOSTIC_TASK_IDS.has(t.id),
    };
    try {
      if (isDryRun) {
        const exists = await prisma.task.findUnique({ where: { id: t.id } });
        console.log(`[DRY RUN] Task ${t.id}: ${exists ? "UPDATE" : "CREATE"}`);
        exists ? taskUpdated++ : taskCreated++;
      } else {
        const exists = await prisma.task.findUnique({ where: { id: t.id } });
        await prisma.task.upsert({ where: { id: t.id }, update: data, create: { id: t.id, ...data } });
        exists ? taskUpdated++ : taskCreated++;
      }
    } catch (e) {
      console.error(`  ERROR task ${t.id}:`, (e as Error).message);
      taskErrored++;
    }
  }

  // â”€â”€ Validated task variants from content-pipeline/validated/*.json â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const validatedVariants = loadValidatedTasks();
  const hardcodedTaskIds = new Set([...readyTasks, ...placeholderTasks].map((t) => t.id));

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


