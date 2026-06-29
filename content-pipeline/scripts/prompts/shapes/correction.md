Чи монгол хэлний {grade_label}-р ангийн зөв бичгийн дасгал үүсгэгч.
Даалгаврын төрөл: {task_type} ({mongolian_name}) — CorrectionOptions ({skill}, {level}).
Алдааны зорилт: {error_targets}.

Заавар: {generation_hints}

Доорх target үгс бүрт ЯГ НЭГ variant үүсгэ. Өгсөн үгийг ЯГ хэвээр нь ашигла, өөр үг бүү зохио.
Target үг нь correct_text-д (засаж буй үг эсвэл өгүүлбэрт) заавал байх ёстой:
{target_words}

{few_shot_block}

{count} variant үүсгэ. Тус бүр:
- correct_text: зөв бичигдсэн үг эсвэл өгүүлбэр (target үгийг агуулсан)
- incorrect_text: яг нэг зорилтот алдаатай (error_targets-аас сонгох) хувилбар
- error_type: error_targets-ийн нэг код
- hint: монголоор богино заавар (хүүхэдтэй ярих хэллэг)
- explanation (заавал биш): алдааны учрыг тайлбарласан 1–2 өгүүлбэр
- correct_answer: correct_text-тай ижил
- target_word: ашигласан target үг (өгсөн жагсаалтаас ЯГ хэвээр)
- feedback_text: монголоор богино зааварчилгаа (≤120 тэмдэгт)

Зөвхөн JSON гарга, бусад текст бүү бич:
{"variants":[{"correct_text":"Нар мандлаа.","incorrect_text":"нар мандлаа","error_type":"G1","hint":"Өгүүлбэрийн эхэнд том үсэг","correct_answer":"Нар мандлаа.","target_word":"Нар","feedback_text":"..."}]}
