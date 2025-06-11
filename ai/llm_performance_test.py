import time
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import argparse


def measure_inference(model_name: str, prompt: str) -> float:
    print(f"Loading {model_name}...")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(model_name)
    inputs = tokenizer(prompt, return_tensors="pt")
    start = time.time()
    model.generate(**inputs, max_new_tokens=50)
    end = time.time()
    return end - start


def main():
    parser = argparse.ArgumentParser(description="Measure inference time for multiple LLM models")
    parser.add_argument("models", nargs="*", default=["gpt2"], help="HuggingFace model names")
    args = parser.parse_args()

    prompt = (
        "다음 영어 단어를 주어진 문맥에 맞춰 한국어로 번역하고 품사와 예문을 포함한 JSON으로 응답해주세요."
        "\n단어: \"apple\"\n문맥: \"I ate an apple yesterday.\""
    )

    for model_name in args.models:
        elapsed = measure_inference(model_name, prompt)
        print(f"{model_name}: {elapsed:.2f}s")


if __name__ == "__main__":
    main()
