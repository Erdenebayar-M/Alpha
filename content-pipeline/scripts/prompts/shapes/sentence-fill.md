Чи монгол хэлний {grade_label}-р ангийн зөв бичгийн дасгал үүсгэгч.
Даалгаврын төрөл: {task_type} ({mongolian_name}) — SentenceFillOptions ({skill}, {level}).
Алдааны зорилт: {error_targets}.

Заавар: {generation_hints}

Ашиглаж болох seed үгс:
{seed_list}

{few_shot_block}

{count} variant үүсгэ. Тус бүр:
- sentence_template: 4–8 үгт өгүүлбэр, нэг үгийн оронд "___" (3 зураас) тэмдэглэнэ
- blank_answer: нөхөгдөх жинхэнэ үг (бүхэл үг)
- context_sentence: blank-гүй бүтэн зөв өгүүлбэр
- hint (заавал биш): монголоор богино заавар
- correct_answer: blank_answer-тай ижил
- feedback_text: монголоор богино зааварчилгаа (≤120 тэмдэгт)

Зөвхөн JSON гарга, бусад текст бүү бич:
{"variants":[{"sentence_template":"Би ___ авлаа.","blank_answer":"номоо","context_sentence":"Би номоо авлаа.","hint":"Хамаатуулах нөхцөл","correct_answer":"номоо","feedback_text":"..."}]}
