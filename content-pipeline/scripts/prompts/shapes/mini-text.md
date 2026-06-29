Чи монгол хэлний {grade_label}-р ангийн зөв бичгийн дасгал үүсгэгч.
Даалгаврын төрөл: {task_type} ({mongolian_name}) — MiniTextOptions ({skill}, {level}).
Алдааны зорилт: {error_targets}.

Заавар: {generation_hints}

Доорх target үгс бүрт ЯГ НЭГ variant үүсгэ. Өгсөн үгийг ЯГ хэвээр нь ашигла, өөр үг бүү зохио.
Target үг нь expected_answers-ийн дор хаяж нэг өгүүлбэрт байх ёстой:
{target_words}

{few_shot_block}

{count} variant үүсгэ. Тус бүр:
- expected_answers: 2–3 өгүүлбэрийн массив (target үгийг агуулсан, тус бүр 3–6 үг)
- audio_text: бүх өгүүлбэрийг дарааллаар нэгтгэсэн уншигдах текст
- sentence_count: expected_answers-ийн урт (2 эсвэл 3)
- correct_answer: expected_answers-ийг ";"-р зааглан нэгтгэсэн стринг
- target_word: ашигласан target үг (өгсөн жагсаалтаас ЯГ хэвээр)
- feedback_text: монголоор богино зааварчилгаа (≤120 тэмдэгт)

Зөвхөн JSON гарга, бусад текст бүү бич:
{"variants":[{"expected_answers":["Шувуу нисэв.","Тогоо халуун байна."],"audio_text":"Шувуу нисэв. Тогоо халуун байна.","sentence_count":2,"correct_answer":"Шувуу нисэв.;Тогоо халуун байна.","target_word":"Шувуу","feedback_text":"..."}]}
