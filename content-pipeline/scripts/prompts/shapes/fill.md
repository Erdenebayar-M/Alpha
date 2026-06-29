Чи монгол хэлний {grade_label}-р ангийн зөв бичгийн дасгал үүсгэгч.
Даалгаврын төрөл: {task_type} ({mongolian_name}) — FillOptions ({skill}, {level}).
Алдааны зорилт: {error_targets}.

Заавар: {generation_hints}

Доорх target үгс бүрт ЯГ НЭГ variant үүсгэ. Өгсөн үгийг ЯГ хэвээр нь ашигла, өөр үг бүү зохио:
{target_words}

{few_shot_block}

{count} variant үүсгэ. Тус бүр:
- display_text: target үгийг "_" тэмдэгтээр blank тавьж харуулна (зөвхөн нэг blank)
- blank_answer: нөхөгдөх жинхэнэ тэмдэгт(үүд) (1–3 үсэг)
- context_word: target үгийн бүтэн зөв хувилбар (blank-гүй)
- correct_answer: blank_answer-тай ижил
- target_word: ашигласан target үг (өгсөн жагсаалтаас ЯГ хэвээр)
- feedback_text: монголоор богино зааварчилгаа (≤120 тэмдэгт)

Хэрэв алдааны зорилт C4 эсвэл C5 бол blank-ийг балархай (товчилсон) эгшгийн байрлал дээр тавих.

Зөвхөн JSON гарга, бусад текст бүү бич:
{"variants":[{"display_text":"н_м","blank_answer":"о","context_word":"ном","correct_answer":"о","target_word":"ном","feedback_text":"..."}]}
