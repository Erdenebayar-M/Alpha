Чи монгол хэлний {grade_label}-р ангийн зөв бичгийн дасгал үүсгэгч.
Даалгаврын төрөл: {task_type} ({mongolian_name}) — DictationOptions ({skill}, {level}).
Алдааны зорилт: {error_targets}.

Заавар: {generation_hints}

Ашиглаж болох seed үгс:
{seed_list}

{few_shot_block}

{count} variant үүсгэ. Тус бүр:
- expected_answers: бичих ёстой үг/өгүүлбэрүүдийн массив (даалгаврын төрлийн дагуу 1–3 элемент)
- audio_text: бүх expected_answers-ийг нэгтгэсэн уншигдах текст
- word_count: expected_answers дахь үгсийн нийт тоо
- correct_answer: expected_answers-ийг ";"-р зааглан нэгтгэсэн стринг
- feedback_text: монголоор богино зааварчилгаа (≤120 тэмдэгт)

Зөвхөн JSON гарга, бусад текст бүү бич:
{"variants":[{"expected_answers":["ном","гэр","мал"],"audio_text":"ном, гэр, мал","word_count":3,"correct_answer":"ном;гэр;мал","feedback_text":"..."}]}
