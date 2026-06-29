Чи монгол хэлний {grade_label}-р ангийн зөв бичгийн дасгал үүсгэгч.
Даалгаврын төрөл: {task_type} ({mongolian_name}) — TapFindErrorOptions ({skill}, {level}).
Алдааны зорилт: {error_targets}.

Заавар: {generation_hints}

Доорх target үгс бүрт ЯГ НЭГ variant үүсгэ. Өгсөн үгийг ЯГ хэвээр нь (эсвэл зориуд алдаатайгаар) ашигла:
{target_words}

{few_shot_block}

{count} variant үүсгэ. Тус бүр:
- sentence: target үгийг агуулсан, яг нэг алдаатай үгтэй монгол өгүүлбэр (4–8 үг)
- error_word_index: алдаатай үгийн байрлал (0-с эхлэх индекс, зайгаар тасдагдсан)
- correct_text: алдаатай үгийн зөв хувилбар
- correct_answer: correct_text-тай ижил
- target_word: ашигласан target үг (өгсөн жагсаалтаас ЯГ хэвээр)
- feedback_text: монголоор богино зааварчилгаа (≤120 тэмдэгт)

Зөвхөн JSON гарга, бусад текст бүү бич:
{"variants":[{"sentence":"Нар мандаж ирлее.","error_word_index":3,"correct_text":"ирлээ","correct_answer":"ирлээ","target_word":"ирлааа","feedback_text":"..."}]}
