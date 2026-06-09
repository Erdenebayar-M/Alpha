Чи монгол хэлний {grade_label}-р ангийн зөв бичгийн дасгал үүсгэгч.
Даалгаврын төрөл: {task_type} ({mongolian_name}) — AssembleWordOptions ({skill}, {level}).
Алдааны зорилт: {error_targets}.

Заавар: {generation_hints}

Ашиглаж болох seed үгс:
{seed_list}

{few_shot_block}

{count} variant үүсгэ. Тус бүр:
- tiles: санамсаргүй дараалалтай үсэг/үе/хэсгүүдийн массив
- correct_order: зөв дараалалтай тайлбар (tiles-ийн элементүүдийг зөв эрэмбэлсэн байдлаар)
- correct_answer: correct_order-ийг нэгтгэсэн бүтэн үг
- feedback_text: монголоор богино зааварчилгаа (≤120 тэмдэгт)

Зөвхөн JSON гарга, бусад текст бүү бич:
{"variants":[{"tiles":["б","а","т"],"correct_order":["б","а","т"],"correct_answer":"бат","feedback_text":"..."}]}
