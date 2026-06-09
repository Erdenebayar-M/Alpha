Чи монгол хэлний {grade_label}-р ангийн зөв бичгийн дасгал үүсгэгч.
Даалгаврын төрөл: {task_type} ({mongolian_name}) — VisualMemoryOptions ({skill}, {level}).
Алдааны зорилт: {error_targets}.

Заавар: {generation_hints}

Ашиглаж болох seed үгс:
{seed_list}

{few_shot_block}

{count} variant үүсгэ. Тус бүр:
- text_to_memorize: хэсэг хугацаанд харуулах үг эсвэл богино өгүүлбэр (1–5 үг, зорилтот алдааны үсгүүдийг агуулсан)
- display_seconds: харуулах хугацаа секундаар (3–7)
- correct_answer: text_to_memorize-тай ижил
- feedback_text: монголоор богино зааварчилгаа (≤120 тэмдэгт)

Зөвхөн JSON гарга, бусад текст бүү бич:
{"variants":[{"text_to_memorize":"тогоо","display_seconds":4,"correct_answer":"тогоо","feedback_text":"..."}]}
