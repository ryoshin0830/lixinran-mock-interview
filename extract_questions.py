import re
import json

def extract_questions_from_tex(tex_file_path):
    """TeXファイルから質問と回答を抽出してJSONに変換する"""
    with open(tex_file_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # セクション名を抽出
    section_pattern = r'\\section\{([^}]+)\}'
    sections = re.findall(section_pattern, content)
    
    # 現在のセクション位置を追跡するための変数
    current_section_index = 0
    section_positions = []
    
    for match in re.finditer(section_pattern, content):
        section_positions.append(match.start())
    
    section_positions.append(len(content))  # 最後のセクションの終わりを追加
    
    # 質問と回答を抽出
    questions = []
    question_pattern = r'\\question\{([^}]+)\}'
    answer_pattern = r'\\answer\{([^}]+)\}'
    
    for match in re.finditer(question_pattern, content):
        # 現在のセクションを特定
        while (current_section_index < len(section_positions) - 1 and 
               match.start() > section_positions[current_section_index + 1]):
            current_section_index += 1
        
        question_text = match.group(1)
        question_pos = match.end()
        
        # この質問のIDを抽出（質問の先頭に数字がある場合）
        id_match = re.match(r'^(\d+[a-zA-Z-]*)\.?\s+', question_text)
        question_id = id_match.group(1) if id_match else None
        
        # 質問のテキストから番号を削除
        if id_match:
            question_text = question_text[len(id_match.group(0)):].strip()
        
        # 回答を探す
        answer_match = re.search(answer_pattern, content[question_pos:])
        answer_text = answer_match.group(1) if answer_match else ""
        
        # 難易度を判定（単純な仮のロジック）
        if "双減政策" in question_text or "研究" in question_text or "データ" in question_text:
            difficulty = "難"
        elif "自己紹介" in question_text or "趣味" in question_text:
            difficulty = "易"
        else:
            difficulty = "中"
        
        question_obj = {
            "id": question_id if question_id else len(questions) + 1,
            "question": question_text,
            "answer": answer_text,
            "category": sections[current_section_index] if sections else "未分類",
            "difficulty": difficulty
        }
        
        questions.append(question_obj)
    
    return questions

def save_to_json(questions, output_file):
    """質問データをJSONファイルに保存"""
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)

def main():
    tex_file_path = "/Users/shin/Dropbox/collaborate/李欣然_梁/interview/content.tex"
    output_file = "/Users/shin/Dropbox/collaborate/李欣然_梁/interview/mock-interview/public/questions.json"
    
    questions = extract_questions_from_tex(tex_file_path)
    save_to_json(questions, output_file)
    
    print(f"抽出された質問数: {len(questions)}")
    print(f"データを保存しました: {output_file}")

if __name__ == "__main__":
    main()