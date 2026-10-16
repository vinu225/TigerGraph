INPUT_PRICE_PER_1M = 0.35
OUTPUT_PRICE_PER_1M = 1.05

def calculate_cost(prompt_tokens: int, completion_tokens: int):

    input_cost = (prompt_tokens / 1_000_000) * INPUT_PRICE_PER_1M

    output_cost = (
        completion_tokens / 1_000_000
    ) * OUTPUT_PRICE_PER_1M

    total_cost = input_cost + output_cost

    return round(total_cost, 8)