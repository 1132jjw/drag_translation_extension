import time
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch


def main():
    model_name = "microsoft/phi-2"
    print("Loading model...")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(model_name)

    prompt = (
        "다음 영어 단어를 주어진 문맥에 맞춰 한국어로 번역하고 품사와 예문을 포함한 JSON으로 응답해주세요."
        "\n단어: \"apple\"\n문맥: \"I ate an apple yesterday.\""
    )
    inputs = tokenizer(prompt, return_tensors="pt")
    start = time.time()
    outputs = model.generate(**inputs, max_new_tokens=50)
    end = time.time()
    print("Inference time (s):", end - start)
    print(tokenizer.decode(outputs[0], skip_special_tokens=True))


if __name__ == "__main__":
    main()
