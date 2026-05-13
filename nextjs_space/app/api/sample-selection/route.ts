import { NextRequest, NextResponse } from 'next/server';

// Generate all combinations of size k from array of indices [0..n-1]
function combinations(n: number, k: number): number[][] {
  const result: number[][] = [];
  const combo: number[] = [];

  function generate(start: number) {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < n; i++) {
      combo.push(i);
      generate(i + 1);
      combo.pop();
    }
  }

  generate(0);
  return result;
}

// Calculate standard deviation of an array
function stdDev(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1);
  return Math.sqrt(variance);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { samples, nSelect, propertyNames } = body;

    // samples: number[][] where samples[i][j] = value of property j for sample i
    const nSamples = samples.length;
    const nProperties = samples[0]?.length || 0;

    if (nSamples < 2 || nProperties < 1 || nSelect < 2 || nSelect > nSamples) {
      return NextResponse.json({
        success: false,
        error: 'Invalid parameters. Need at least 2 samples, 1 property, and nSelect between 2 and total samples.'
      }, { status: 400 });
    }

    // Safety check: too many combinations
    const maxCombinations = 200000;
    // Quick estimate using log to avoid overflow
    let logCombs = 0;
    for (let i = 0; i < nSelect; i++) {
      logCombs += Math.log(nSamples - i) - Math.log(i + 1);
    }
    if (Math.exp(logCombs) > maxCombinations) {
      return NextResponse.json({
        success: false,
        error: `Too many combinations (estimated ${Math.round(Math.exp(logCombs))}). Reduce number of samples or increase selection size. Max allowed: ${maxCombinations}.`
      }, { status: 400 });
    }

    // Generate all combinations
    const allCombinations = combinations(nSamples, nSelect);
    const totalCombinations = allCombinations.length;

    // For each property, calculate std dev for each combination and rank
    interface RankedCombo {
      comboIdx: number;
      combination: number[];
      stdDev: number;
      rank: number;
    }
    const rankings: RankedCombo[][] = [];

    for (let p = 0; p < nProperties; p++) {
      // Get std dev for each combination for this property
      const comboStdDevs = allCombinations.map((combo, idx) => {
        const values = combo.map(sampleIdx => samples[sampleIdx][p]);
        return {
          comboIdx: idx,
          combination: combo.map(i => i + 1), // 1-based
          stdDev: stdDev(values),
        };
      });

      // Sort by std dev (ascending = lowest std dev is best)
      comboStdDevs.sort((a, b) => a.stdDev - b.stdDev);

      // Assign ranks
      const ranked: RankedCombo[] = comboStdDevs.map((item, rank) => ({
        comboIdx: item.comboIdx,
        combination: item.combination,
        stdDev: item.stdDev,
        rank,
      }));

      rankings.push(ranked);
    }

    // Build lookup: for each property p, comboRank[p][comboIdx] = rank position
    const comboRank: number[][] = [];
    for (let p = 0; p < nProperties; p++) {
      const lookup: number[] = new Array(totalCombinations);
      for (const item of rankings[p]) {
        lookup[item.comboIdx] = item.rank;
      }
      comboRank.push(lookup);
    }

    // Find best compromise: combination that minimizes sum of rank positions
    let bestComboIdx = 0;
    let bestScore = Infinity;
    let bestWorstPosition = Infinity;

    for (let c = 0; c < totalCombinations; c++) {
      let totalScore = 0;
      let worstPos = 0;
      for (let p = 0; p < nProperties; p++) {
        totalScore += comboRank[p][c];
        worstPos = Math.max(worstPos, comboRank[p][c]);
      }
      // Primary: minimize sum of ranks. Tiebreak: minimize worst individual rank.
      if (totalScore < bestScore || (totalScore === bestScore && worstPos < bestWorstPosition)) {
        bestScore = totalScore;
        bestComboIdx = c;
        bestWorstPosition = worstPos;
      }
    }

    // Build result details for best combination
    const bestCombo = allCombinations[bestComboIdx];
    const positions: number[] = [];
    const stdDevs: number[] = [];

    for (let p = 0; p < nProperties; p++) {
      positions.push(comboRank[p][bestComboIdx]);
      const values = bestCombo.map(sampleIdx => samples[sampleIdx][p]);
      stdDevs.push(stdDev(values));
    }

    // Top 10 for each property (for display)
    const top10PerProperty = rankings.map(r => r.slice(0, 10));

    return NextResponse.json({
      success: true,
      results: {
        totalCombinations,
        rankings: top10PerProperty,
        bestCompromise: {
          samples: bestCombo.map(i => i + 1), // 1-based
          positions,
          stdDevs,
          totalScore: bestScore,
          worstPosition: bestWorstPosition,
        },
        propertyNames,
      }
    });

  } catch (error: any) {
    console.error('Sample selection error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}
