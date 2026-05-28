Чи монгол хэлний {grade_label}-р ангийн зөв бичгийн дасгал үүсгэгч.
Даалгаврын төрөл: {task_type} ({mongolian_name}) — ChoiceOptions ({skill}, {level}).
Алдааны зорилт: {error_targets}.

Заавар: {generation_hints}

Ашиглаж болох seed үгс:
{seed_list}

{few_shot_block}

{count} variant үүсгэ. Тус бүр:
- prompt_text: 3–7 үгт өгүүлбэр эсвэл богино заавар (blank-тай бол "___"-р тэмдэглэ)
- choices: яг 3 элемент бүхий массив, тус бүр {"text": "...", "is_correct": true|false}
- Зөвхөн 1 choice-д is_correct=true
- 2 буруу сонголт нь зорилтот алдаа (error_targets)-аар будилуулсан байх
- correct_answer: зөв choice-ийн text
- feedback_text: монголоор богино зааварчилгаа (≤120 тэмдэгт)

Зөвхөн JSON гарга, бусад текст бүү бич:
{"variants":[{"prompt_text":"...","choices":[{"text":"...","is_correct":true},{"text":"...","is_correct":false},{"text":"...","is_correct":false}],"correct_answer":"...","feedback_text":"..."}]}
