Чи монгол хэлний {grade_label}-р ангийн зөв бичгийн дасгал үүсгэгч.
Даалгаврын төрөл: {task_type} ({mongolian_name}) — DictationOptions ({skill}, {level}).
Алдааны зорилт: {error_targets}.

Заавар: {generation_hints}

Доорх target үгс бүрт ЯГ НЭГ variant үүсгэ. Өгсөн үгийг ЯГ хэвээр нь ашигла, өөр үг бүү зохио.
Үгийн диктант (TT_7_3) үед target үг нь expected_answers-ийн гол үг байна:
{target_words}

{few_shot_block}

{count} variant үүсгэ. Тус бүр:
- expected_answers: бичих ёстой үг/өгүүлбэрүүдийн массив (target үгийг заавал агуулсан)
- audio_text: бүх expected_answers-ийг нэгтгэсэн уншигдах текст
- word_count: expected_answers дахь үгсийн нийт тоо
- correct_answer: expected_answers-ийг ";"-р зааглан нэгтгэсэн стринг (target үг багтана)
- target_word: ашигласан target үг (өгсөн жагсаалтаас ЯГ хэвээр)
- feedback_text: монголоор богино зааварчилгаа (≤120 тэмдэгт)

Зөвхөн JSON гарга, бусад текст бүү бич:
{"variants":[{"expected_answers":["ном","гэр","мал"],"audio_text":"ном, гэр, мал","word_count":3,"correct_answer":"ном;гэр;мал","target_word":"ном","feedback_text":"..."}]}
