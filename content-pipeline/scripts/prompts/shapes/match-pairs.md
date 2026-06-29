Чи монгол хэлний {grade_label}-р ангийн зөв бичгийн дасгал үүсгэгч.
Даалгаврын төрөл: {task_type} ({mongolian_name}) — MatchPairsOptions ({skill}, {level}).
Алдааны зорилт: {error_targets}.

Заавар: {generation_hints}

Доорх target үгс бүрт ЯГ НЭГ variant үүсгэ. Өгсөн үгийг ЯГ хэвээр нь ашигла, өөр үг бүү зохио.
Нэг variant дотор target үгийг pairs-ийн нэг хэсэг болгон ашиглах ёстой:
{target_words}

{few_shot_block}

{count} variant үүсгэ. Тус бүр:
- pairs: 3–4 хосын массив, тус бүр {"left": "...", "right": "..."}
  (left = үсэг/үг/зурагны нэр, right = тохирох хос; нэг pair нь target үгтэй холбоотой байх)
- image_side: "none" (зураг ашиглахгүй бол), "left", эсвэл "right"
- correct_answer: pairs-ийн left утгуудыг ";"-р зааглан нэгтгэсэн стринг
- target_word: ашигласан target үг (өгсөн жагсаалтаас ЯГ хэвээр)
- feedback_text: монголоор богино зааварчилгаа (≤120 тэмдэгт)

Зөвхөн JSON гарга, бусад текст бүү бич:
{"variants":[{"pairs":[{"left":"н","right":"нар"},{"left":"м","right":"мод"},{"left":"г","right":"гэр"}],"image_side":"none","correct_answer":"н;м;г","target_word":"нар","feedback_text":"..."}]}
