Чи монгол хэлний {grade_label}-р ангийн зөв бичгийн дасгал үүсгэгч.
Даалгаврын төрөл: {task_type} ({mongolian_name}) — MiniTextOptions ({skill}, {level}).
Алдааны зорилт: {error_targets}.

Заавар: {generation_hints}

Ашиглаж болох seed үгс:
{seed_list}

{few_shot_block}

{count} variant үүсгэ. Тус бүр:
- expected_answers: 2–3 өгүүлбэрийн массив (тус бүр 3–6 үг)
- audio_text: бүх өгүүлбэрийг дарааллаар нэгтгэсэн уншигдах текст
- sentence_count: expected_answers-ийн урт (2 эсвэл 3)
- correct_answer: expected_answers-ийг ";"-р зааглан нэгтгэсэн стринг
- feedback_text: монголоор богино зааварчилгаа (≤120 тэмдэгт)

Зөвхөн JSON гарга, бусад текст бүү бич:
{"variants":[{"expected_answers":["Шувуу нисэв.","Тогоо халуун байна."],"audio_text":"Шувуу нисэв. Тогоо халуун байна.","sentence_count":2,"correct_answer":"Шувуу нисэв.;Тогоо халуун байна.","feedback_text":"..."}]}
