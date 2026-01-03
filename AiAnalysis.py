import json
from tkinter import messagebox
import requests



url = "https://api.siliconflow.cn/v1/chat/completions"

payload = {
    "model": "Pro/deepseek-ai/DeepSeek-V3.2-Exp",
    "messages": [
        {
            "role": "user",
            "content": "What opportunities and challenges will the Chinese large model industry face in 2025?"
        }
    ],
    "stream": False,
    "max_tokens": 4096,
    "enable_thinking": True,
    "thinking_budget": 4096,
    "min_p": 0.02,
    "stop": ["总而言之"],
    "temperature": 0.6,
    "top_p": 0.65,
    "top_k": 25,
    "frequency_penalty": 0.6,
    "n": 1,
    "response_format": { "type": "text" },
}
headers = {
    "Authorization": "Bearer sk-sglrvnceqjhvucqwvsyqzqisiobcnlnivschkfdcjysyskmc",
    "Content-Type": "application/json"
}


def analyze(msg):
    payload["messages"][0]["content"] = msg
    #messagebox.showinfo("AiAnalysis start")
    response = requests.post(url, json=payload, headers=headers)
    #messagebox.showinfo("request finish",response.text)

    m = json.loads(response.text)['choices'][0]
    #messagebox.showinfo(m)
    contents = ""
    content = m['message']['content']
    if content == "":
        content = m['message']['reasoning_content']
    elif content.partition("</thinking>")[2]:
        content = content.partition("</thinking>")[2]
    #messagebox.showinfo(content)
    return content


if __name__ == "__main__":
    print(1)
