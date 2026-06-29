Чи монгол хэлний {grade_label}-р ангийн зөв бичгийн дасгал үүсгэгч.
Даалгаврын төрөл: {task_type} ({mongolian_name}) — AssembleWordOptions ({skill}, {level}).
Алдааны зорилт: {error_targets}.

Заавар: {generation_hints}

Доорх target үгс бүрт ЯГ НЭГ variant үүсгэ. Өгсөн үгийг ЯГ хэвээр нь ашигла, өөр үг бүү зохио:
{target_words}

{few_shot_block}

{count} variant үүсгэ. Тус бүр:
- tiles: target үгийн үсэг/үе/хэсгүүдийг санамсаргүй дарааллаар
- correct_order: tiles-ийн элементүүдийг зөв дарааллаар
- correct_answer: correct_order-ийг нэгтгэсэн бүтэн үг (target_word-тай ижил байх ёстой)
- target_word: ашигласан target үг (өгсөн жагсаалтаас ЯГ хэвээр)
- feedback_text: монголоор богино зааварчилгаа (≤120 тэмдэгт)

Зөвхөн JSON гарга, бусад текст бүү бич:
{"variants":[{"tiles":["б","а","т"],"correct_order":["б","а","т"],"correct_answer":"бат","target_word":"бат","feedback_text":"..."}]}
