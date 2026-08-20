// Vose's alias method. The simulation picks a scene cell for every photon it
// emits --- millions per exposure --- so that pick has to be O(1), and it has
// to stay O(1) when the light brush rewrites the weights mid-exposure.
import type { Rng } from "./rng.ts";

export interface AliasTable {
  readonly n: number;
  readonly prob: Float64Array;
  readonly alias: Int32Array;
  /** Sum of the weights the table was last built from. */
  total: number;
  /** Scratch space, kept on the table so a rebuild allocates nothing. */
  readonly scaled: Float64Array;
  readonly small: Int32Array;
  readonly large: Int32Array;
}

export function createAliasTable(n: number): AliasTable {
  return {
    n,
    prob: new Float64Array(n),
    alias: new Int32Array(n),
    total: 0,
    scaled: new Float64Array(n),
    small: new Int32Array(n),
    large: new Int32Array(n),
  };
}

/**
 * Rebuild `table` in place from `weights`. Reuses its buffers: this is called
 * on every light-brush move and, once cells start saturating, on every frame.
 */
export function fillAlias(table: AliasTable, weights: Float64Array): AliasTable {
  const { n, prob, alias, scaled, small, large } = table;
  prob.fill(0);
  alias.fill(0);

  let total = 0;
  for (let i = 0; i < n; i++) total += weights[i];
  table.total = total;

  // Nothing to sample from. Callers emit no photons in this case, but leave a
  // valid uniform table behind rather than a half-built one.
  if (total <= 0) {
    prob.fill(1);
    return table;
  }

  let nSmall = 0;
  let nLarge = 0;
  for (let i = 0; i < n; i++) {
    scaled[i] = (weights[i] * n) / total;
    if (scaled[i] < 1) small[nSmall++] = i;
    else large[nLarge++] = i;
  }

  while (nSmall > 0 && nLarge > 0) {
    const s = small[--nSmall];
    const l = large[--nLarge];
    prob[s] = scaled[s];
    alias[s] = l;
    scaled[l] -= 1 - scaled[s];
    if (scaled[l] < 1) small[nSmall++] = l;
    else large[nLarge++] = l;
  }
  // Whatever is left is 1 to within floating-point error.
  while (nLarge > 0) prob[large[--nLarge]] = 1;
  while (nSmall > 0) prob[small[--nSmall]] = 1;

  return table;
}

export function buildAlias(weights: Float64Array): AliasTable {
  return fillAlias(createAliasTable(weights.length), weights);
}

export function sampleAlias(table: AliasTable, rng: Rng): number {
  const i = (rng() * table.n) | 0;
  return rng() < table.prob[i] ? i : table.alias[i];
}
