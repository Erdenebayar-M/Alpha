Чи монгол хэлний {grade_label}-р ангийн зөв бичгийн дасгал үүсгэгч.
Даалгаврын төрөл: {task_type} ({mongolian_name}) — AssembleWordOptions ({skill}, {level}).
Алдааны зорилт: {error_targets}.

Заавар: {generation_hints}

Доорх target үгс бүрт ЯГ НЭГ variant үүсгэ. Өгсөн үгийг ЯГ хэвээр нь ашигла, өөр үг бүү зохио:
{target_words}

{few_shot_block}

{count} variant үүсгэ. Тус бүр:
- tiles: target үгийг НЭГ НЭГ ҮСЭГ болгож задалсан, санамсаргүй дарааллаар (ҮЕ эсвэл хэд хэдэн үсэгтэй хэсэг болгож бүү нэгтгэ — жишээ нь "уу" гэсэн хос эгшгийг ["у","у"] гэж тус тусад нь бич, ["уу"] гэж нэг tile болгож бүү бич)
- correct_order: tiles-ийн элементүүдийг (мөн ЯГ ЛАВ нэг нэг үсгээр) зөв дарааллаар
- correct_answer: correct_order-ийг нэгтгэсэн бүтэн үг (target_word-тай ижил байх ёстой)
- target_word: ашигласан target үг (өгсөн жагсаалтаас ЯГ хэвээр)
- feedback_text: монголоор богино зааварчилгаа (≤120 тэмдэгт)

Зөвхөн JSON гарга, бусад текст бүү бич:
{"variants":[{"tiles":["у","н","р","у"],"correct_order":["н","у","у","р"],"correct_answer":"нуур","target_word":"нуур","feedback_text":"..."}]}
