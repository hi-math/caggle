#include <iostream>
#include <vector>


int knapsack01(const std::vector<int>& weights, const std::vector<int>& values, int capacity) {
    /*=============================================== TODO 2 ===============================================
    You are given n items, where each item has a weight and a value. You are also given a knapsack with a maximum capacity.
    Your task is to find the maximum value that can be obtained by selecting a subset of the items such that the total weight is less than or equal to the capacity of the knapsack.

    Constraints:
        1 <= n <= 1000
        1 <= weights[i], values[i] <= 1000
        1 <= capacity <= 1000

    =======================================================================================================*/
    int n = weights.size();

    std::vector<int> dp(capacity + 1, 0);

    for (int i = 0; i < n; ++i) {
        int curr_weight = weights[i];
        int curr_value = values[i];

        // 중복 선택을 막기 위해 capacity부터 역순으로 탐색합니다.
        // 역순으로 하면 현재 아이템(i번째)이 아직 반영되지 않은 이전 상태(i-1번째)의 값을 안전하게 쓸 수 있습니다.
        for (int w = capacity; w >= curr_weight; --w) {
            if (dp[w] < dp[w - curr_weight] + curr_value) {
                dp[w] = dp[w - curr_weight] + curr_value;
            }
        }
    }

    return dp[capacity];
}

int main() {
	std::ios::sync_with_stdio(false);
	std::cin.tie(nullptr);

    int n;
	if (!(std::cin >> n)) return 0;
    if (n < 0) return 0;

	std::vector<int> weights;
	std::vector<int> values;
	const size_t reserveCount = (n > 0) ? static_cast<size_t>(n) : static_cast<size_t>(0);
	weights.reserve(reserveCount);
	values.reserve(reserveCount);


    for (int i = 0; i < n; ++i) {
		int w; std::cin >> w;
        weights.push_back(w);
    }

    for (int i = 0; i < n; ++i) {
		int v; std::cin >> v;
        values.push_back(v);
    }

    int capacity;
	if (!(std::cin >> capacity)) return 0;
    if (capacity < 0) capacity = 0;

    const int best = knapsack01(weights, values, capacity);
	std::cout << best << std::endl;

    return 0;
}
