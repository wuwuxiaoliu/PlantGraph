import os
import requests

import json
import rdflib
import pandas as pd
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)
g = rdflib.Graph()
g.parse("final_merged_plants.ttl", format="ttl")

# 加载 name.csv 数据集 构建搜索框的数据
plant_names_df = pd.read_csv("name.csv")
plant_names = plant_names_df["name"].dropna().astype(str).tolist()


# 在植物图谱中不显示植物的特征信息
HIDDEN_PREDS = {"特征"}

def should_hide_pred(p):
    """
    在可视化知识图谱中隐藏节点
    """
    return extract_label(p) in HIDDEN_PREDS


def extract_label(value):
    """
    清洗标签保留主体名称
    """
    val = str(value)
    return val.split("#")[-1] if "#" in val else val.split("/")[-1]


def guess_type_and_color(pred):
    """
    根据不同的谓语为节点分派不同的颜色
    """
    if pred == "属于科":
        return "科", "#2196F3"
    elif pred == "属于属":
        return "属", "#3F51B5"
    elif pred == "拉丁学名":
        return "拉丁学名", "#9E9E9E"
    elif pred == "国内分布于":
        return "国内分布地", "#FF5722"
    elif pred == "国际分布于":
        return "国际分布地", "#FFC107"
    elif pred == "别名":
        return "别名", "#9C27B0"
    elif pred == "花期":
        return "花期", "#FF69B4"
    elif pred == "果期":
        return "果期", "#8BC34A"
    elif pred == "生境":
        return "生境", "#795548"
    elif pred == "治疗":
        return "药用价值", "#008B8B"
    else:
        return "未知", "#ccc"


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/query")
def query():
    """
        图谱查询接口：根据用户输入的关键词，查询与该植物实体相关的 RDF 三元组关系

        输入参数（GET）：
            植物名

        返回：
            JSON 格式图谱数据，包含：
                - nodes: 节点列表（每个节点包含 id、type、color）
                - links: 关系边列表（包含 source、target、label）

        限制：
            - 最多返回 100 条结果
            - 会过滤掉隐藏谓词（如“特征”）
    """
    # 输入去除空格并转小写
    keyword = request.args.get("q", "").strip().lower()
    if not keyword:
        return jsonify({"nodes": [], "links": []}) # 空关键词直接返回空图谱

    results = []
    node_info = {}
    count = 0
    MAX_RESULTS = 100  # 最多返回100条匹配关系

    for s, p, o in g:
        if should_hide_pred(p):  # 不显示特征
            continue

        s_label = extract_label(s).lower()
        if keyword == s_label:
            s_str, o_str = str(s), str(o)

            # 添加边信息
            results.append({
                "source": s_str,
                "target": o_str,
                "label": extract_label(p)
            })

            # 添加 source 信息
            if s_str not in node_info:
                node_info[s_str] = {"type": "植物", "color": "#4CAF50"}

            # 添加 target 信息
            if o_str not in node_info:
                node_type, node_color = guess_type_and_color(extract_label(p))
                node_info[o_str] = {"type": node_type, "color": node_color}

            # 超出上限后停止
            count += 1
            if count >= MAX_RESULTS:
                break
    # 用于前端图谱绘制的节点列表
    node_list = [{"id": nid, "type": v["type"], "color": v["color"]} for nid, v in node_info.items()]
    return jsonify({"nodes": node_list, "links": results})

@app.route("/details")
def details():
    """
    实体详情查询接口：根据植物名称查询其属性信息和相关实体节点

    输入参数（GET）：
        植物名

    返回：
        JSON 格式：
            - entity: 实体名
            - properties: 实体的 RDF 属性列表（最多返回20个）
            - node_info: 与该实体有关的其他节点及其类型、颜色信息（用于图谱展示）
    """
    # 去除前后空格
    name = request.args.get("name", "").strip()

    props = []                # 存储实体属性列表
    related_entities = set()  # 记录所有与该实体相关联的实体

    # 第一次遍历 收集该实体的属性与关联实体
    for s, p, o in g:
        if should_hide_pred(p):
            continue

        # 三元组主语是查询实体
        if str(s) == name:
            pred = extract_label(p)
            props.append({"predicate": pred, "object": str(o)})
            related_entities.add(str(o))  # 记录相关联的对象实体

        # 查询反向关系
        elif str(o) == name:
            pred = extract_label(p)
            props.append({"predicate": f"{pred}", "object": str(s)})
            related_entities.add(str(s))

    node_info = {}  # 存储所有相关节点的类型与颜色信息

    # 第二次遍历图谱，补全相关实体的可视化信息
    for s, p, o in g:
        if should_hide_pred(p):
            continue

        pred_label = extract_label(p)
        s_str = str(s)
        o_str = str(o)

        # 如果当前主语在相关实体中，补充其样式信息
        if s_str in related_entities and s_str not in node_info:
            node_info[s_str] = {"type": "植物", "color": "#4CAF50"}

        # 如果当前对象在相关实体中，补充其样式信息
        if o_str in related_entities and o_str not in node_info:
            o_type, o_color = guess_type_and_color(pred_label)
            node_info[o_str] = {"type": o_type, "color": o_color}

    # 返回 JSON 格式的实体名、属性列表、相关节点信息
    return jsonify({
        "entity": name,
        "properties": props[:20],  # 最多返回20条
        "node_info": node_info
    })

@app.route("/get_structured_info")
def get_structured_info():
    """
    获取结构化植物信息接口：获取ttl文件中的植物信息

    输入参数（GET）：
        植物名

    返回：
        JSON 格式：
            {
                "info": {
                    属性1: 值 或 [值1, 值2, ...],
                    属性2: 值,
                    ...
                }
            }
    """
    name = request.args.get("name", "").strip()  # 获取查询名称

    info = {}  # 存储结构化信息

    # 遍历图谱中三元组查找植物信息
    for s, p, o in g:
        if extract_label(s) == name:
            pred = extract_label(p)
            val = extract_label(o) if str(o).startswith("http") else str(o)

            if pred in info:
                if isinstance(info[pred], list):
                    info[pred].append(val)
                else:
                    info[pred] = [info[pred], val]
            else:
                info[pred] = val

    return jsonify({"info": info})


@app.route("/autocomplete")
def autocomplete():
    """
    自动补全接口：搜索框植物名称的联想与补全

    输入参数（GET）：
        q: 植物名

    返回：
        JSON 格式的名称数组（最多10条）：
            ["植物A", "植物B", ...]

    匹配规则：
        - 优先级高：以 query 开头的名称
        - 优先级低：包含 query 的名称
        - 返回前10条匹配结果
    """
    # 获取并预处理输入关键词：去除空格并小写化
    query = request.args.get("q", "").strip().lower()
    if not query:
        return jsonify([])  # 空输入直接返回空列表

    # 优先匹配以 query 开头的植物名
    startswith_matches = [
        name for name in plant_names if name.lower().startswith(query)
    ]

    # 其次匹配包含 query 的名称（排除已在 startswith 中的）
    contains_matches = [
        name for name in plant_names
        if query in name.lower() and not name.lower().startswith(query)
    ]

    # 合并结果列表，并截断为最多10条
    results = startswith_matches + contains_matches
    return jsonify(results[:10])

@app.route("/generate", methods=["POST"])
def generate():
    """
    文本生成接口（POST）：调用 DeepSeek 大模型，根据专业植物信息生成脚本

    输入（POST JSON）：
       植物信息
    返回：
        deepseek生成的专业植物脚本
    """
    DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "sk-f4cfa3d9ef8a4d68a3e103f98629beeb")
    DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
    DEEPSEEK_MODEL = "deepseek-chat"
    data = request.json
    plant_name = data.get("plant_name", "未知植物")
    info = data.get("info", {})
    addition = data.get("addition", "").strip()
    n = int(data.get("n", 1))

    # 构造提示词
    prompt = f"""
你是一个植物学专家，以下是植物「{plant_name}」的结构化知识信息，根据所提供的数据资料，撰写关于植物的文字介绍。请以自然流畅的方式组织语言，仅描述已有信息，不需要对缺失内容做出任何说明或标注。

【科】：{info.get("属于科", "未知")}
【属】：{info.get("属于属", "未知")}
【拉丁学名】：{info.get("拉丁学名", "未知")}
【别名】：{info.get("别名", "无")}
【花期】：{info.get("花期", "未知")}
【果期】：{info.get("果期", "未知")}
【国内分布地】：{info.get("国内分布于", "未知")}
【国际分布地】：{info.get("国际分布于", "未知")}
【生境】：{info.get("生境", "未知")}
【植物特征】：{info.get("特征", "未知")}
【治疗】：{info.get("治疗", "未知")}

【格式说明】
1. 以植物中文名和拉丁学名开始，格式为：植物中文名（XX科XX属，拉丁名），若植物存在别名，请以“又名××”的格式紧随其后；若无别名信息，请省略。
2. 花果期介绍：若花期信息存在，则输出句子“花期为××。” 若果期信息存在，则输出句子“果期为××。” 任一信息缺失或为“未知”时，请智能省略对应句子。
3. 分布情况：国内分布请以“在中国，分布于××等地”描述。若涉及多个省份，请按“省份+代表性地名”的方式归纳。国际分布表达为“亦见于××地区”。
4. 生境描述：若存在，则以“多生于××环境”总结；如为“未知”，请省略整段。
5. 分析适应性：可采用“××因其××特性，与××地区的××环境相适应”结构。

请生成 {n} 种不同风格或结构的文本（如无法实现，则生成完整描述即可）。

【补充要求】：{addition if addition else "无"}
"""
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": DEEPSEEK_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7
    }

    try:
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        result = response.json()
        output = result["choices"][0]["message"]["content"]
        return jsonify(output)
    except Exception as e:
        return jsonify(f"生成失败：{str(e)}"), 500


@app.route("/script_suggestions", methods=["POST"])
def script_suggestions():
    """
    脚本建议生成接口（POST）：调用 DeepSeek 生成脚本建议

    输入（POST JSON）：
        植物信息
    返回：
        脚本建议
    """
    DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "sk-f4cfa3d9ef8a4d68a3e103f98629beeb")
    DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
    DEEPSEEK_MODEL = "deepseek-chat"

    try:
        data = request.json
        plant_name = data.get("plant_name", "未知植物")
        info = data.get("info", {})
        platform = data.get("platform", "video")
        audience = data.get("audience", "大众")
        n = int(data.get("n", 1))

        # 提示词
        prompt = f"""
你是一位专业的植物学内容策划师。用户查询了植物「{plant_name}」的信息，需要为平台「{platform}」面向「{audience}」创作{n}套脚本建议。以下为植物结构化信息：


科：{info.get("属于科", "未知")}
属：{info.get("属于属", "未知")}
拉丁学名：{info.get("拉丁学名", "未知")}
别名：{info.get("别名", "无")}
花期：{info.get("花期", "未知")}
果期：{info.get("果期", "未知")}
国内分布：{info.get("国内分布于", "未知")}
国际分布：{info.get("国际分布于", "未知")}
生境：{info.get("生境", "未知")}
植物特征：{info.get("特征", "未知")}
治疗/药用：{info.get("治疗", "未知")}
"""

        headers = {
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": DEEPSEEK_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7
        }

        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload, timeout=60)
        print("DeepSeek响应状态码:", response.status_code)
        print("DeepSeek响应文本:", response.text[:500])  # 仅打印前500字符

        response.raise_for_status()
        result = response.json()
        output = result["choices"][0]["message"]["content"]

        return jsonify({"script_suggestions": output})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"script_suggestions": "", "error": f"脚本生成失败：{str(e)}"}), 500


# 在应用启动时加载植物列表 taxonomy_table.json
with open("taxonomy_table.json", "r", encoding="utf-8") as f:
    taxonomy_data = json.load(f)

@app.route("/taxonomy")
def taxonomy():
    """
    返回植物科-属-植物列表的分级结构
    """
    return jsonify(taxonomy_data)


if __name__ == "__main__":
    app.run(debug=True)