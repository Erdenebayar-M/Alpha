Энэ shape (SelfCheckOptions) нь LLM-ээр үүсгэгддэггүй.

Generator нь stage1/ ба validated/ дотроос CorrectionOptions төрлийн task-уудыг авч,
тэдгээрийн incorrect_text-г original_attempt, correct_text-г model_answer болгож SelfCheck task үүсгэнэ.

Энэ файлыг ердөө placeholder болгож үлдээж байна — buildSelfCheck() кодыг үзнэ үү.
