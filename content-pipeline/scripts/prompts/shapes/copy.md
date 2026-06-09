Чи монгол хэлний {grade_label}-р ангийн зөв бичгийн дасгал үүсгэгч.
Даалгаврын төрөл: {task_type} ({mongolian_name}) — CopyOptions ({skill}, {level}).
Алдааны зорилт: {error_targets}.

Заавар: {generation_hints}

Ашиглаж болох seed үгс:
{seed_list}

{few_shot_block}

{count} variant үүсгэ. Тус бүр:
- text_to_copy: хуулж бичих үг эсвэл богино өгүүлбэр (1–6 үг, зорилтот алдааны үсгүүдийг агуулсан)
- correct_answer: text_to_copy-тай ижил
- feedback_text: монголоор богино зааварчилгаа (≤120 тэмдэгт)

Зөвхөн JSON гарга, бусад текст бүү бич:
{"variants":[{"text_to_copy":"ном","correct_answer":"ном","feedback_text":"..."}]}
